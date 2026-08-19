import { Router } from 'express';
import { CardController } from '../controllers/card.controller';
import { LabelController } from '../controllers/label.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import {
  assignCardSchema,
  createCardSchema,
  moveCardSchema,
  updateCardFieldsSchema,
  updateCardSchema,
} from '../validators/card.schema';
import { attachLabelSchema } from '../validators/label.schema';
import { asyncHandler } from '../utils/asyncHandler';
import commentRoutes from './comment.routes';
import attachmentRoutes from './attachment.routes';
import checklistRoutes from './checklist.routes';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(CardController.list));
router.post(
  '/',
  requirePipelineRole('editor'),
  validateBody(createCardSchema),
  asyncHandler(CardController.create)
);
router.get('/:cardId', requirePipelineRole('viewer'), asyncHandler(CardController.detail));
router.patch(
  '/:cardId',
  requirePipelineRole('editor'),
  validateBody(updateCardSchema),
  asyncHandler(CardController.update)
);
router.post(
  '/:cardId/move',
  requirePipelineRole('editor'),
  validateBody(moveCardSchema),
  asyncHandler(CardController.move)
);
router.patch(
  '/:cardId/fields',
  requirePipelineRole('editor'),
  validateBody(updateCardFieldsSchema),
  asyncHandler(CardController.updateFields)
);
router.delete('/:cardId', requirePipelineRole('manager'), asyncHandler(CardController.remove));

router.post(
  '/:cardId/assignees',
  requirePipelineRole('editor'),
  validateBody(assignCardSchema),
  asyncHandler(CardController.addAssignee)
);
router.delete('/:cardId/assignees/:userId', requirePipelineRole('editor'), asyncHandler(CardController.removeAssignee));

router.post(
  '/:cardId/labels',
  requirePipelineRole('editor'),
  validateBody(attachLabelSchema),
  asyncHandler(LabelController.attach)
);
router.delete('/:cardId/labels/:labelId', requirePipelineRole('editor'), asyncHandler(LabelController.detach));

router.use('/:cardId/comments', commentRoutes);
router.use('/:cardId/attachments', attachmentRoutes);
router.use('/:cardId/checklist', checklistRoutes);

export default router;
