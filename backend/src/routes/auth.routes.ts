import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validateBody } from '../middlewares/validate';
import { forgotPasswordRateLimit } from '../middlewares/forgotPasswordRateLimit';
import { loginRateLimit } from '../middlewares/loginRateLimit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', loginRateLimit, validateBody(loginSchema), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.get('/me', authenticate, asyncHandler(AuthController.me));
router.patch('/me', authenticate, validateBody(updateProfileSchema), asyncHandler(AuthController.updateMe));
router.post('/logout', asyncHandler(AuthController.logout));
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(AuthController.changePassword)
);
router.post(
  '/forgot-password',
  forgotPasswordRateLimit,
  validateBody(forgotPasswordSchema),
  asyncHandler(AuthController.forgotPassword)
);
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(AuthController.resetPassword)
);

export default router;
