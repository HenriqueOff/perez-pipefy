import { Router } from 'express';
import { PublicFormController } from '../controllers/publicForm.controller';
import { publicRateLimit } from '../middlewares/publicRateLimit';
import { validateBody } from '../middlewares/validate';
import { submitPublicFormSchema } from '../validators/publicForm.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/:token', asyncHandler(PublicFormController.publicSchema));
router.post(
  '/:token/submit',
  publicRateLimit,
  validateBody(submitPublicFormSchema),
  asyncHandler(PublicFormController.publicSubmit)
);

export default router;
