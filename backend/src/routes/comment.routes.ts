import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createCommentSchema } from '../validators/card.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(CommentController.list));
router.post(
  '/',
  requirePipelineRole('editor'),
  validateBody(createCommentSchema),
  asyncHandler(CommentController.create)
);
router.delete('/:commentId', requirePipelineRole('editor'), asyncHandler(CommentController.remove));

export default router;
