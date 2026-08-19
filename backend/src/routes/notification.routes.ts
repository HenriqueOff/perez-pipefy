import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authenticate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(NotificationController.list));
router.get('/unread-count', asyncHandler(NotificationController.unreadCount));
router.post('/read-all', asyncHandler(NotificationController.markAllRead));
router.post('/:notificationId/read', asyncHandler(NotificationController.markRead));

export default router;
