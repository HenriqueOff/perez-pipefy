import { Router } from 'express';
import { PipelineConnectionController } from '../controllers/pipelineConnection.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createPipelineConnectionSchema } from '../validators/pipelineConnection.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(PipelineConnectionController.list));
router.post(
  '/',
  requirePipelineRole('manager'),
  validateBody(createPipelineConnectionSchema),
  asyncHandler(PipelineConnectionController.create)
);
router.delete('/:connectionId', requirePipelineRole('manager'), asyncHandler(PipelineConnectionController.remove));

export default router;
