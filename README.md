# DumbMirror Relay Server

Serviço de relay que intermedeia comandos entre o aplicativo Android e as instalações MagicMirror, permitindo controle remoto mesmo quando espelho e app estão em redes distintas.

## Visão geral

- **REST API** para cadastro/login de usuários, provisionamento de espelhos e envio de comandos.
- **Socket.IO** no namespace `/mirror` para manter conexões persistentes com os espelhos.
- **Cache em memória** para estado de sensores e respostas de IA, exposto por endpoints REST.
- **Persistência em MongoDB** (Atlas ou local). Scripts antigos com SQLite estão depreciados.

## Pré-requisitos

- Node.js 18 ou superior
- MongoDB acessível (local ou Atlas)
- Variáveis de ambiente configuradas (`.env`)

## Configuração rápida

```bash
cp .env.example .env
npm install
npm run dev # usa nodemon para recarregar automaticamente
```

### Variáveis de ambiente principais

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta HTTP (padrão `8081`) |
| `JWT_SECRET` | Segredo usado para assinar tokens JWT |
| `MONGODB_URI` | String de conexão com o MongoDB |
| `MONGODB_DB` | Nome do banco utilizado pelo relay |

> **Importante:** o arquivo `.env.example` ainda referencia `DATABASE_PATH` da versão SQLite. Substitua por `MONGODB_URI`/`MONGODB_DB` ao criar o `.env` real.

## Endpoints REST

Todas as rotas sob `/api/*`, exceto criação/login de usuário, exigem header `Authorization: Bearer <token>`.

- `POST /api/users` – cria um novo usuário `{ email, password }` e retorna token JWT inicial.
- `POST /api/auth/login` – autentica o usuário e devolve um novo token.
- `GET /api/auth/me` – retorna dados do usuário autenticado.
- `GET /api/mirrors` – lista espelhos do usuário logado com status online/offline.
- `POST /api/mirrors` – cria um espelho e devolve o `secret` para pareamento.
- `GET /api/mirrors/:mirrorId/status` – consulta `lastSeen`, `offlineSince` e informações básicas.
- `POST /api/mirrors/:mirrorId/commands` – envia comando (`notification`, `payload`) via Socket.IO.
- `GET /api/mirrors/:mirrorId/sensors/latest` – retorna a última leitura de sensores recebida.
- `GET /api/mirrors/:mirrorId/sensors/summary` – devolve o resumo agregado mais recente.
- `GET /api/mirrors/:mirrorId/sensors/report` – devolve o último relatório detalhado.
- `GET /api/mirrors/:mirrorId/ai/responses` – lista histórico de respostas de IA ou filtra por `requestId`.

## Protocolo Socket.IO (`/mirror`)

1. Espelho conecta em `ws(s)://<host>:<port>/mirror`.
2. Imediatamente emite `authenticate` com `{ mirrorId, secret }` retornados pelo endpoint de criação.
3. Servidor responde com `auth-success` ou `auth-error` e notifica demais clientes com `mirror-status`.
4. Eventos importantes:
   - `heartbeat` – mantêm `lastSeen` atualizado.
   - `execute-command` – comando enviado pelo servidor (dashboard/app).
   - `command-result` – espelho devolve status do comando executado.
   - `mirror-event` – usado para telemetria (sensores, IA, logs).

## Scripts npm úteis

- `npm run dev` – inicia o servidor com recarregamento automático.
- `npm run start` – executa a versão buildada (sem nodemon).
- `npm run lint` – roda ESLint.
- `npm test` – executa testes end-to-end (`tests/relay.e2e.test.mjs`) usando Mongo em memória.

## Estrutura principal

- `src/config.js` – carrega `.env` e expõe configuração.
- `src/auth.js` – geração/validação de JWT e middleware `authenticateRequest`.
- `src/db.js` – conexão com Mongo e helpers (`createUser`, `createMirror`, índices, etc.).
- `src/server.js` – Express + Socket.IO, rotas REST e processamento de eventos.
- `tests/relay.e2e.test.mjs` – cobre fluxo completo usuário/espelho/comandos + sensores.

## Observações sobre scripts legados

- `scripts/list.mjs` e `scripts/reset-db.mjs` ainda assumem SQLite. Estão comentados como legado e vão ser reescritos.

## Roadmap

- Reescrever scripts administrativos para Mongo.
- Implementar refresh tokens / revogação.
- Persistir histórico de comandos e eventos no banco.
- Adicionar métricas e limites de taxa (rate limiting) nas rotas críticas.
