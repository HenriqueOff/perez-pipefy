import multer from 'multer';

// Buffer em memória (não em disco): o StorageService decide o destino final
// (disco local em dev, Supabase Storage em produção). Evita depender de um
// filesystem persistente, que o plano gratuito do Render não oferece.
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
