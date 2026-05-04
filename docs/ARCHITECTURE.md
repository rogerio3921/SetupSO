# SetupSO MVP 2 — Arquitetura Online

## Visão Geral

O MVP 2 online transforma o app de uma SPA 100 % offline (localStorage) em uma
aplicação cliente–servidor com autenticação, auditoria e persistência central.

```
┌────────────────────────────────────────────────────────────────────┐
│                         REDE (LAN / Internet)                      │
│                                                                    │
│  Tablet / PC                         Servidor (Node.js)            │
│  ┌───────────────────┐               ┌──────────────────────────┐  │
│  │  Navegador        │ HTTPS / REST  │  Express API             │  │
│  │  ─────────────    │ ────────────► │  ──────────────────────  │  │
│  │  index.html       │               │  /api/auth               │  │
│  │  app.js (MVP 2)   │ ◄──────────── │  /api/rooms              │  │
│  │                   │  JSON         │  /api/cases              │  │
│  │  (estado local    │               │  /api/events             │  │
│  │   apenas para     │               │  /api/users   (admin)    │  │
│  │   UX/cache)       │               │  /api/migrate            │  │
│  └───────────────────┘               │                          │  │
│                                      │  better-sqlite3 (SQLite) │  │
│                                      │  ──────────────────────  │  │
│                                      │  users / rooms / cases / │  │
│                                      │  events / import_log     │  │
│                                      └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Stack Escolhida

| Camada         | Tecnologia           | Justificativa                                                        |
|---------------|----------------------|----------------------------------------------------------------------|
| Runtime        | Node.js ≥ 18         | Mesmo ecossistema JS do frontend; low-overhead; suporte LTS longo   |
| Framework API  | Express 4            | Minimalista, amplamente documentado, sem curva de aprendizado extra |
| Banco de dados | SQLite (better-sqlite3) | Zero configuração de servidor; arquivo único; backup trivial (cp); perfeito para um único servidor em ambiente hospitalar |
| Autenticação   | JWT (jsonwebtoken)   | Stateless; funciona bem em múltiplos dispositivos (tablets + PCs)   |
| Hash de senha  | bcrypt (rounds ≥ 12) | Padrão da indústria; resistente a ataques de força bruta            |
| Frontend       | HTML + vanilla JS    | Sem mudança no frontend atual; reduz risco de regressão             |
| Segurança HTTP | helmet + cors        | Cabeçalhos seguros e controle de origem                             |

### Por que SQLite e não PostgreSQL?
- O ambiente hospitalar provavelmente **não tem DBA** para manter um servidor Postgres.
- SQLite suporta **centenas de escritas/segundo**, mais que suficiente para o volume de eventos cirúrgicos.
- Quando o volume crescer (múltiplos centros cirúrgicos, relatórios BI), a migração para Postgres é trivial — o ORM/query builder é idêntico.

## Fluxo de Autenticação

```
Dispositivo                              Servidor
    │                                        │
    │── POST /api/auth/login ───────────────►│
    │   { username, password }               │
    │                                        │ 1. Busca user por username
    │                                        │ 2. bcrypt.compare(password, hash)
    │                                        │ 3. Gera JWT (8 h)
    │◄── { token, user } ───────────────────│
    │                                        │
    │   (armazena token em memória/sessionStorage)
    │                                        │
    │── GET /api/cases ─────────────────────►│
    │   Authorization: Bearer <token>        │
    │                                        │ 4. Verifica assinatura JWT
    │                                        │ 5. Extrai { id, role } → req.user
    │◄── [ lista de cases ] ────────────────│
```

## Estrutura de Diretórios

```
SetupSO/
├── public/              ← frontend servido pelo Express (ou CDN)
│   ├── index.html       (renomeado de index8.html)
│   └── app.js
│
├── server/
│   ├── index.js         ← ponto de entrada do servidor
│   ├── db/
│   │   ├── schema.sql   ← DDL completo
│   │   └── migrate.js   ← script de migração / init do banco
│   ├── middleware/
│   │   └── auth.js      ← requireAuth + requireAdmin
│   └── routes/
│       ├── auth.js      ← POST /login, POST /logout, GET /me
│       ├── rooms.js     ← CRUD de salas
│       ├── cases.js     ← CRUD de cases
│       ├── events.js    ← registro de eventos (auditado)
│       ├── users.js     ← CRUD de usuários (admin)
│       └── migrate.js   ← import/export localStorage ↔ DB
│
├── docs/
│   ├── ARCHITECTURE.md  ← este arquivo
│   ├── DATABASE_SCHEMA.md
│   ├── API_CONTRACTS.md
│   └── MIGRATION_PLAN.md
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Decisões de Segurança

| Área               | Decisão                                                              |
|--------------------|----------------------------------------------------------------------|
| Senhas             | bcrypt com rounds ≥ 12 (configurável via `BCRYPT_ROUNDS`)           |
| Tokens             | JWT assinado HS256, expiração 8 h (configurável via `JWT_EXPIRES_IN`) |
| CORS               | Lista de origens explícita (`CORS_ORIGIN`); nunca `*` em produção  |
| Cabeçalhos HTTP    | helmet configura CSP, HSTS, X-Frame-Options, etc.                  |
| Rate limiting      | 20 req / 15 min em `/api/auth/*` (express-rate-limit)              |
| HTTPS              | Obrigatório em produção via proxy reverso (nginx/Caddy)            |
| Soft-delete        | Usuários nunca são apagados (is_active = 0) para preservar auditoria |
| Segredos           | Nunca no código-fonte; sempre em `.env` (excluído do git)          |

## Escalabilidade Futura

- **Multi-hospital / multi-site**: trocar SQLite por PostgreSQL e adicionar campo `tenant_id`.
- **Tempo real**: adicionar Socket.IO para push de eventos para o Dashboard TV.
- **Mobile nativo**: a API REST já é compatível com apps React Native / Flutter.
- **BI / relatórios**: exportar events para data warehouse (CSV/Parquet via `/api/migrate/export`).
