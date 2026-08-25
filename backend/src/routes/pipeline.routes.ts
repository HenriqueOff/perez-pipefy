import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { addMemberSchema, createPipelineSchema, updatePipelineSchema } from '../validators/pipeline.schema';
import { asyncHandler } from '../utils/asyncHandler';
import phaseRoutes from './phase.routes';
import cardRoutes from './card.routes';
import labelRoutes from './label.routes';
import automationRoutes from './automation.routes';
import emailTemplateRoutes from './emailTemplate.routes';
import pipelineConnectionRoutes from './pipelineConnection.routes';
import publicFormManageRoutes from './publicFormManage.routes';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(PipelineController.list));
router.get('/overview', asyncHandler(PipelineController.overview));
// Precisa vir antes de "/:pipelineId" pra não ser interpretado como um id de pipeline.
// Admin-only: aba "Atividade recente" na home, mostra o log do sistema inteiro, sem
// filtrar pelas pipelines em que o admin está inserido.
router.get('/system-activity', requireGlobalRole('admin'), asyncHandler(PipelineController.systemActivity));
router.post('/', validateBody(createPipelineSchema), asyncHandler(PipelineController.create));
router.get('/:pipelineId', requirePipelineRole('viewer'), asyncHandler(PipelineController.detail));
router.patch(
  '/:pipelineId',
  requirePipelineRole('manager'),
  validateBody(updatePipelineSchema),
  asyncHandler(PipelineController.update)
);

router.get('/:pipelineId/dashboard', requirePipelineRole('viewer'), asyncHandler(PipelineController.dashboard));

// Painel da engrenagem no board — admin geral, não basta ser owner/manager do pipeline
// (mesmo critério já usado pelo toggle de criação manual de card em phase.routes.ts).
router.get('/:pipelineId/audit-log', requireGlobalRole('admin'), asyncHandler(PipelineController.auditLog));
router.get('/:pipelineId/admin-info', requireGlobalRole('admin'), asyncHandler(PipelineController.adminInfo));

router.get('/:pipelineId/members', requirePipelineRole('viewer'), asyncHandler(PipelineController.listMembers));
router.post(
  '/:pipelineId/members',
  requirePipelineRole('manager'),
  validateBody(addMemberSchema),
  asyncHandler(PipelineController.addMember)
);
router.delete('/:pipelineId/members/:userId', requirePipelineRole('manager'), asyncHandler(PipelineController.removeMember));

router.use('/:pipelineId/phases', phaseRoutes);
router.use('/:pipelineId/cards', cardRoutes);
router.use('/:pipelineId/labels', labelRoutes);
router.use('/:pipelineId/automations', automationRoutes);
router.use('/:pipelineId/email-templates', emailTemplateRoutes);
router.use('/:pipelineId/connections', pipelineConnectionRoutes);
router.use('/:pipelineId/public-form', publicFormManageRoutes);

export default router;
