import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export const NotificationController = {
  async list(req: Request, res: Response) {
    res.json(await NotificationService.listForUser(req.user!.id));
  },

  async unreadCount(req: Request, res: Response) {
    res.json({ count: await NotificationService.countUnread(req.user!.id) });
  },

  async markRead(req: Request, res: Response) {
    res.json(await NotificationService.markRead(Number(req.params.notificationId), req.user!.id));
  },

  async markAllRead(req: Request, res: Response) {
    await NotificationService.markAllRead(req.user!.id);
    res.status(204).send();
  },
};
