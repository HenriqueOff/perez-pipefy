import { Router } from 'express';
import { PublicFormController } from '../controllers/publicForm.controller';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

// Admin-only de propósito, mesmo critério de automation.routes.ts.
router.get('/', requireGlobalRole('admin'), asyncHandler(PublicFormController.manageInfo));
router.post('/enable', requireGlobalRole('admin'), asyncHandler(PublicFormController.enable));
router.post('/disable', requireGlobalRole('admin'), asyncHandler(PublicFormController.disable));
router.post('/regenerate', requireGlobalRole('admin'), asyncHandler(PublicFormController.regenerate));

export default router;
