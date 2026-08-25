import { Router } from 'express';
import { PipelineConnectionController } from '../controllers/pipelineConnection.controller';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createPipelineConnectionSchema } from '../validators/pipelineConnection.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

// Admin-only de propósito, mesmo critério de automation.routes.ts.
router.get('/', requireGlobalRole('admin'), asyncHandler(PipelineConnectionController.list));
router.post(
  '/',
  requireGlobalRole('admin'),
  validateBody(createPipelineConnectionSchema),
  asyncHandler(PipelineConnectionController.create)
);
router.delete('/:connectionId', requireGlobalRole('admin'), asyncHandler(PipelineConnectionController.remove));

export default router;
