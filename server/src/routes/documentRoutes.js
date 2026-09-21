import express from 'express';
import { uploadDocument, getDocumentStatus, deleteDocument, reuploadDocument, serveDocumentFile } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/:appId/upload', protect, upload.single('file'), uploadDocument);
router.get('/:id/status', protect, getDocumentStatus);
router.get('/:id/file', serveDocumentFile);
router.delete('/:id', protect, deleteDocument);
router.post('/:id/reupload', protect, upload.single('file'), reuploadDocument);

export default router;

