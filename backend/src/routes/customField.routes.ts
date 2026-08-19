import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createCustomFieldSchema, updateCustomFieldSchema } from '../validators/pipeline.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.post(
  '/',
  requirePipelineRole('manager'),
  validateBody(createCustomFieldSchema),
  asyncHandler(PipelineController.createCustomField)
);
router.patch(
  '/:fieldId',
  requirePipelineRole('manager'),
  validateBody(updateCustomFieldSchema),
  asyncHandler(PipelineController.updateCustomField)
);
router.delete('/:fieldId', requirePipelineRole('manager'), asyncHandler(PipelineController.deleteCustomField));

export default router;
