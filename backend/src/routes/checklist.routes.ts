import { Router } from 'express';
import { ChecklistItemController } from '../controllers/checklistItem.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createChecklistItemSchema, updateChecklistItemSchema } from '../validators/checklist.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(ChecklistItemController.list));
router.post(
  '/',
  requirePipelineRole('editor'),
  validateBody(createChecklistItemSchema),
  asyncHandler(ChecklistItemController.create)
);
router.patch(
  '/:itemId',
  requirePipelineRole('editor'),
  validateBody(updateChecklistItemSchema),
  asyncHandler(ChecklistItemController.update)
);
router.delete('/:itemId', requirePipelineRole('editor'), asyncHandler(ChecklistItemController.remove));

export default router;
