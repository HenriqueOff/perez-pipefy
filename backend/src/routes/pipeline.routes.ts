import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { addMemberSchema, createPipelineSchema, updatePipelineSchema } from '../validators/pipeline.schema';
import { asyncHandler } from '../utils/asyncHandler';
import phaseRoutes from './phase.routes';
import cardRoutes from './card.routes';
import labelRoutes from './label.routes';
import automationRoutes from './automation.routes';
import publicFormManageRoutes from './publicFormManage.routes';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(PipelineController.list));
router.post('/', validateBody(createPipelineSchema), asyncHandler(PipelineController.create));
router.get('/:pipelineId', requirePipelineRole('viewer'), asyncHandler(PipelineController.detail));
router.patch(
  '/:pipelineId',
  requirePipelineRole('manager'),
  validateBody(updatePipelineSchema),
  asyncHandler(PipelineController.update)
);

router.get('/:pipelineId/dashboard', requirePipelineRole('viewer'), asyncHandler(PipelineController.dashboard));

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
router.use('/:pipelineId/public-form', publicFormManageRoutes);

export default router;
