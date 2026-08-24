/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  // Sem isso, o ts-jest não entende corretamente o "module": "node16" do tsconfig ao
  // tipar import() dinâmico de pacotes ESM-only (file-type, sanitize-html) — cada arquivo
  // é transpilado isoladamente, sem checagem de tipo cross-file (tsc --noEmit já cobre
  // isso separadamente).
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};
