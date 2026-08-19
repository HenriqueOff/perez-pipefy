import { Router } from 'express';
import { LabelController } from '../controllers/label.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createLabelSchema, updateLabelSchema } from '../validators/label.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(LabelController.list));
router.post('/', requirePipelineRole('manager'), validateBody(createLabelSchema), asyncHandler(LabelController.create));
router.patch(
  '/:labelId',
  requirePipelineRole('manager'),
  validateBody(updateLabelSchema),
  asyncHandler(LabelController.update)
);
router.delete('/:labelId', requirePipelineRole('manager'), asyncHandler(LabelController.remove));

export default router;
