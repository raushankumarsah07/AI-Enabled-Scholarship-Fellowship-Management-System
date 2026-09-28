import Disbursement from '../models/Disbursement.js';
import Application from '../models/Application.js';
import AuditLog from '../models/AuditLog.js';
import { sendNotification } from '../services/notificationService.js';

export const getMyDisbursements = async (req, res, next) => {
  try {
    const userApps = await Application.find({ applicantId: req.user._id });
    const appIds = userApps.map(a => a._id);

    const disbursements = await Disbursement.find({ applicationId: { $in: appIds } })
      .populate({
        path: 'applicationId',
        populate: { path: 'schemeId' }
      })
      .sort({ installmentNo: 1 });

    res.json({
      success: true,
      count: disbursements.length,
      disbursements
    });
  } catch (error) {
    next(error);
  }
};

// Who recommended this application for the merit list (the officer who may NOT release its payments)
const getRecommender = async (applicationId) => {
  const log = await AuditLog.findOne({ action: 'RECOMMEND_FOR_MERIT', entityId: String(applicationId) })
    .sort({ createdAt: -1 })
    .lean();
  return log ? { id: String(log.actorId), name: log.actorName } : null;
};

// Officers and admins: every installment, with who recommended the student
export const getAllDisbursements = async (req, res, next) => {
  try {
    let disbursements = await Disbursement.find({})
      .populate({
        path: 'applicationId',
        select: 'applicationNo status applicantId schemeId',
        populate: [
          { path: 'applicantId', select: 'name' },
          { path: 'schemeId', select: 'name code' }
        ]
      })
      .sort({ status: 1, dueDate: 1 })
      .lean();

    // Filter out and automatically clean up orphaned disbursements (missing application or applicant)
    const orphaned = disbursements.filter(d => !d.applicationId || !d.applicationId.applicantId);
    if (orphaned.length > 0) {
      const orphanIds = orphaned.map(d => d._id);
      setImmediate(async () => {
        try {
          await Disbursement.deleteMany({ _id: { $in: orphanIds } });
        } catch {}
      });
      disbursements = disbursements.filter(d => d.applicationId && d.applicationId.applicantId);
    }

    const cache = {};
    for (const d of disbursements) {
      const appId = d.applicationId?._id;
      if (!appId) continue;
      if (!(appId in cache)) cache[appId] = await getRecommender(appId);
      d.recommendedBy = cache[appId];
    }

    res.json({ success: true, count: disbursements.length, disbursements });
  } catch (error) {
    next(error);
  }
};

export const deleteDisbursement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Disbursement.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Disbursement not found.' });
    }

    await Disbursement.findByIdAndDelete(id);

    try {
      await AuditLog.create({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'DELETE_DISBURSEMENT',
        entityType: 'Disbursement',
        entityId: id,
        reason: 'Disbursement record deleted by admin/officer.',
        ip: req.ip || '127.0.0.1'
      });
    } catch {}

    res.json({ success: true, message: 'Disbursement payment milestone deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const uploadProgressReport = async (req, res, next) => {
  try {
    const { id } = req.params; // disbursementId

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a valid progress report file (PDF/JPG).' });
    }

    const disbursement = await Disbursement.findById(id).populate({
      path: 'applicationId',
      populate: { path: 'schemeId' }
    });

    if (!disbursement) {
      return res.status(404).json({ success: false, message: 'Disbursement milestone not found.' });
    }

    // Students can only upload reports for their own fellowship
    const ownerId = String(disbursement.applicationId?.applicantId || '');
    if (req.user.role === 'applicant' && ownerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only upload reports for your own fellowship.' });
    }
    if (disbursement.status === 'released') {
      return res.status(400).json({ success: false, message: 'This installment has already been released.' });
    }

    disbursement.progressReportPath = req.file.path;
    disbursement.guideApproved = true; // Mark certified by research guide
    await disbursement.save();

    res.json({
      success: true,
      message: 'Progress report and supervisor certification submitted successfully.',
      disbursement
    });
  } catch (error) {
    next(error);
  }
};

