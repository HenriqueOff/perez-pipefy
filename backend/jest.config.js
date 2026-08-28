/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // Cria (se preciso) e migra um Postgres local descartável (pipelines_test) antes da suíte.
  globalSetup: '<rootDir>/tests/globalSetup.js',
  // Os testes de integração compartilham um único Postgres e inserem/apagam linhas por
  // identificadores fixos — rodar os arquivos em paralelo (padrão do jest) causa colisão
  // intermitente entre suítes. Serial troca alguns segundos por determinismo.
  maxWorkers: 1,
  // Carrega backend/.env.test em vez do backend/.env real (que aponta para produção) e
  // recusa rodar se o ambiente parecer de produção — ver tests/assertTestEnv.ts.
  setupFiles: ['<rootDir>/tests/loadEnv.ts'],
  // Sem isso, o ts-jest não entende corretamente o "module": "node16" do tsconfig ao
  // tipar import() dinâmico de pacotes ESM-only (file-type, sanitize-html) — cada arquivo
  // é transpilado isoladamente, sem checagem de tipo cross-file (tsc --noEmit já cobre
  // isso separadamente).
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};
