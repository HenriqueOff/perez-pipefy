import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireGlobalRole } from '../middlewares/requireGlobalRole';
import { validateBody } from '../middlewares/validate';
import { createUserSchema, updateUserSchema } from '../validators/user.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(UserController.list));
router.post('/', requireGlobalRole('admin'), validateBody(createUserSchema), asyncHandler(UserController.create));
router.patch(
  '/:userId',
  requireGlobalRole('admin'),
  validateBody(updateUserSchema),
  asyncHandler(UserController.update)
);

export default router;
