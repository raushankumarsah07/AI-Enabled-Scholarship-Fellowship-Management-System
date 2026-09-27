import Application from '../models/Application.js';
import Document from '../models/Document.js';
import Deficiency from '../models/Deficiency.js';
import VerificationLog from '../models/VerificationLog.js';
import AuditLog from '../models/AuditLog.js';
import { sendNotification } from '../services/notificationService.js';

// Stages from which an application may move to Officer Scrutiny
const FORWARDABLE_STATUSES = ['SUBMITTED', 'OCR_PROCESSING', 'AUTO_VERIFIED', 'UNDER_VERIFICATION', 'DEFICIENT'];

export const getVerifierQueue = async (req, res, next) => {
  try {
    const { schemeId, status, flagged, state, search } = req.query;

    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    } else {
      filter.status = { $in: ['UNDER_VERIFICATION', 'AUTO_VERIFIED', 'DEFICIENT', 'OCR_PROCESSING'] };
    }

    if (schemeId) {
      filter.schemeId = schemeId;
    }

    let applications = await Application.find(filter)
      .populate('schemeId')
      .populate('applicantId', '-passwordHash')
      .sort({ updatedAt: -1 });

    // Ensure orphaned applications (missing applicantId) are filtered out and cleaned up
    const orphanedApps = applications.filter(a => !a.applicantId);
    if (orphanedApps.length > 0) {
      const orphanIds = orphanedApps.map(a => a._id);
      setImmediate(async () => {
        try {
          await Document.deleteMany({ applicationId: { $in: orphanIds } });
          await Deficiency.deleteMany({ applicationId: { $in: orphanIds } });
          await VerificationLog.deleteMany({ applicationId: { $in: orphanIds } });
          await Application.deleteMany({ _id: { $in: orphanIds } });
        } catch {}
      });
      applications = applications.filter(a => a.applicantId);
    }

    // Filter by flagged items if requested
    if (flagged === 'true') {
      const appIds = applications.map(a => a._id);
      const flaggedDocs = await Document.find({
        applicationId: { $in: appIds },
        mismatches: { $exists: true, $ne: [] }
      });
      const flaggedAppIds = new Set(flaggedDocs.map(d => d.applicationId.toString()));
      applications = applications.filter(a => flaggedAppIds.has(a._id.toString()) || (a.flags && a.flags.length > 0));
    }

    // Filter by State if requested
    if (state) {
      applications = applications.filter(a => {
        const appState =
          a.applicantId?.profile?.state ||
          a.applicantId?.state ||
          a.formData?.state ||
          a.formData?.personalDetails?.state ||
          a.formData?.domicileState ||
          '';
        return appState.toLowerCase().trim() === state.toLowerCase().trim();
      });
    }

    // Search query filter (appNo or applicant name)
    if (search) {
      const q = search.toLowerCase();
      applications = applications.filter(a =>
        a.applicationNo.toLowerCase().includes(q) ||
        a.applicantId?.name.toLowerCase().includes(q) ||
        a.applicantId?.email.toLowerCase().includes(q)
      );
    }

    // Attach document summaries
    const appIds = applications.map(a => a._id);
    const allDocs = await Document.find({ applicationId: { $in: appIds } });

    const results = applications.map(app => {
      const appDocs = allDocs.filter(d => d.applicationId.toString() === app._id.toString());
      const hasFlags = appDocs.some(d => d.mismatches && d.mismatches.length > 0);
      const pendingCount = appDocs.filter(d => d.verificationStatus === 'needs_review').length;
      const approvedCount = appDocs.filter(d => d.verificationStatus === 'approved' || d.verificationStatus === 'auto_ok').length;

      return {
        ...app.toObject(),
        documentsSummary: {
          total: appDocs.length,
          approved: approvedCount,
          pending: pendingCount,
          hasFlags
        }
      };
    });

    res.json({
      success: true,
      count: results.length,
      queue: results
    });
  } catch (error) {
    next(error);
  }
};

