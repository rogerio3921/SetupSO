# SetupSO

> **MVP 3 (Online)** — Rastreamento de etapas cirúrgicas com autenticação, banco de dados e auditoria de colaborador.

## Visão Geral

O SetupSO é uma aplicação web para rastreamento em tempo real das etapas do ciclo cirúrgico (SO — Sala de Operação). Registra entradas, saídas e durações de cada etapa (anestesia, cirurgia, limpeza, etc.) e gera relatórios de desempenho.

**Arquitetura MVP 3:**
- **Frontend:** `index8.html` + `app.js` (HTML/CSS/Vanilla JS, sem dependências de build)
- **Backend:** API REST Node.js/Express
- **Banco:** PostgreSQL (produção) ou SQLite (desenvolvimento)
- **Autenticação:** JWT com bcrypt para hash de senha

Para detalhes completos de arquitetura, ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Início Rápido (desenvolvimento local)

### Pré-requisitos
- Node.js 20+
- npm 10+

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env e defina JWT_SECRET e ADMIN_PASSWORD antes de continuar
```

### 2. Instalar dependências da API

```bash
cd api
npm install
```

### 3. Iniciar a API (modo desenvolvimento com SQLite)

```bash
npm run dev
# ou: node server.js
```

A API inicia em `http://localhost:3000` e roda as migrações automaticamente.

### 4. Criar o usuário admin inicial

```bash
npm run seed
# ou: node seeds/createAdmin.js
```

### 5. Abrir o frontend

Abra `index8.html` no navegador (via Live Server ou qualquer servidor HTTP estático):
```bash
npx serve . -p 5500
# Acesse: http://localhost:5500/index8.html
```

---

## Deploy com Docker (on-premise / produção)

### Pré-requisitos
- Docker Engine 24+
- docker compose v2

### 1. Configurar variáveis

```bash
cp .env.example .env
# Edite .env: defina POSTGRES_PASSWORD, JWT_SECRET e ADMIN_PASSWORD
```

### 2. Subir os serviços

```bash
docker compose up -d
```

Isso inicia:
- `db` — PostgreSQL 15
- `api` — API Node.js (com migrações automáticas na inicialização)
- `proxy` — Nginx servindo o frontend + proxy reverso para a API

### 3. Criar admin inicial

```bash
docker compose exec api node seeds/createAdmin.js
```

### 4. Acessar

```
http://<IP-do-servidor>/
```

---

## Estrutura do Projeto

```
SetupSO/
├── index8.html          # Frontend (HTML/CSS/JS)
├── app.js               # Lógica do frontend
├── api/                 # Backend Node.js
│   ├── server.js        # Entry point da API
│   ├── knexfile.js      # Configuração do banco (Knex)
│   ├── Dockerfile       # Imagem Docker da API
│   ├── package.json
│   ├── migrations/      # Migrações do banco de dados
│   ├── seeds/           # Seeds (criação do admin inicial)
│   └── src/
│       ├── db.js        # Instância do Knex
│       ├── middleware/
│       │   └── auth.js  # Middleware JWT
│       └── routes/
│           ├── auth.js
│           ├── users.js
│           ├── rooms.js
│           ├── cases.js
│           ├── events.js
│           ├── reports.js
│           └── import.js
├── docker-compose.yml   # Orquestração Docker
├── nginx.conf           # Configuração do Nginx
├── .env.example         # Template de variáveis de ambiente
└── docs/
    └── ARCHITECTURE.md  # Documentação de arquitetura completa
```

---

## Endpoints principais da API

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Login (retorna token JWT) | Público |
| GET | `/api/v1/auth/me` | Dados do usuário logado | JWT |
| GET | `/api/v1/rooms` | Lista salas | JWT |
| GET | `/api/v1/rooms/:id/active-case` | Caso ativo da sala | JWT |
| POST | `/api/v1/cases` | Abre novo caso | JWT |
| PATCH | `/api/v1/cases/:id` | Atualiza caso/dados | JWT |
| GET | `/api/v1/cases/:id/events` | Lista eventos do caso | JWT |
| POST | `/api/v1/cases/:id/events` | Registra evento | JWT |
| GET | `/api/v1/reports/cases` | Relatório de casos | JWT |
| POST | `/api/v1/import/localstorage` | Importa dados do MVP 2 | JWT |

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para contratos completos.

---

## Perfis de acesso

| Ação | Colaborador | Admin |
|---|:---:|:---:|
| Registrar eventos | ✅ | ✅ |
| Editar dados do caso | ✅ | ✅ |
| Ver relatórios | ✅ | ✅ |
| Gerenciar usuários | ❌ | ✅ |
| Criar/desativar salas | ❌ | ✅ |
| Reabrir caso fechado | ❌ | ✅ |

---

## Migração do MVP 2 (localStorage)

Se você já tem dados no MVP 2 (localStorage), use o fluxo de importação:

1. No frontend antigo, exporte o estado: `JSON.stringify(JSON.parse(localStorage.getItem('setupso_mvp2_state_ultra_robust_20260502_1105')))`
2. Copie o JSON.
3. Faça login no MVP 3.
4. Envie para a API:

```bash
curl -X POST https://<host>/api/v1/import/localstorage \
  -H "Authorization: Bearer <seu_token>" \
  -H "Content-Type: application/json" \
  -d '{"state": <JSON_copiado>}'
```

---

## Variáveis de ambiente

Ver [`.env.example`](.env.example) para a lista completa.

---

*SetupSO — MVP 3 Online — 2026*
