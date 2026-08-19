import { Router } from 'express';
import { AttachmentController } from '../controllers/attachment.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { upload } from '../middlewares/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(AttachmentController.list));
router.get(
  '/:attachmentId/download',
  requirePipelineRole('viewer'),
  asyncHandler(AttachmentController.download)
);
router.post(
  '/',
  requirePipelineRole('editor'),
  upload.single('file'),
  asyncHandler(AttachmentController.create)
);
router.delete('/:attachmentId', requirePipelineRole('editor'), asyncHandler(AttachmentController.remove));

export default router;