export const releaseDisbursement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks = 'Disbursement released via DBT PFMS', transactionId } = req.body;

    const disbursement = await Disbursement.findById(id).populate({
      path: 'applicationId',
      populate: { path: 'applicantId schemeId' }
    });

    if (!disbursement) {
      return res.status(404).json({ success: false, message: 'Disbursement not found.' });
    }

    const app = disbursement.applicationId;
    const n = disbursement.installmentNo;

    if (disbursement.status === 'released') {
      return res.status(400).json({ success: false, message: `Installment #${n} was already released.` });
    }
    if (!app || !['SELECTED', 'DISBURSING'].includes(app.status)) {
      return res.status(400).json({ success: false, message: 'Only selected applicants can receive fellowship payments.' });
    }

    // Two-person rule: the officer who recommended the student cannot also release the money
    const recommender = await getRecommender(app._id);
    if (recommender && recommender.id === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You recommended this application. Another officer must release the payment.'
      });
    }

    // Installment 2 onwards: previous one paid, and the guide-certified progress report uploaded
    if (n > 1) {
      const prev = await Disbursement.findOne({ applicationId: app._id, installmentNo: n - 1 });
      if (prev && prev.status !== 'released') {
        return res.status(400).json({ success: false, message: `Release installment #${n - 1} first.` });
      }
      if (!disbursement.progressReportPath) {
        return res.status(400).json({
          success: false,
          message: "Waiting for the student's progress report, certified by the research guide."
        });
      }
    }

    const txn = transactionId || `PFMS${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    disbursement.status = 'released';
    disbursement.releasedAt = new Date();
    disbursement.transactionId = txn;
    disbursement.remarks = remarks;
    await disbursement.save();

    // Schedule the next half-yearly installment (up to 10 = 5 years); it needs a progress report
    const nextExists = await Disbursement.findOne({ applicationId: app._id, installmentNo: n + 1 });
    if (!nextExists && n < 10) {
      const nextDue = new Date(disbursement.dueDate || Date.now());
      nextDue.setMonth(nextDue.getMonth() + 6);
      await Disbursement.create({
        applicationId: app._id,
        installmentNo: n + 1,
        amount: disbursement.amount,
        dueDate: nextDue,
        status: 'pending'
      });
    }

    if (app.status !== 'DISBURSING') {
      app.status = 'DISBURSING';
      app.stageHistory.push({
        stage: 'DISBURSING',
        by: req.user.name,
        remark: `Installment #${n} released. Ref: ${txn}`
      });
      await app.save();
    }

    // Audit Log
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'RELEASE_DISBURSEMENT',
      entityType: 'Disbursement',
      entityId: id,
      after: {
        amount: disbursement.amount,
        installmentNo: disbursement.installmentNo,
        transactionId: txn
      },
      reason: remarks,
      ip: req.ip || '127.0.0.1'
    });

    // Notify student
    if (app?.applicantId) {
      await sendNotification({
        userId: app.applicantId._id,
        type: 'DISBURSEMENT_RELEASED',
        templateKey: 'DISBURSEMENT_RELEASED',
        templateParams: {
          installmentNo: String(disbursement.installmentNo),
          amount: String(disbursement.amount)
        },
        subject: `Fellowship Installment #${disbursement.installmentNo} Released`,
        body: `MoTA Fellowship installment #${disbursement.installmentNo} of ₹${disbursement.amount.toLocaleString('en-IN')} has been transferred to your account. Transaction Ref: ${txn}.`,
        link: '/applicant/fellowship'
      });
    }

    res.json({
      success: true,
      message: `Installment #${disbursement.installmentNo} marked as released.`,
      disbursement
    });
  } catch (error) {
    next(error);
  }
};
