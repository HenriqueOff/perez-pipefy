// Em dev local, o proxy do Vite (vite.config.ts) encaminha /api para o backend na
// porta 3000, então o padrão relativo funciona sem configurar nada. Em produção
// (frontend e backend em domínios separados no Render), defina VITE_API_BASE_URL
// com a URL completa do backend no ambiente de build do site estático.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
