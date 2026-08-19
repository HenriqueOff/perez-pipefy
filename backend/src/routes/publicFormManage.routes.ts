import { Router } from 'express';
import { PublicFormController } from '../controllers/publicForm.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('manager'), asyncHandler(PublicFormController.manageInfo));
router.post('/enable', requirePipelineRole('manager'), asyncHandler(PublicFormController.enable));
router.post('/disable', requirePipelineRole('manager'), asyncHandler(PublicFormController.disable));
router.post('/regenerate', requirePipelineRole('manager'), asyncHandler(PublicFormController.regenerate));

export default router;
