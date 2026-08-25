import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createCustomFieldSchema, updateCustomFieldSchema } from '../validators/pipeline.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router({ mergeParams: true });

// Admin-only de propósito: managers/owners de pipeline continuam podendo gerenciar tudo
// mais (fases, membros, automações), mas criar/editar/excluir campo customizado agora é
// exclusivo de admin geral — pedido explícito, já que campos definem que dado cada card
// carrega, e isso passou a ser tratado como decisão centralizada, não por pipe.
router.post(
  '/',
  requireGlobalRole('admin'),
  validateBody(createCustomFieldSchema),
  asyncHandler(PipelineController.createCustomField)
);
router.patch(
  '/:fieldId',
  requireGlobalRole('admin'),
  validateBody(updateCustomFieldSchema),
  asyncHandler(PipelineController.updateCustomField)
);
router.delete('/:fieldId', requireGlobalRole('admin'), asyncHandler(PipelineController.deleteCustomField));

export default router;
