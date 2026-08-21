import { Router } from 'express';
import { CardConnectionController } from '../controllers/cardConnection.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { attachCardConnectionSchema } from '../validators/cardConnection.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(CardConnectionController.list));
router.post(
  '/',
  requirePipelineRole('editor'),
  validateBody(attachCardConnectionSchema),
  asyncHandler(CardConnectionController.attach)
);
router.delete('/:cardConnectionId', requirePipelineRole('editor'), asyncHandler(CardConnectionController.detach));

export default router;
