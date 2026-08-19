import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { importCardFromImoviewSchema, upsertImoviewConfigSchema } from '../validators/integration.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/imoview/config', requireGlobalRole('admin'), asyncHandler(IntegrationController.getImoviewConfig));
router.put(
  '/imoview/config',
  requireGlobalRole('admin'),
  validateBody(upsertImoviewConfigSchema),
  asyncHandler(IntegrationController.upsertImoviewConfig)
);
router.post(
  '/imoview/import-card',
  validateBody(importCardFromImoviewSchema),
  asyncHandler(IntegrationController.importCardFromImoview)
);

export default router;
