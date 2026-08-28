# Deploy na nuvem (Supabase + Render)

Guia para tirar este projeto do computador local: banco de dados e anexos no
Supabase, backend e frontend no Render. As duas contas são gratuitas e não
pedem cartão de crédito.

Passos que só vocês podem fazer (login, criação de conta, colar credenciais) —
o resto (código) já está pronto no repositório.

## 1. Supabase (banco de dados + anexos)

1. Crie uma conta em [supabase.com](https://supabase.com) (login com GitHub ou e-mail).
2. **New project** → escolha um nome e uma senha forte para o banco (guarde essa senha).
3. Espere o projeto provisionar (~2 min).
4. **Connection string**: Project Settings → Database → Connection string → copie a URI no modo **Session** (porta 5432, não a de "Transaction pooler"). Vai ser o `DATABASE_URL`.
5. **API keys**: Project Settings → API → copie:
   - `Project URL` → vai ser o `SUPABASE_URL`
   - `service_role` key (não a `anon`!) → vai ser o `SUPABASE_SERVICE_ROLE_KEY`. Essa chave dá acesso total ao projeto — nunca cole ela no frontend, só no backend.
6. **Bucket de anexos**: Storage → New bucket → nome `attachments` → deixe **Private** (não marque "Public bucket"). Os anexos são baixados por um link assinado gerado pelo backend, não precisam de bucket público.

## 2. Render (backend + frontend)

1. Crie uma conta em [render.com](https://render.com) (login com GitHub facilita o deploy automático a cada push).
2. Suba o código deste repositório para o GitHub, se ainda não estiver lá.
3. No painel do Render: **New +** → **Blueprint** → conecte o repositório. O Render vai detectar o `render.yaml` da raiz e propor os dois serviços (`pipelines-backend` e `pipelines-frontend`).
4. Antes de confirmar, ele vai pedir os valores das variáveis marcadas como "preencher no painel" — pode deixar em branco por agora e preencher depois (passo 6).
5. Confirme e espere os dois primeiros deploys terminarem (uns 3-5 min).
6. Agora que os dois serviços existem, você tem as URLs deles (algo como `https://pipelines-backend-xxxx.onrender.com` e `https://pipelines-frontend-xxxx.onrender.com`). Volte no painel e preencha, em **cada serviço → Environment**:

   No `pipelines-backend`:
   - `DATABASE_URL` → a connection string do Supabase (passo 1.4)
   - `SUPABASE_URL` → do passo 1.5
   - `SUPABASE_SERVICE_ROLE_KEY` → do passo 1.5
   - `CORS_ORIGIN` → a URL do `pipelines-frontend` (sem barra no final)
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → credenciais do primeiro usuário admin (troque a senha depois do primeiro login)
   - `IMOVIEW_BASE_URL` / `IMOVIEW_API_KEY` → se já usam a integração

   No `pipelines-frontend`:
   - `VITE_API_BASE_URL` → a URL do `pipelines-backend` **+ `/api/v1`** (ex.: `https://pipelines-backend-xxxx.onrender.com/api/v1`)

7. Cada serviço reimplanta sozinho quando uma env var muda. Depois desse passo, acesse a URL do `pipelines-frontend` — é o link que vocês vão usar no dia a dia.

## O que muda no dia a dia

- Qualquer `git push` na branch principal reimplanta backend e frontend automaticamente.
- O backend do plano gratuito "dorme" depois de ~15 min sem acesso — a primeira requisição do dia demora uns 30-50s pra acordar. Normal.
- O ambiente local com Docker continua funcionando do mesmo jeito para desenvolvimento — nada obriga a abandoná-lo, ele só deixa de ser onde os dados "de verdade" moram.

## Tarefas em segundo plano (SLA e automações recorrentes)

O sistema precisa varrer, de tempos em tempos, os cards para: notificar SLA
estourado e disparar automações do tipo "atividade recorrente".

**Como funciona hoje (padrão):** um `setInterval` de 15 min dentro do próprio
processo do backend (`BACKGROUND_SCANS=interval`). Um advisory lock do Postgres
garante que, se um dia rodar em mais de uma instância, só uma varre por vez.

**Limitação:** no plano gratuito do Render o backend dorme; se ninguém acessar
por 15+ min, o intervalo não fecha e a varredura não roda até alguém acordar o
serviço.

**Opcional — cron externo (recomendado se o SLA importa):**

1. No `pipelines-backend` → Environment, defina:
   - `BACKGROUND_SCANS=off`
   - `INTERNAL_API_SECRET=<uma string aleatória longa>`
2. Configure um agendador externo (Render Cron Job, cron-job.org, GitHub
   Actions schedule...) para, a cada 10–15 min, fazer:

   ```
   POST https://<pipelines-backend>/api/v1/internal/run-scans
   Header: X-Internal-Secret: <o mesmo INTERNAL_API_SECRET>
   ```

   Resposta `{ "ok": true, "ran": true }`. Sem o segredo configurado, o
   endpoint responde 404.
