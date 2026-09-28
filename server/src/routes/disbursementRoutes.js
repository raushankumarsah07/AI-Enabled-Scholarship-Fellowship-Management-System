import express from 'express';
import { getMyDisbursements, getAllDisbursements, uploadProgressReport, releaseDisbursement, deleteDisbursement } from '../controllers/disbursementController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/', requireRole('officer', 'admin'), getAllDisbursements);
router.get('/mine', getMyDisbursements);
router.post('/:id/report', upload.single('file'), uploadProgressReport);
// Only officers release money (admins can only view), and never the officer who recommended the student
router.post('/:id/release', requireRole('officer'), releaseDisbursement);
router.delete('/:id', requireRole('officer', 'admin'), deleteDisbursement);

export default router;
