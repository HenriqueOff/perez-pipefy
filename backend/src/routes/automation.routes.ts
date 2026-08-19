import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createAutomationSchema, updateAutomationSchema } from '../validators/automation.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(AutomationController.list));
router.post(
  '/',
  requirePipelineRole('manager'),
  validateBody(createAutomationSchema),
  asyncHandler(AutomationController.create)
);
router.patch(
  '/:automationId',
  requirePipelineRole('manager'),
  validateBody(updateAutomationSchema),
  asyncHandler(AutomationController.update)
);
router.delete('/:automationId', requirePipelineRole('manager'), asyncHandler(AutomationController.remove));

export default router;
