import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createPhaseSchema, updatePhaseSchema } from '../validators/pipeline.schema';
import { asyncHandler } from '../utils/asyncHandler';
import customFieldRoutes from './customField.routes';

const router = Router({ mergeParams: true });

router.post('/', requirePipelineRole('manager'), validateBody(createPhaseSchema), asyncHandler(PipelineController.createPhase));
router.patch('/:phaseId', requirePipelineRole('manager'), validateBody(updatePhaseSchema), asyncHandler(PipelineController.updatePhase));
router.delete('/:phaseId', requirePipelineRole('manager'), asyncHandler(PipelineController.deletePhase));

router.use('/:phaseId/fields', customFieldRoutes);

export default router;
