import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validateBody } from '../middlewares/validate';
import { changePasswordSchema, loginSchema } from '../validators/auth.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', validateBody(loginSchema), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.get('/me', authenticate, asyncHandler(AuthController.me));
router.post('/logout', asyncHandler(AuthController.logout));
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(AuthController.changePassword)
);

export default router;
