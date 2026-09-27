import express from 'express';
import {
  createApplication,
  updateDraftApplication,
  submitApplication,
  getMyApplications,
  getApplicationById,
  getApplicationTimeline,
  deleteApplication
} from '../controllers/applicationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createApplication);
router.get('/mine', protect, getMyApplications);
router.get('/my', protect, getMyApplications);
router.get('/:id', protect, getApplicationById);
router.put('/:id', protect, updateDraftApplication);
router.post('/:id/submit', protect, submitApplication);
router.get('/:id/timeline', protect, getApplicationTimeline);
router.delete('/:id', protect, deleteApplication);

export default router;
