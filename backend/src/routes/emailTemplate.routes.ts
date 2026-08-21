import { Router } from 'express';
import { EmailTemplateController } from '../controllers/emailTemplate.controller';
import { requirePipelineRole } from '../middlewares/requirePipelineRole';
import { validateBody } from '../middlewares/validate';
import { createEmailTemplateSchema, updateEmailTemplateSchema } from '../validators/emailTemplate.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

router.get('/', requirePipelineRole('viewer'), asyncHandler(EmailTemplateController.list));
router.post(
  '/',
  requirePipelineRole('manager'),
  validateBody(createEmailTemplateSchema),
  asyncHandler(EmailTemplateController.create)
);
router.patch(
  '/:templateId',
  requirePipelineRole('manager'),
  validateBody(updateEmailTemplateSchema),
  asyncHandler(EmailTemplateController.update)
);
router.delete('/:templateId', requirePipelineRole('manager'), asyncHandler(EmailTemplateController.remove));

export default router;
