import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import pipelineRoutes from './pipeline.routes';
import databaseRoutes from './database.routes';
import integrationRoutes from './integration.routes';
import searchRoutes from './search.routes';
import notificationRoutes from './notification.routes';
import publicFormRoutes from './publicForm.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/databases', databaseRoutes);
router.use('/integrations', integrationRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/public/forms', publicFormRoutes);

export default router;
