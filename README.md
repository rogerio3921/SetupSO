# SetupSO — MVP Online

Aplicação de registro de eventos cirúrgicos com backend Node.js + Postgres, multi-hospital e autenticação JWT.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/)  
  (para rodar localmente sem instalar Node.js ou Postgres manualmente)

## Subindo com Docker Compose

```bash
docker compose up --build
```

Aguarde até o log mostrar:

```
SetupSO API listening on http://localhost:3000
```

Abra **http://localhost:3000** no navegador.

## Credenciais de teste (seed)

| Campo    | Valor         |
|----------|---------------|
| Hospital | `demo`        |
| Usuário  | `admin`       |
| Código   | `admin01`     |
| Senha    | `Admin@1234`  |
| Perfil   | admin         |

Colaborador padrão:

| Campo    | Valor          |
|----------|----------------|
| Hospital | `demo`         |
| Usuário  | `colaborador`  |
| Código   | `col01`        |
| Senha    | `Collab@1234`  |
| Perfil   | collaborator   |

## Rodando sem Docker (desenvolvimento local)

1. Instale o Node.js 20+ e tenha um Postgres rodando.
2. Copie as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # edite .env com sua DATABASE_URL real
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute as migrações e seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Suba o servidor:
   ```bash
   npm start
   ```
6. Acesse **http://localhost:3000**.

## Arquitetura

```
SetupSO/
├── server/
│   ├── index.js      # Express API (auth, rooms, cases, events, admin)
│   ├── db.js         # Postgres connection pool (pg)
│   ├── migrate.js    # Schema migrations
│   └── seed.js       # Dados iniciais (tenant demo + usuários)
├── public/
│   ├── index.html    # Frontend SPA (login overlay + app)
│   └── app.js        # Lógica do cliente (auth + chamadas API)
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Multi-tenant

O hospital é identificado por um **slug** (código curto, texto livre) digitado na tela de login.  
O backend normaliza o slug (lowercase, trim, espaços → hyphens) e busca o tenant no banco.  
Todas as tabelas de negócio têm `tenant_id` — nenhum dado vaza entre hospitais.

## Autenticação

- **POST /auth/login** — `{ hospital, usernameOrCode, password }` → `{ token, user, tenantSlug }`
- **GET /auth/me** — valida token e retorna info do usuário

O token JWT é armazenado no `localStorage` e enviado em todas as chamadas como `Authorization: Bearer <token>` + header `X-Tenant: <slug>`.

## Perfis (RBAC)

| Perfil        | Pode fazer                                    |
|---------------|-----------------------------------------------|
| `admin`       | Tudo + gerenciar usuários do hospital (`/api/admin/users`) |
| `collaborator`| Registrar e visualizar eventos/cases          |

## Endpoints principais

| Método | Caminho                              | Descrição                        |
|--------|--------------------------------------|----------------------------------|
| POST   | `/auth/login`                        | Login                            |
| GET    | `/auth/me`                           | Valida token                     |
| GET    | `/api/rooms`                         | Lista salas do tenant            |
| GET    | `/api/rooms/:roomId/active-case`     | Case ativo ou cria novo          |
| PATCH  | `/api/cases/:caseId`                 | Atualiza detalhes do case        |
| GET    | `/api/cases/:caseId/events`          | Lista eventos do case            |
| POST   | `/api/cases/:caseId/events`          | Registra novo evento             |
| DELETE | `/api/cases/:caseId/events/:id`      | Remove último evento manual      |
| GET    | `/api/admin/users`                   | (admin) Lista usuários do tenant |
| POST   | `/api/admin/users`                   | (admin) Cria usuário             |
| PATCH  | `/api/admin/users/:id`               | (admin) Edita/inativa usuário    |

## Auditoria

- `created_by_user_id` gravado em **events** e **cases**.
- `updated_by_user_id` + `updated_at` gravados em **cases** a cada PATCH.