export const documentDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, remark = '' } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'approved' or 'rejected'." });
    }

    const doc = await Document.findById(id).populate({
      path: 'applicationId',
      populate: { path: 'applicantId' }
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    doc.verificationStatus = decision;
    doc.officerRemark = remark;
    doc.verifiedBy = req.user._id;
    doc.verifiedAt = new Date();
    await doc.save();

    // Record Verification Log
    await VerificationLog.create({
      documentId: doc._id,
      applicationId: doc.applicationId._id,
      action: decision === 'approved' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      actorType: 'VERIFIER',
      actorId: req.user._id,
      actorName: req.user.name,
      details: {
        docKey: doc.docKey,
        remark,
        confidence: doc.confidence,
        mismatches: doc.mismatches
      }
    });

    // A human approved this document, so any open deficiency on it is settled
    if (decision === 'approved') {
      await Deficiency.updateMany(
        { applicationId: doc.applicationId._id, docKey: doc.docKey, status: 'open' },
        { $set: { status: 'resolved', resolvedAt: new Date() } }
      );
    }

    // Check application overall documents status and automatically advance to UNDER_SCRUTINY
    const allDocs = await Document.find({ applicationId: doc.applicationId._id });
    const allApproved = allDocs.length > 0 && allDocs.every(d => ['approved', 'auto_ok'].includes(d.verificationStatus));
    const openDeficiencies = await Deficiency.countDocuments({ applicationId: doc.applicationId._id, status: 'open' });

    const app = await Application.findById(doc.applicationId._id).populate('applicantId').populate('schemeId');
    if (app && allApproved && openDeficiencies === 0 && FORWARDABLE_STATUSES.includes(app.status)) {
      const prevStatus = app.status;
      app.status = 'UNDER_SCRUTINY';
      app.stageHistory.push({
        stage: 'UNDER_SCRUTINY',
        by: req.user.name,
        remark: `Document "${doc.docKey}" verified. All documents approved — Application automatically forwarded to Officer Scrutiny.`
      });
      await app.save();

      // Log Audit Trail
      await AuditLog.create({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'APPLICATION_FORWARDED_TO_OFFICER',
        entityType: 'Application',
        entityId: app._id,
        before: { status: prevStatus },
        after: { status: 'UNDER_SCRUTINY' },
        reason: 'All uploaded documents verified and approved by Verifier.',
        ip: req.ip || '127.0.0.1'
      });

      // Send Notification to applicant
      if (app.applicantId?._id) {
        await sendNotification({
          userId: app.applicantId._id,
          type: 'APPLICATION_UNDER_SCRUTINY',
          subject: `Document Verification Complete: Application ${app.applicationNo}`,
          body: `All documents for your application #${app.applicationNo} have been verified and approved. Your application has been moved to the Ministry Officer Scrutiny panel.`,
          link: `/applicant/applications/${app._id}`
        });
      }
    }

    res.json({
      success: true,
      message: `Document marked as ${decision}.`,
      document: doc,
      applicationStatus: app ? app.status : 'UNDER_VERIFICATION'
    });
  } catch (error) {
    next(error);
  }
};

