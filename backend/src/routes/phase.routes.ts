import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createPhaseSchema, setPhaseManualCardCreationSchema, updatePhaseSchema } from '../validators/pipeline.schema';
import { asyncHandler } from '../utils/asyncHandler';
import customFieldRoutes from './customField.routes';

const router = Router({ mergeParams: true });

router.post('/', requirePipelineRole('manager'), validateBody(createPhaseSchema), asyncHandler(PipelineController.createPhase));
router.patch('/:phaseId', requirePipelineRole('manager'), validateBody(updatePhaseSchema), asyncHandler(PipelineController.updatePhase));
// Admin-only (não basta ser manager/owner do pipeline): controla se o botão "+ Novo card"
// fica clicável nessa fase, já que criar card manualmente ali pode quebrar automações que
// dependem de só entrar card na fase por um fluxo específico.
router.patch(
  '/:phaseId/manual-card-creation',
  requireGlobalRole('admin'),
  validateBody(setPhaseManualCardCreationSchema),
  asyncHandler(PipelineController.setPhaseManualCardCreation)
);
router.delete('/:phaseId', requirePipelineRole('manager'), asyncHandler(PipelineController.deletePhase));

router.use('/:phaseId/fields', customFieldRoutes);

export default router;
