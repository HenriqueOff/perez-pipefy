import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { forgotPasswordRateLimit } from '../middlewares/forgotPasswordRateLimit';
import { loginRateLimit } from '../middlewares/loginRateLimit';
import {
  changePasswordSchema,
  confirmTwoFactorSchema,
  disableTwoFactorSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyTwoFactorSchema,
} from '../validators/auth.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', loginRateLimit, validateBody(loginSchema), asyncHandler(AuthController.login));
router.post(
  '/login/verify-2fa',
  loginRateLimit,
  validateBody(verifyTwoFactorSchema),
  asyncHandler(AuthController.verifyTwoFactorLogin)
);
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
router.get('/sessions', authenticate, asyncHandler(AuthController.listSessions));
router.delete('/sessions/:sessionId', authenticate, asyncHandler(AuthController.revokeSession));

// 2FA é uma opção pra contas admin (perfil de maior risco no sistema); membros comuns
// não veem a opção nas configurações e a API recusa fora desse papel.
router.post('/2fa/setup', authenticate, requireGlobalRole('admin'), asyncHandler(AuthController.setupTwoFactor));
router.post(
  '/2fa/confirm',
  authenticate,
  requireGlobalRole('admin'),
  validateBody(confirmTwoFactorSchema),
  asyncHandler(AuthController.confirmTwoFactor)
);
router.post(
  '/2fa/disable',
  authenticate,
  requireGlobalRole('admin'),
  validateBody(disableTwoFactorSchema),
  asyncHandler(AuthController.disableTwoFactor)
);

export default router;