export const forwardApplicationToOfficer = async (req, res, next) => {
  try {
    const { id } = req.params; // applicationId
    const { remarks = 'All documents verified and approved. Forwarded to Officer Scrutiny.' } = req.body;

    const app = await Application.findById(id).populate('applicantId').populate('schemeId');
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const allDocs = await Document.find({ applicationId: id });

    if (!FORWARDABLE_STATUSES.includes(app.status)) {
      return res.status(400).json({ success: false, message: `This application is already at stage ${app.status}.` });
    }

    if (!allDocs || allDocs.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents have been uploaded yet.' });
    }

    const rejectedDocs = allDocs.filter(d => d.verificationStatus === 'rejected');
    if (rejectedDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot forward: ${rejectedDocs.map(d => d.docKey).join(', ')} is rejected. Wait for the applicant to re-upload.`
      });
    }

    const openDefs = await Deficiency.find({ applicationId: id, status: 'open' });
    if (openDefs.length > 0) {
      const uniqueKeys = [...new Set(openDefs.map(d => d.docKey))].join(', ');
      return res.status(400).json({
        success: false,
        message: `Cannot forward: open deficiency on ${uniqueKeys}. Approve that document or wait for the applicant.`
      });
    }

    const unapprovedFlagged = allDocs.filter(d => d.verificationStatus !== 'approved' && d.mismatches && d.mismatches.length > 0);
    if (unapprovedFlagged.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Review flagged documents one by one first: ${unapprovedFlagged.map(d => d.docKey).join(', ')}.`
      });
    }

    const docsToApprove = allDocs.filter(d => ['needs_review', 'auto_ok'].includes(d.verificationStatus));
    const bulkApproved = docsToApprove.map(d => d.docKey);

    await Document.updateMany(
      { applicationId: id, verificationStatus: { $in: ['needs_review', 'auto_ok'] } },
      {
        $set: {
          verificationStatus: 'approved',
          verifiedBy: req.user._id,
          verifiedAt: new Date(),
          officerRemark: 'Approved during application verification.'
        }
      }
    );

    const prevStatus = app.status;
    app.status = 'UNDER_SCRUTINY';
    app.stageHistory.push({
      stage: 'UNDER_SCRUTINY',
      by: req.user.name,
      remark: remarks
    });
    await app.save();

    // Audit Log
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'VERIFIER_FORWARDED_TO_OFFICER',
      entityType: 'Application',
      entityId: id,
      before: { status: prevStatus },
      after: { status: 'UNDER_SCRUTINY', bulkApprovedDocs: bulkApproved },
      reason: remarks,
      ip: req.ip || '127.0.0.1'
    });

    // Send Notification to applicant
    if (app.applicantId?._id) {
      await sendNotification({
        userId: app.applicantId._id,
        type: 'APPLICATION_UNDER_SCRUTINY',
        subject: `Documents Verified: Application ${app.applicationNo}`,
        body: `Your application #${app.applicationNo} has been verified by the verification team and forwarded to the Ministry Scrutiny Officer.`,
        link: `/applicant/applications/${app._id}`
      });
    }

    res.json({
      success: true,
      message: 'Application verified and successfully forwarded to Ministry Officer Scrutiny.',
      application: app
    });
  } catch (error) {
    next(error);
  }
};

export const raiseDeficiency = async (req, res, next) => {
  try {
    const { id } = req.params; // applicationId
    const { docKey, reason, dueDays = 7 } = req.body;

    if (!docKey || !reason) {
      return res.status(400).json({ success: false, message: 'docKey and reason are required.' });
    }

    const application = await Application.findById(id).populate('applicantId');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(dueDays));

    const deficiency = await Deficiency.create({
      applicationId: id,
      docKey,
      reason,
      raisedBy: req.user.name,
      dueDate,
      status: 'open'
    });

    // Update document status
    const doc = await Document.findOne({ applicationId: id, docKey });
    if (doc) {
      doc.verificationStatus = 'rejected';
      doc.officerRemark = reason;
      await doc.save();
    }

    // Update Application stage
    application.status = 'DEFICIENT';
    application.stageHistory.push({
      stage: 'DEFICIENT',
      by: req.user.name,
      remark: `Deficiency raised for ${docKey}: ${reason}`
    });
    await application.save();

    // Audit Log
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'RAISE_DEFICIENCY',
      entityType: 'Application',
      entityId: id,
      reason: `Deficiency raised for ${docKey}: ${reason}`,
      ip: req.ip || '127.0.0.1'
    });

    // Send Notification
    await sendNotification({
      userId: application.applicantId._id,
      type: 'DEFICIENCY_RAISED',
      subject: `Action Required: Deficiency Notice for ${docKey}`,
      body: `Verifier ${req.user.name} has flagged your ${docKey}: "${reason}". Please upload a corrected document by ${dueDate.toLocaleDateString('en-IN')}.`,
      link: '/applicant/deficiencies'
    });

    res.status(201).json({
      success: true,
      message: 'Deficiency raised and notification dispatched to applicant.',
      deficiency
    });
  } catch (error) {
    next(error);
  }
};
