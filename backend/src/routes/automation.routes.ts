import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createAutomationSchema, updateAutomationSchema } from '../validators/automation.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

// Admin-only de propósito: automações mexem em regras de negócio que afetam o pipeline
// inteiro (mover card, disparar e-mail, criar card em outro pipe...), então saíram do
// alcance de manager/owner e viraram, junto com campos customizados, decisão centralizada.
router.get('/', requireGlobalRole('admin'), asyncHandler(AutomationController.list));
router.post(
  '/',
  requireGlobalRole('admin'),
  validateBody(createAutomationSchema),
  asyncHandler(AutomationController.create)
);
router.patch(
  '/:automationId',
  requireGlobalRole('admin'),
  validateBody(updateAutomationSchema),
  asyncHandler(AutomationController.update)
);
router.delete('/:automationId', requireGlobalRole('admin'), asyncHandler(AutomationController.remove));

export default router;
