import { Router } from 'express';
import { EmailTemplateController } from '../controllers/emailTemplate.controller';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createEmailTemplateSchema, updateEmailTemplateSchema } from '../validators/emailTemplate.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

// Admin-only de propósito, mesmo critério de automation.routes.ts.
router.get('/', requireGlobalRole('admin'), asyncHandler(EmailTemplateController.list));
router.post(
  '/',
  requireGlobalRole('admin'),
  validateBody(createEmailTemplateSchema),
  asyncHandler(EmailTemplateController.create)
);
router.patch(
  '/:templateId',
  requireGlobalRole('admin'),
  validateBody(updateEmailTemplateSchema),
  asyncHandler(EmailTemplateController.update)
);
router.delete('/:templateId', requireGlobalRole('admin'), asyncHandler(EmailTemplateController.remove));

export default router;
