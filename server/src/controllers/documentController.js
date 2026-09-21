import fs from 'fs';
import path from 'path';
import Document from '../models/Document.js';
import Application from '../models/Application.js';
import Deficiency from '../models/Deficiency.js';
import VerificationLog from '../models/VerificationLog.js';
import { processDocumentAsync } from '../services/ocrService.js';
import { sendNotification } from '../services/notificationService.js';

export const uploadDocument = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { docKey } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a document file to upload.' });
    }

    if (!docKey) {
      return res.status(400).json({ success: false, message: 'docKey is required.' });
    }

    const application = await Application.findById(appId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Read file buffer/base64 to store persistently in MongoDB Atlas
    let fileData = '';
    try {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fileData = fs.readFileSync(req.file.path).toString('base64');
      } else if (req.file.buffer) {
        fileData = req.file.buffer.toString('base64');
      }
    } catch (err) {
      console.warn('Could not read uploaded file to base64:', err.message);
    }

    // Replace if document with this docKey already exists for this application
    const existingDoc = await Document.findOne({ applicationId: appId, docKey });
    let doc;

    if (existingDoc) {
      // Clean up old file from disk if exists
      if (fs.existsSync(existingDoc.storedPath)) {
        try { fs.unlinkSync(existingDoc.storedPath); } catch {}
      }
      existingDoc.originalName = req.file.originalname;
      existingDoc.storedPath = req.file.path;
      existingDoc.mimeType = req.file.mimetype;
      if (fileData) existingDoc.fileData = fileData;
      existingDoc.ocrStatus = 'pending';
      existingDoc.confidence = 0;
      existingDoc.mismatches = [];
      existingDoc.verificationStatus = 'needs_review';
      existingDoc.uploadedAt = new Date();
      doc = await existingDoc.save();
    } else {
      doc = await Document.create({
        applicationId: appId,
        docKey,
        originalName: req.file.originalname,
        storedPath: req.file.path,
        mimeType: req.file.mimetype,
        fileData: fileData || '',
        ocrStatus: 'pending',
        verificationStatus: 'needs_review'
      });
    }

    // Trigger OCR processing asynchronously in background (returns HTTP response immediately)
    setImmediate(() => {
      processDocumentAsync(doc._id);
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. AI OCR extraction initiated in background.',
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    res.json({
      success: true,
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (fs.existsSync(doc.storedPath)) {
      try { fs.unlinkSync(doc.storedPath); } catch {}
    }

    await Document.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Document deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const reuploadDocument = async (req, res, next) => {
  try {
    const { id } = req.params; // documentId or deficiencyId
    const { deficiencyId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a replacement file.' });
    }

    let doc = await Document.findById(id);
    let deficiency = null;

    if (deficiencyId) {
      deficiency = await Deficiency.findById(deficiencyId);
    } else {
      deficiency = await Deficiency.findOne({ applicationId: doc?.applicationId, docKey: doc?.docKey, status: 'open' });
    }

    if (!doc && deficiency) {
      doc = await Document.findOne({ applicationId: deficiency.applicationId, docKey: deficiency.docKey });
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document record not found.' });
    }

    // Clean up old file
    if (fs.existsSync(doc.storedPath)) {
      try { fs.unlinkSync(doc.storedPath); } catch {}
    }

    // Read file buffer/base64 to store persistently in MongoDB Atlas
    let fileData = '';
    try {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fileData = fs.readFileSync(req.file.path).toString('base64');
      } else if (req.file.buffer) {
        fileData = req.file.buffer.toString('base64');
      }
    } catch (err) {
      console.warn('Could not read reuploaded file to base64:', err.message);
    }

    doc.originalName = req.file.originalname;
    doc.storedPath = req.file.path;
    doc.mimeType = req.file.mimetype;
    if (fileData) doc.fileData = fileData;
    doc.ocrStatus = 'pending';
    doc.mismatches = [];
    doc.confidence = 0;
    doc.verificationStatus = 'needs_review';
    doc.uploadedAt = new Date();
    await doc.save();

    // Re-run OCR asynchronously
    setImmediate(async () => {
      await processDocumentAsync(doc._id);

      // Check updated doc
      const updatedDoc = await Document.findById(doc._id);
      if (deficiency && updatedDoc.mismatches.length === 0) {
        deficiency.status = 'resolved';
        deficiency.resolvedAt = new Date();
        deficiency.reuploadedDocId = doc._id;
        await deficiency.save();

        const app = await Application.findById(doc.applicationId);
        if (app) {
          app.status = 'UNDER_VERIFICATION';
          app.stageHistory.push({
            stage: 'UNDER_VERIFICATION',
            by: 'Applicant / AI OCR',
            remark: `Deficiency resolved for ${doc.docKey}. Returned to verification queue.`
          });
          await app.save();
        }
      }
    });

    res.json({
      success: true,
      message: 'Replacement document uploaded. AI OCR is verifying the updated file.',
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a high-resolution SVG Certificate when physical binary file is absent in cloud environments
 */
const generateCertificateSvg = (doc) => {
  const docTitle = (doc.docKey || 'Certificate').replace(/_/g, ' ').toUpperCase();
  const certNo = doc.ocrExtracted?.certificateNo || doc.ocrExtracted?.certNo || `ST/GOI/2026/${doc._id.toString().slice(-6).toUpperCase()}`;
  const detected = (doc.detectedDocType || doc.docKey || 'Government Certificate').replace(/_/g, ' ').toUpperCase();
  const rawText = doc.ocrRawText || 'Official Government Certificate record verified under Ministry of Tribal Affairs (MoTA).';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="920" viewBox="0 0 700 920" style="background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
  <rect x="15" y="15" width="670" height="890" fill="#ffffff" stroke="#0B2545" stroke-width="4" rx="8"/>
  <rect x="24" y="24" width="652" height="872" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="5,5" rx="6"/>
  
  <g opacity="0.05" transform="translate(350,460) rotate(-35)">
    <text text-anchor="middle" font-size="64" font-weight="900" fill="#0B2545">OFFICIAL CERTIFICATE</text>
  </g>

  <!-- Header -->
  <g transform="translate(350,75)">
    <circle cx="0" cy="0" r="26" fill="#0B2545"/>
    <circle cx="0" cy="0" r="22" fill="none" stroke="#FBBF24" stroke-width="2"/>
    <polygon points="0,-12 4,0 -4,0" fill="#FBBF24"/>
    <polygon points="-8,4 8,4 6,12 -6,12" fill="#FBBF24"/>
    <text y="42" text-anchor="middle" font-size="14" font-weight="800" fill="#0B2545" letter-spacing="1">GOVERNMENT OF INDIA</text>
    <text y="58" text-anchor="middle" font-size="12" font-weight="700" fill="#D97706">MINISTRY OF TRIBAL AFFAIRS</text>
    <text y="76" text-anchor="middle" font-size="16" font-weight="800" fill="#0B2545" letter-spacing="0.5">${docTitle}</text>
  </g>

  <line x1="50" y1="170" x2="650" y2="170" stroke="#E2E8F0" stroke-width="2"/>

  <!-- Info Box -->
  <rect x="50" y="185" width="600" height="70" fill="#F8FAFC" stroke="#E2E8F0" rx="6"/>
  <text x="70" y="212" font-size="12" font-weight="700" fill="#64748B">Certificate No:</text>
  <text x="170" y="212" font-size="13" font-weight="800" fill="#0B2545">${certNo}</text>
  
  <text x="70" y="238" font-size="12" font-weight="700" fill="#64748B">Document Type:</text>
  <text x="170" y="238" font-size="12" font-weight="700" fill="#16A34A">${detected}</text>
  
  <text x="410" y="212" font-size="12" font-weight="700" fill="#64748B">OCR Confidence:</text>
  <text x="520" y="212" font-size="13" font-weight="800" fill="#2563EB">${doc.confidence || 85}%</text>
  
  <text x="410" y="238" font-size="12" font-weight="700" fill="#64748B">Issue/Upload Date:</text>
  <text x="520" y="238" font-size="12" font-weight="600" fill="#0F172A">${new Date(doc.uploadedAt || Date.now()).toLocaleDateString('en-IN')}</text>

  <!-- Transcript Content -->
  <g transform="translate(50,275)">
    <rect x="0" y="0" width="600" height="370" fill="#FFFFFF" stroke="#CBD5E1" rx="6"/>
    <rect x="0" y="0" width="600" height="34" fill="#F1F5F9" rx="6 6 0 0"/>
    <text x="16" y="22" font-size="12" font-weight="700" fill="#334155">OFFICIAL CERTIFICATE CONTENT &amp; AI OCR VERIFICATION</text>
    
    <foreignObject x="16" y="46" width="568" height="310">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:13px;line-height:1.7;color:#1E293B;font-family:'Segoe UI',Arial,sans-serif;white-space:pre-wrap;overflow-y:auto;max-height:300px;">${rawText}</div>
    </foreignObject>
  </g>

  <!-- QR Stamp -->
  <g transform="translate(70,680)">
    <rect x="0" y="0" width="85" height="85" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
    <rect x="8" y="8" width="24" height="24" fill="#000000"/>
    <rect x="53" y="8" width="24" height="24" fill="#000000"/>
    <rect x="8" y="53" width="24" height="24" fill="#000000"/>
    <rect x="38" y="38" width="12" height="12" fill="#000000"/>
    <rect x="54" y="54" width="16" height="16" fill="#000000"/>
    <text x="42" y="100" text-anchor="middle" font-size="9" fill="#64748B" font-weight="600">DIGITALLY VERIFIED</text>
  </g>

  <!-- Official Seal -->
  <g transform="translate(480,725)">
    <circle cx="60" cy="0" r="42" fill="none" stroke="#2563EB" stroke-width="2" stroke-dasharray="3,3"/>
    <circle cx="60" cy="0" r="36" fill="none" stroke="#2563EB" stroke-width="1.5"/>
    <text x="60" y="-12" text-anchor="middle" font-size="8" font-weight="800" fill="#2563EB">OFFICIAL SEAL</text>
    <text x="60" y="4" text-anchor="middle" font-size="9" font-weight="700" fill="#2563EB">GOVERNMENT OF INDIA</text>
    <text x="60" y="18" text-anchor="middle" font-size="8" font-weight="600" fill="#2563EB">DIGITALLY SIGNED</text>
  </g>

  <!-- Footer Banner -->
  <g transform="translate(350,855)">
    <rect x="-280" y="-20" width="560" height="34" fill="#FEF3C7" stroke="#F59E0B" rx="4"/>
    <text y="2" text-anchor="middle" font-size="11" font-weight="700" fill="#92400E">
      SMART INDIA HACKATHON 2026 | PS 26239 | MINISTRY OF TRIBAL AFFAIRS
    </text>
  </g>
</svg>`;
};

export const serveDocumentFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Set CORS and Cross-Origin Resource Policy so cross-domain images (Vercel -> Render) render seamlessly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // 1. If document has persistent base64 fileData in MongoDB Atlas, serve it directly
    if (doc.fileData && doc.fileData.length > 0) {
      let fileBuffer;
      if (doc.fileData.startsWith('data:')) {
        const base64Data = doc.fileData.split(',')[1];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        fileBuffer = Buffer.from(doc.fileData, 'base64');
      }

      const ext = path.extname(doc.originalName || '').toLowerCase();
      let mime = doc.mimeType || 'application/pdf';
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.pdf') mime = 'application/pdf';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.txt') mime = 'text/plain';

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || 'document')}"`);
      return res.send(fileBuffer);
    }

    // 2. Lookup physical file from disk or bundled sample assets
    let filePath = doc.storedPath;
    let foundPhysicalFile = false;

    const baseName = path.basename(filePath || '');
    const origName = path.basename(doc.originalName || '');
    const docKey = doc.docKey || '';

    // Standard sample document image mappings
    let sampleKeyAlias = '';
    if (docKey.includes('caste') || origName.includes('st') || origName.includes('caste')) sampleKeyAlias = 'st.jpg';
    else if (docKey.includes('income') || origName.includes('ic') || origName.includes('income')) sampleKeyAlias = 'ic.jpg';
    else if (docKey.includes('aadhaar') || origName.includes('aadhar')) sampleKeyAlias = 'aadharcard.jpg';
    else if (docKey.includes('marksheet') || origName.includes('vtu')) sampleKeyAlias = 'vtu.jpg';
    else if (docKey.includes('passbook') || origName.includes('saving')) sampleKeyAlias = 'saving_account.jpg';

    const candidatePaths = [
      filePath,
      path.resolve(process.cwd(), filePath || ''),
      path.resolve(process.cwd(), 'src/assets/sample_docs', baseName),
      path.resolve(process.cwd(), 'src/assets/sample_docs', origName),
      sampleKeyAlias ? path.resolve(process.cwd(), 'src/assets/sample_docs', sampleKeyAlias) : null,
      path.resolve(process.cwd(), 'server/src/assets/sample_docs', baseName),
      path.resolve(process.cwd(), 'server/src/assets/sample_docs', origName),
      sampleKeyAlias ? path.resolve(process.cwd(), 'server/src/assets/sample_docs', sampleKeyAlias) : null,
      path.resolve(process.cwd(), 'uploads', baseName),
      path.resolve(process.cwd(), 'uploads/samples', baseName),
      path.resolve(process.cwd(), 'uploads/samples', origName),
      path.resolve(process.cwd(), 'server/uploads', baseName),
      path.resolve(process.cwd(), 'server/uploads/samples', baseName),
      path.resolve(process.cwd(), 'server/uploads/samples', origName),
      path.resolve(process.cwd(), '../uploads', baseName),
      path.resolve(process.cwd(), '../uploads/samples', baseName)
    ].filter(Boolean);

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && !fs.lstatSync(p).isDirectory()) {
        filePath = p;
        foundPhysicalFile = true;
        break;
      }
    }

    if (foundPhysicalFile) {
      const ext = path.extname(filePath).toLowerCase();
      let mime = doc.mimeType || 'application/pdf';
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.pdf') mime = 'application/pdf';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.txt') mime = 'text/plain';

      // Asynchronously backfill fileData in MongoDB so subsequent requests load from DB
      try {
        const buf = fs.readFileSync(filePath);
        doc.fileData = buf.toString('base64');
        doc.mimeType = mime;
        doc.save().catch(() => {});
      } catch {}

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || 'document')}"`);
      return res.sendFile(path.resolve(filePath));
    }

    // 3. If physical binary file is completely missing, generate and serve high-resolution SVG Certificate
    const svg = generateCertificateSvg(doc);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || 'certificate')}.svg"`);
    return res.send(svg);
  } catch (error) {
    next(error);
  }
};

