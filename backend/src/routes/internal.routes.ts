import { Router } from 'express';
import { InternalController } from '../controllers/internal.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Sem `authenticate`: a autenticação aqui é o segredo compartilhado X-Internal-Secret,
// checado dentro do controller (ver internal.controller.ts).
router.post('/run-scans', asyncHandler(InternalController.runScans));

export default router;
