import { Router } from 'express';
import { ContractTemplateController } from '../controllers/contractTemplate.controller';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createContractTemplateSchema, updateContractTemplateSchema } from '../validators/contractTemplate.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

// Admin-only de propósito, mesmo critério de emailTemplate.routes.ts.
router.get('/', requireGlobalRole('admin'), asyncHandler(ContractTemplateController.list));
router.post(
  '/',
  requireGlobalRole('admin'),
  validateBody(createContractTemplateSchema),
  asyncHandler(ContractTemplateController.create)
);
router.patch(
  '/:templateId',
  requireGlobalRole('admin'),
  validateBody(updateContractTemplateSchema),
  asyncHandler(ContractTemplateController.update)
);
router.delete('/:templateId', requireGlobalRole('admin'), asyncHandler(ContractTemplateController.remove));

export default router;
