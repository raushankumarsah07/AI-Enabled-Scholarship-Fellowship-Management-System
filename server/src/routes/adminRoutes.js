import express from 'express';
import {
  getMeritList,
  overrideApplicationStatus,
  getAnomalies,
  getAuditLogs,
  getUsers,
  updateUserRole
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.use(protect);
router.get('/merit/:schemeId', requireRole('admin', 'officer'), getMeritList);
router.use(requireRole('admin'));
router.post('/applications/:id/override', overrideApplicationStatus);
router.get('/anomalies', getAnomalies);
router.get('/audit', getAuditLogs);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);

export default router;
