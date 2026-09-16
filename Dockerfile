FROM node:22-bookworm-slim

WORKDIR /app

# Workspace npm: precisa do package.json de cada workspace antes do "npm install"
# pra resolver as dependências corretamente (mesmo motivo do buildCommand do Render
# em render.yaml — "npm install" isolado dentro de backend/ não vê o monorepo).
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# --include=dev é necessário mesmo com NODE_ENV=production: o "npm run build" do
# backend usa TypeScript (tsc) e o knex do backend usa o knexfile.ts via ts-node
# em runtime (migrate/seed), então @types/* e ts-node continuam necessários depois
# do build — mesma lógica documentada em render.yaml.
RUN npm install --include=dev

COPY . .

RUN npm run build --workspace backend
RUN npm run build --workspace frontend

RUN mkdir -p /app/backend/uploads && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Migration e seed do admin a cada boot: são idempotentes (seed só cria o usuário
# se ainda não existir nenhum admin) — mesmo padrão do startCommand em render.yaml.
CMD ["sh", "-c", "npm run migrate --workspace backend && npm run seed --workspace backend && npm start --workspace backend"]
