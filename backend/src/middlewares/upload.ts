import multer from 'multer';

// Buffer em memória (não em disco): o StorageService decide o destino final
// dentro de uploads/ (ver storage.service.ts).
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
