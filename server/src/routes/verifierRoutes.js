import express from 'express';
import { getVerifierQueue, documentDecision, raiseDeficiency, forwardApplicationToOfficer } from '../controllers/verifierController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.use(protect);

router.get('/queue', requireRole('verifier', 'admin'), getVerifierQueue);
router.post('/documents/:id/decision', requireRole('verifier'), documentDecision);
router.post('/applications/:id/deficiency', requireRole('verifier'), raiseDeficiency);
router.post('/applications/:id/forward-to-officer', requireRole('verifier'), forwardApplicationToOfficer);

export default router;
