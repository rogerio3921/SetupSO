# SetupSO — Arquitetura MVP Online

> **Versão:** MVP 3 (online)  
> **Data:** 2026-05-04  
> **Contexto:** Evolução do MVP 2 (localStorage) para solução online com autenticação, banco de dados e auditoria de colaborador.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Recomendada](#2-stack-recomendada)
3. [Diagrama de Componentes](#3-diagrama-de-componentes)
4. [Fluxo de Autenticação](#4-fluxo-de-autenticação)
5. [Contratos de API (REST)](#5-contratos-de-api-rest)
6. [Modelo de Dados](#6-modelo-de-dados)
7. [RBAC — Perfis e Permissões](#7-rbac--perfis-e-permissões)
8. [Migração do localStorage para o Backend](#8-migração-do-localstorage-para-o-backend)
9. [Estratégia de Deploy](#9-estratégia-de-deploy)
10. [Configuração por Variáveis de Ambiente](#10-configuração-por-variáveis-de-ambiente)
11. [Considerações de Segurança](#11-considerações-de-segurança)

---

## 1. Visão Geral

O SetupSO MVP Online mantém o **frontend estático** atual (`index8.html` + `app.js`) e adiciona:

- Uma **API REST** (backend Node.js) como ponto central de gravação e leitura de dados.
- Um **banco de dados relacional** (PostgreSQL em produção, SQLite em desenvolvimento) que persiste todos os registros com auditoria.
- **Autenticação JWT** para identificar qual colaborador está realizando cada ação.

```
Tablets / PCs (Navegador)
        │
        │ HTTPS
        ▼
  ┌─────────────┐      ┌──────────────────┐
  │  Frontend   │◄────►│   API (Node.js)  │
  │  Estático   │      │   Express + JWT  │
  │  (HTML/JS)  │      └────────┬─────────┘
  └─────────────┘               │
                                │ SQL
                         ┌──────▼───────┐
                         │  Banco de    │
                         │  Dados       │
                         │  (Postgres / │
                         │   SQLite)    │
                         └─────────────┘
```

**Escopo do MVP Online:**
- ~10 usuários simultâneos
- Dois perfis: `admin` e `collaborator`
- Auditoria: `createdByUserId` em cada operação de escrita
- Dois ambientes de deploy: nuvem (cloud) e servidor on-premise do hospital

---

## 2. Stack Recomendada

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | HTML + Vanilla JS (existente) | Sem reescrita; apenas adaptar chamadas |
| API | **Node.js 20 LTS + Express 4** | Ecossistema amplo, fácil de hospedar, bom suporte a JWT |
| ORM / Query | **Knex.js** | Suporta tanto SQLite (dev) quanto PostgreSQL (produção) com a mesma query API |
| Banco (produção) | **PostgreSQL 15+** | Suporte completo a cloud gerenciada e instalação on-prem; ACID; JSON nativo |
| Banco (desenvolvimento) | **SQLite 3** (via better-sqlite3) | Zero configuração; arquivo único; mesmo esquema via Knex |
| Autenticação | **JWT** (jsonwebtoken) + bcrypt | Stateless; fácil de consumir no frontend; senhas com hash seguro |
| Servidor HTTP | **Express** | Leve, maduro, vasta documentação |
| Contêiner | **Docker + docker-compose** | Isolamento, portabilidade cloud e on-prem |
| Migrações | **Knex Migrations** | Versionamento do esquema, rollback controlado |

> **Por que PostgreSQL e não MySQL?**  
> PostgreSQL é suportado por todos os grandes provedores de nuvem gerenciada (AWS RDS, Azure Database, Neon, Supabase) e é trivial de instalar on-prem com Docker. O suporte a tipos JSON, arrays e extensões futuras é superior.

---

## 3. Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                    Rede do hospital / Internet                    │
│                                                                  │
│  ┌──────────────┐    HTTPS/443     ┌────────────────────────┐   │
│  │  Tablet /    │ ◄──────────────► │   Reverse Proxy        │   │
│  │  PC          │                  │   (Nginx / Caddy)      │   │
│  │  Navegador   │                  └──────────┬─────────────┘   │
│  └──────────────┘                             │ HTTP/3000        │
│                                    ┌──────────▼─────────────┐   │
│                                    │   API Node.js          │   │
│                                    │   ┌──────────────────┐ │   │
│                                    │   │  Auth Middleware  │ │   │
│                                    │   │  (JWT verify)    │ │   │
│                                    │   └────────┬─────────┘ │   │
│                                    │            │            │   │
│                                    │   ┌────────▼─────────┐ │   │
│                                    │   │  Route Handlers  │ │   │
│                                    │   │  /auth /rooms    │ │   │
│                                    │   │  /cases /events  │ │   │
│                                    │   │  /reports        │ │   │
│                                    │   └────────┬─────────┘ │   │
│                                    └────────────┼───────────┘   │
│                                                 │ Knex.js        │
│                                    ┌────────────▼───────────┐   │
│                                    │   PostgreSQL / SQLite  │   │
│                                    │   users, rooms, cases, │   │
│                                    │   events, audit_log    │   │
│                                    └────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Arquivos do projeto:**

```
SetupSO/
├── index8.html          # Frontend (estático, sem alteração de HTML)
├── app.js               # Frontend JS (adaptado para chamadas à API)
├── api/                 # Backend Node.js
│   ├── package.json
│   ├── server.js        # Entry point
│   ├── knexfile.js      # Config Knex (SQLite dev / Postgres prod)
│   ├── migrations/      # Versionamento do schema
│   ├── seeds/           # Dados iniciais (admin default)
│   └── src/
│       ├── middleware/
│       │   └── auth.js  # Verificação JWT
│       └── routes/
│           ├── auth.js
│           ├── rooms.js
│           ├── cases.js
│           ├── events.js
│           └── reports.js
├── docker-compose.yml   # Deploy local / on-prem
├── .env.example         # Template de variáveis de ambiente
└── docs/
    └── ARCHITECTURE.md  # Este arquivo
```

---

## 4. Fluxo de Autenticação

```
Colaborador                  Frontend (app.js)              API                     DB
    │                               │                         │                      │
    │── digita login/senha ─────────►│                         │                      │
    │                               │── POST /auth/login ─────►│                      │
    │                               │   { username, password } │                      │
    │                               │                         │── SELECT users ──────►│
    │                               │                         │◄─ user row ───────────│
    │                               │                         │   bcrypt.compare()    │
    │                               │◄── { token, user } ─────│                      │
    │                               │                         │                      │
    │                               │  salva token em         │                      │
    │                               │  sessionStorage         │                      │
    │                               │                         │                      │
    │── clica em ação ─────────────►│                         │                      │
    │                               │── POST /cases/:id/events►│                      │
    │                               │   Authorization: Bearer  │                      │
    │                               │   <token>               │                      │
    │                               │                         │── verifica JWT        │
    │                               │                         │── INSERT event ──────►│
    │                               │                         │   (createdByUserId)   │
    │                               │◄── { event } ───────────│                      │
    │◄── atualiza UI ───────────────│                         │                      │
```

**Detalhes:**
- O token JWT tem expiração configurável (padrão: `8h` para um turno hospitalar).
- O `userId` é extraído do token pelo middleware e inserido automaticamente em cada escrita — o frontend **nunca** envia o userId explicitamente.
- Logout: descarte do token no `sessionStorage` (sem rota de logout no MVP; token expira por tempo).

---

## 5. Contratos de API (REST)

Base URL: `https://<host>/api/v1`

Todas as rotas (exceto `/auth/login`) exigem o header:
```
Authorization: Bearer <jwt_token>
```

---

### 5.1 Auth

#### `POST /auth/login`
Autentica um usuário.

**Request:**
```json
{
  "username": "enfermeiro.silva",
  "password": "senha123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "João Silva",
    "username": "enfermeiro.silva",
    "role": "collaborator"
  }
}
```

**Response 401:**
```json
{ "error": "Usuário ou senha inválidos." }
```

---

#### `GET /auth/me`
Retorna o usuário autenticado.

**Response 200:**
```json
{
  "id": 1,
  "name": "João Silva",
  "username": "enfermeiro.silva",
  "role": "collaborator",
  "active": true
}
```

---

### 5.2 Usuários (admin only)

#### `GET /users`
Lista todos os usuários.

**Response 200:**
```json
[
  { "id": 1, "name": "João Silva", "username": "enfermeiro.silva", "role": "collaborator", "active": true, "createdAt": "2026-05-01T10:00:00Z" }
]
```

#### `POST /users`
Cria novo usuário.

**Request:**
```json
{
  "name": "Maria Santos",
  "username": "maria.santos",
  "password": "senha_temporaria",
  "role": "collaborator"
}
```

**Response 201:**
```json
{ "id": 2, "name": "Maria Santos", "username": "maria.santos", "role": "collaborator" }
```

#### `PATCH /users/:id`
Atualiza usuário (admin pode alterar role, active, name; o próprio usuário pode alterar password).

**Request (trocar senha):**
```json
{ "password": "nova_senha" }
```

**Request (desativar):**
```json
{ "active": false }
```

---

### 5.3 Salas

#### `GET /rooms`
Lista todas as salas.

**Response 200:**
```json
[
  { "id": 1, "code": "Sala 3", "createdAt": "2026-05-01T08:00:00Z" },
  { "id": 2, "code": "Sala 5", "createdAt": "2026-05-01T08:00:00Z" }
]
```

#### `POST /rooms` *(admin)*
Cria nova sala.

**Request:**
```json
{ "code": "Sala 7" }
```

**Response 201:**
```json
{ "id": 3, "code": "Sala 7" }
```

#### `GET /rooms/:roomId/active-case`
Retorna o caso ativo da sala (ou `null`).

**Response 200:**
```json
{
  "id": "uuid",
  "roomId": 1,
  "code": "Sala3-2026-05-04-01",
  "status": "active",
  "patientPhase": "open",
  "roomPhase": "open",
  "data": {
    "fullName": "",
    "noticeNumber": "",
    "procedureName": "",
    "surgeonName": "",
    "attendanceNumber": "",
    "birthDate": "",
    "allergies": "",
    "weightKg": "",
    "heightCm": "",
    "plannedSurgeryTimeHHMM": "",
    "referenceDateISO": "2026-05-04"
  },
  "createdAt": "2026-05-04T07:30:00Z",
  "createdByUserId": 1
}
```

---

### 5.4 Casos

#### `POST /cases`
Cria novo caso (abre sala).

**Request:**
```json
{ "roomId": 1 }
```

**Response 201:**
```json
{ "id": "uuid", "code": "Sala3-2026-05-04-01", "status": "active", "createdByUserId": 1 }
```

#### `PATCH /cases/:id`
Atualiza dados ou status do caso.

**Request (atualizar detalhes):**
```json
{
  "data": {
    "fullName": "Paciente X",
    "procedureName": "Colecistectomia",
    "surgeonName": "Dr. Alves",
    "plannedSurgeryTimeHHMM": "08:00"
  }
}
```

**Request (fechar caso):**
```json
{ "status": "closed" }
```

**Response 200:**
```json
{ "id": "uuid", "status": "closed", "updatedByUserId": 1, "updatedAt": "2026-05-04T15:00:00Z" }
```

---

### 5.5 Eventos

#### `GET /cases/:caseId/events`
Lista todos os eventos de um caso, ordenados por `happenedAt`.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "caseId": "uuid",
    "eventKey": "anesthesia_team",
    "action": "in",
    "happenedAt": "2026-05-04T07:45:00Z",
    "auto": false,
    "createdAt": "2026-05-04T07:45:02Z",
    "createdByUserId": 1,
    "createdByName": "João Silva"
  }
]
```

#### `POST /cases/:caseId/events`
Registra um novo evento.

**Request:**
```json
{
  "eventKey": "anesthesia_team",
  "action": "in",
  "auto": false
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "eventKey": "anesthesia_team",
  "action": "in",
  "happenedAt": "2026-05-04T07:45:00Z",
  "createdByUserId": 1
}
```

> **Nota:** O campo `happenedAt` é gerado pelo servidor (UTC). O `createdByUserId` é extraído do token JWT — nunca enviado pelo cliente.

---

### 5.6 Relatórios

#### `GET /reports/cases`
Lista casos com métricas calculadas.

**Query params:**
- `from` (ISO date) — data inicial
- `to` (ISO date) — data final
- `roomId` (opcional) — filtrar por sala

**Response 200:**
```json
[
  {
    "id": "uuid",
    "code": "Sala3-2026-05-04-01",
    "roomCode": "Sala 3",
    "status": "closed",
    "data": { "procedureName": "Colecistectomia", "surgeonName": "Dr. Alves" },
    "metrics": {
      "orTimeMs": 5400000,
      "surgeryTimeMs": 3600000,
      "anesthesiaTimeMs": 4200000,
      "rpaTimeMs": 1800000,
      "totalCcMs": 7200000
    },
    "createdAt": "2026-05-04T07:30:00Z",
    "createdByName": "João Silva"
  }
]
```

---

## 6. Modelo de Dados

### Tabela `users`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL / INTEGER PK | Auto-incremento |
| `name` | VARCHAR(120) | Nome completo do colaborador |
| `username` | VARCHAR(60) UNIQUE | Login |
| `password_hash` | VARCHAR(255) | bcrypt hash (custo ≥ 12) |
| `role` | VARCHAR(20) | `admin` ou `collaborator` |
| `active` | BOOLEAN | Default `true`; soft-delete |
| `created_at` | TIMESTAMPTZ | Default NOW() |
| `created_by_user_id` | INTEGER FK users | Quem criou (null = seed inicial) |

---

### Tabela `rooms`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL / INTEGER PK | |
| `code` | VARCHAR(60) UNIQUE | Ex.: "Sala 3" |
| `active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | Default NOW() |
| `created_by_user_id` | INTEGER FK users | |

---

### Tabela `cases`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | Gerado no servidor (uuid v4) |
| `room_id` | INTEGER FK rooms | |
| `code` | VARCHAR(60) | Ex.: "Sala3-2026-05-04-01" |
| `status` | VARCHAR(20) | `active` ou `closed` |
| `patient_phase` | VARCHAR(20) | `open` ou `closed` |
| `room_phase` | VARCHAR(20) | `open` ou `closed` |
| `full_name` | VARCHAR(200) | Nome do paciente |
| `notice_number` | VARCHAR(60) | Número do aviso |
| `procedure_name` | VARCHAR(200) | Procedimento |
| `surgeon_name` | VARCHAR(120) | Cirurgião |
| `attendance_number` | VARCHAR(60) | Número do atendimento |
| `birth_date` | DATE | Data de nascimento |
| `allergies` | TEXT | |
| `weight_kg` | NUMERIC(5,1) | |
| `height_cm` | NUMERIC(5,1) | |
| `planned_surgery_time` | TIME | HH:MM planejado |
| `reference_date` | DATE | Data de referência |
| `created_at` | TIMESTAMPTZ | Default NOW() |
| `created_by_user_id` | INTEGER FK users | **Auditoria** |
| `updated_at` | TIMESTAMPTZ | Atualizado em cada PATCH |
| `updated_by_user_id` | INTEGER FK users | **Auditoria** |

> **Nota LGPD:** Os campos de dados do paciente (`full_name`, `birth_date`, etc.) são os candidatos a pseudonimização ou criptografia em uma versão futura. Mantê-los em colunas separadas (em vez de JSON) facilita essa evolução.

---

### Tabela `events`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `case_id` | UUID FK cases | |
| `event_key` | VARCHAR(60) | Ex.: `anesthesia_team`, `surgery` |
| `action` | VARCHAR(20) | `in`, `out`, `start`, `end` |
| `happened_at` | TIMESTAMPTZ | Momento do evento (gerado no servidor) |
| `auto` | BOOLEAN | `true` = fechamento automático por regra |
| `created_at` | TIMESTAMPTZ | Default NOW() |
| `created_by_user_id` | INTEGER FK users | **Auditoria** (null se `auto = true`) |

Índices recomendados:
- `(case_id, event_key, action)` — para consultas de estado do caso
- `(happened_at)` — para relatórios por período

---

### Tabela `audit_log` *(opcional, mas recomendada)*

Registra alterações em dados sensíveis (como edição de detalhes do caso).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL PK | |
| `table_name` | VARCHAR(60) | Ex.: `cases` |
| `record_id` | VARCHAR(60) | ID do registro alterado |
| `action` | VARCHAR(20) | `INSERT`, `UPDATE`, `DELETE` |
| `changed_fields` | JSONB / JSON | Campos antes/depois |
| `performed_by_user_id` | INTEGER FK users | |
| `performed_at` | TIMESTAMPTZ | Default NOW() |

---

### Diagrama ER Simplificado

```
users ─────────────────────────────────────────────┐
  │                                                 │
  │ created_by_user_id                              │
  ▼                                                 │
rooms                                               │
  │                                                 │
  │ room_id                                         │
  ▼                                                 │
cases ◄── created_by_user_id ── users              │
  │       updated_by_user_id                        │
  │                                                 │
  │ case_id                                         │
  ▼                                                 │
events ◄── created_by_user_id ─────────────────────┘
```

---

## 7. RBAC — Perfis e Permissões

| Ação | `collaborator` | `admin` |
|---|:---:|:---:|
| Login | ✅ | ✅ |
| Ver salas e casos ativos | ✅ | ✅ |
| Registrar evento (in/out/start/end) | ✅ | ✅ |
| Editar detalhes do caso | ✅ | ✅ |
| Ver relatórios | ✅ | ✅ |
| Exportar relatórios (JSON/CSV) | ✅ | ✅ |
| Criar/editar usuários | ❌ | ✅ |
| Desativar usuários | ❌ | ✅ |
| Criar/desativar salas | ❌ | ✅ |
| Reabrir caso fechado | ❌ | ✅ |
| Ver audit_log | ❌ | ✅ |

**Implementação:** O middleware `auth.js` extrai o `role` do token JWT. Um segundo middleware `requireRole('admin')` retorna `403` se o perfil não for suficiente.

---

## 8. Migração do localStorage para o Backend

### 8.1 Estratégia

O `localStorage` atual (chave `setupso_mvp2_state_ultra_robust_...`) contém:
- `rooms`: lista de salas
- `cases`: lista de casos com dados de paciente
- `eventsByCaseId`: mapa de eventos por caso

### 8.2 Rota de importação inicial

```
POST /api/v1/import/localstorage
Content-Type: application/json

{ "state": { "rooms": [...], "cases": [...], "eventsByCaseId": {...} } }
```

- O servidor valida a estrutura e importa os dados.
- `createdByUserId` é atribuído ao usuário autenticado que realiza o import.
- Registros com `id` já existente no banco são ignorados (idempotente).
- Retorna um relatório: `{ imported: { rooms: 1, cases: 12, events: 87 }, skipped: 0 }`.

### 8.3 Compatibilidade durante a transição

Para permitir que o `app.js` funcione tanto no modo local (MVP 2) quanto no modo online (MVP 3):

1. O `app.js` verifica a existência de `window.API_BASE_URL`:
   - Se definido: usa a API REST.
   - Se não definido: usa `localStorage` (modo legado/offline).
2. O `index8.html` pode receber uma variável de configuração injetada pelo servidor (ou `.env` no frontend).

```javascript
// app.js — detecção de modo
const API_BASE = window.API_BASE_URL || null;
function loadState() {
  if (API_BASE) return fetchState(); // chama API
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
```

### 8.4 Passo a passo de migração

1. Deploy do backend (API + banco) no ambiente alvo.
2. Criar usuário admin inicial (seed).
3. Em cada dispositivo: abrir app → **Exportar estado** (botão novo no frontend) → recebe JSON.
4. Fazer login na versão online.
5. Usar a rota `POST /import/localstorage` (ou botão "Importar histórico local") para enviar o JSON.
6. Validar no relatório que os dados aparecem.
7. Remover os dados do `localStorage` local (ou manter como backup até confirmação).

---

## 9. Estratégia de Deploy

### 9.1 Cloud (nuvem)

**Topologia:**

```
Internet
   │
   ▼
[CDN / Static Hosting]     ← index8.html + app.js (Nginx, S3, Vercel, etc.)
   │
   ▼
[Reverse Proxy / Load Balancer]   ← Nginx ou serviço gerenciado
   │
   ▼
[Container API Node.js]           ← Docker, ECS, Cloud Run, Fly.io, etc.
   │
   ▼
[PostgreSQL gerenciado]            ← RDS, Azure DB, Neon, Supabase, Render, etc.
```

**Opções de plataforma (custo crescente):**

| Plataforma | API | Banco | Custo estimado (~10 usuários) |
|---|---|---|---|
| Render.com | Web Service (free tier) | PostgreSQL (free tier) | ~$0–7/mês |
| Railway.app | Container | PostgreSQL incluso | ~$5–10/mês |
| Fly.io | Máquina 256MB | Postgres no mesmo cluster | ~$3–7/mês |
| AWS ECS Fargate | 0.25 vCPU | RDS t3.micro | ~$20–40/mês |

**Configuração mínima (Render/Railway):**
1. Conectar repositório GitHub.
2. Definir variáveis de ambiente (ver seção 10).
3. Definir `start command: node api/server.js`.
4. Banco PostgreSQL provisionado automaticamente.

---

### 9.2 On-Premise (servidor do hospital)

**Topologia:**

```
Rede interna do hospital (Wi-Fi / LAN)
   │
   ▼
Servidor Linux (ou Windows + WSL2) com Docker
   │
   ├─ [Container: api]       Node.js API (porta 3000 interna)
   ├─ [Container: db]        PostgreSQL 15
   └─ [Container: proxy]     Nginx (porta 80/443 exposta na rede)
```

**Requisitos mínimos do servidor:**
- CPU: 2 vCPUs
- RAM: 2 GB
- Disco: 20 GB (dados + logs)
- Docker Engine 24+ e docker-compose v2
- Acesso de rede à porta 80/443 nos dispositivos

**Instalação:**
```bash
# 1. Clonar o repositório
git clone https://github.com/rogerio3921/SetupSO.git
cd SetupSO

# 2. Configurar variáveis de ambiente
cp .env.example .env
# editar .env com as senhas e chaves

# 3. Subir os serviços
docker compose up -d

# 4. Rodar migrações iniciais
docker compose exec api node -e "require('./api/knexfile').migrate.latest()"

# 5. Criar admin inicial
docker compose exec api node api/seeds/createAdmin.js

# 6. Acessar pelo navegador: http://<IP-do-servidor>/
```

**Backup do banco (on-prem):**
```bash
# Exportar backup diário
docker compose exec db pg_dump -U setupso setupso_db > backup_$(date +%Y%m%d).sql
```

---

### 9.3 docker-compose.yml (referência)

Ver arquivo `docker-compose.yml` na raiz do repositório.

---

## 10. Configuração por Variáveis de Ambiente

Ver arquivo `.env.example` na raiz do repositório.

| Variável | Descrição | Exemplo |
|---|---|---|
| `NODE_ENV` | Ambiente (`development` / `production`) | `production` |
| `PORT` | Porta da API | `3000` |
| `DB_CLIENT` | Driver do banco (`pg` ou `sqlite3`) | `pg` |
| `DATABASE_URL` | Connection string PostgreSQL | `postgres://user:pass@db:5432/setupso` |
| `SQLITE_PATH` | Caminho do arquivo SQLite (dev) | `./api/dev.db` |
| `JWT_SECRET` | Segredo para assinar tokens JWT | string aleatória longa |
| `JWT_EXPIRES_IN` | Validade do token | `8h` |
| `BCRYPT_ROUNDS` | Custo do hash (≥ 12 em produção) | `12` |
| `CORS_ORIGIN` | Origem permitida (URL do frontend) | `https://setupso.hospital.local` |
| `ADMIN_USERNAME` | Username do admin inicial (seed) | `admin` |
| `ADMIN_PASSWORD` | Senha do admin inicial (seed) | Trocar imediatamente após primeiro login |

---

## 11. Considerações de Segurança

### 11.1 Hash de senha

- **Sempre** usar `bcrypt` com custo mínimo `12`.
- Nunca armazenar ou logar senha em texto claro.
- Nunca retornar `password_hash` em respostas da API.

```javascript
// Exemplo: criar usuário
const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 12));
```

### 11.2 JWT

- O segredo (`JWT_SECRET`) deve ter no mínimo 32 caracteres aleatórios.
- Gerar com: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Tokens devem expirar em tempo razoável para um turno (`8h`).
- **Não** armazenar token em `localStorage` (vulnerável a XSS); preferir `sessionStorage` ou cookie `HttpOnly`.

### 11.3 CORS

- Definir `CORS_ORIGIN` com a URL exata do frontend.
- Não usar `*` em produção.

```javascript
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
```

### 11.4 HTTPS em produção

- **Obrigatório** em produção (cloud ou on-prem).
- Cloud: usar certificado gerenciado da plataforma (automático no Render, Railway, etc.).
- On-prem: usar Nginx + Certbot (Let's Encrypt) se o servidor tiver domínio público, ou certificado autoassinado + CA interna do hospital para rede interna.

### 11.5 Outras boas práticas para o MVP

- **Rate limiting** no endpoint de login (ex.: 10 tentativas por 5 minutos por IP).
- **Helmet.js** para headers HTTP de segurança.
- **Logs de acesso** (tentativas de login falhas, erros 5xx).
- Variáveis de ambiente e segredos **nunca** commitados no repositório (`.env` está no `.gitignore`).
- Banco de dados **não exposto** diretamente à internet — apenas a API acessa o banco.

### 11.6 Caminho para LGPD (pós-MVP)

- Pseudonimizar `full_name`, `birth_date` e outros PII do paciente com criptografia de coluna (pgcrypto) ou chave de aplicação.
- Adicionar consentimento e prazo de retenção de dados.
- Implementar `DELETE /cases/:id/patient-data` para anonimização sob demanda.

---

*Documento gerado em 2026-05-04 — SetupSO MVP 3 (Online)*
