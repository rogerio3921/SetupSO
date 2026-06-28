# SetupSO — MVP Online

Sistema de acompanhamento de cirurgias com autenticação multi-hospital (multi-tenant), auditoria por usuário e sincronização em tempo real via API REST.

## Funcionalidades

- **Login multi-hospital**: tela de login com campos **Hospital**, **Usuário ou Código** e **Senha**
- **Login flexível**: aceita `username` **ou** `code` (código curto), ambos funcionam
- **Multi-tenant**: cada hospital tem seus próprios usuários, salas e dados isolados
- **Perfis**: `admin` (gerencia usuários e salas) e `colaborador` (registra eventos)
- **Auditoria**: todo evento registrado carrega `created_by_user_id` automaticamente
- **Token JWT**: autenticação stateless com expiração configurável
- **Header `X-Tenant-Slug`**: tenant enviado em todas as chamadas após o login

---

## Estrutura do projeto

```
SetupSO/
├── server/
│   ├── index.js      # API Express (auth, rooms, cases, events, users)
│   └── db.js         # SQLite (migrations + seed demo)
├── public/
│   ├── index.html    # Frontend SPA (tela de login + app principal)
│   └── app.js        # Lógica do frontend com camada de API
├── data/             # Banco SQLite (criado automaticamente, não versionar)
├── package.json
├── .env.example
└── README.md
```

---

## Como rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar ambiente

```bash
cp .env.example .env
# Edite .env se necessário (JWT_SECRET, PORT, DB_PATH)
```

### 3. Iniciar o servidor

```bash
npm start
```

Acesse: **http://localhost:3000**

O banco é criado automaticamente em `data/setupso.db` com um tenant de demonstração.

---

## Credenciais de demonstração

| Campo    | Valor             |
|----------|-------------------|
| Hospital | `demo`            |
| Usuário  | `admin`           |
| Senha    | `admin123`        |

| Campo    | Valor             |
|----------|-------------------|
| Hospital | `demo`            |
| Usuário  | `joao.silva`      |
| Código   | `JS01`            |
| Senha    | `senha123`        |

---

## Fluxo de autenticação

1. O usuário preenche **Hospital** (slug do tenant), **Usuário ou Código** e **Senha**
2. `POST /api/auth/login` valida as credenciais dentro do tenant
3. O servidor retorna um token JWT
4. O frontend armazena `token` + `tenantSlug` no `localStorage`
5. Todas as chamadas subsequentes incluem os headers:
   - Authorization: ******
   - X-Tenant-Slug: <slug>

---

## API REST

### Auth

| Método | Rota              | Descrição                                     |
|--------|-------------------|-----------------------------------------------|
| POST   | `/api/auth/login` | Login; corpo: `{tenant, usernameOrCode, password}` |
| GET    | `/api/auth/me`    | Retorna usuário autenticado (requer token)    |

### Salas

| Método | Rota                              | Descrição                          |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/rooms`                      | Lista salas do tenant              |
| POST   | `/api/rooms`                      | Cria sala (admin)                  |
| GET    | `/api/rooms/:id/active-case`      | Case ativo de uma sala             |

### Cases

| Método | Rota                         | Descrição                                  |
|--------|------------------------------|--------------------------------------------|
| GET    | `/api/cases`                 | Lista todos os cases (com eventos)         |
| POST   | `/api/cases`                 | Cria ou retorna case ativo de uma sala     |
| PATCH  | `/api/cases/:id`             | Atualiza detalhes / fases / status         |
| GET    | `/api/cases/:id/events`      | Lista eventos de um case                   |
| POST   | `/api/cases/:id/events`      | Registra evento (auditoria automática)     |

### Eventos

| Método | Rota                  | Descrição              |
|--------|-----------------------|------------------------|
| DELETE | `/api/events/:id`     | Remove evento (undo)   |

### Usuários (admin)

| Método | Rota               | Descrição                                       |
|--------|--------------------|-------------------------------------------------|
| GET    | `/api/users`       | Lista usuários do tenant                        |
| POST   | `/api/users`       | Cria usuário (requer `name`, `password` + `username` e/ou `code`) |
| PATCH  | `/api/users/:id`   | Atualiza usuário (nome, código, senha, papel)   |

### Tenants

| Método | Rota             | Descrição                                     |
|--------|------------------|-----------------------------------------------|
| POST   | `/api/tenants`   | Cria novo hospital com admin inicial          |

---

## Modelo de dados (SQLite)

```sql
tenants  (id, slug UNIQUE, name, active, created_at)
users    (id, tenant_id, name, username, code, password_hash, role, active, created_at)
         -- UNIQUE(tenant_id, username), UNIQUE(tenant_id, code)
rooms    (id, tenant_id, code, active, created_at)
cases    (id, tenant_id, room_id, code, status, patient_phase, room_phase, data_json, created_at, created_by_user_id)
events   (id, tenant_id, case_id, event_key, action, happened_at, auto, created_at, created_by_user_id)
```

---

## Deploy

### Docker Compose (recomendado para on-prem e cloud)

```yaml
# docker-compose.yml (exemplo)
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      JWT_SECRET: sua-chave-secreta-longa
      PORT: 3000
      DB_PATH: /data/setupso.db
    volumes:
      - ./data:/data
```

### Variáveis de ambiente

| Variável        | Padrão                              | Descrição                        |
|-----------------|-------------------------------------|----------------------------------|
| `PORT`          | `3000`                              | Porta HTTP                       |
| `JWT_SECRET`    | `dev-secret-troque-em-producao`     | Chave de assinatura JWT          |
| `JWT_EXPIRES_IN`| `8h`                                | Expiração do token               |
| `DB_PATH`       | `./data/setupso.db`                 | Caminho do banco SQLite          |

> **Produção**: sempre defina `JWT_SECRET` com um valor longo e aleatório.

---

## Criar novo hospital (multi-tenant)

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "hospital-abc",
    "name": "Hospital ABC",
    "adminName": "Administrador",
    "adminUsername": "admin",
    "adminPassword": "senha-segura"
  }'
```
