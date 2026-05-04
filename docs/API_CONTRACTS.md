# SetupSO MVP 2 — Contratos de API (REST)

Base URL: `https://seu-servidor/api`  
Autenticação: `Authorization: Bearer <JWT>` em todos os endpoints (exceto `/auth/login`).  
Content-Type: `application/json`

---

## Autenticação (`/api/auth`)

### `POST /api/auth/login`
Autentica o colaborador e retorna um JWT.

**Request:**
```json
{
  "username": "joao.silva",
  "password": "SenhaSegura#2026"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid-v4",
    "username": "joao.silva",
    "displayName": "João Silva",
    "role": "operator"
  }
}
```

**Erros:**
| Código | Situação                          |
|--------|-----------------------------------|
| 400    | username ou password ausentes     |
| 401    | Credenciais inválidas             |
| 429    | Rate limit excedido               |

---

### `POST /api/auth/logout`
Sinaliza logout. O cliente deve descartar o token localmente.

**Response 200:**
```json
{ "message": "Logout realizado. Descarte o token no cliente." }
```

---

### `GET /api/auth/me`
Retorna os dados do usuário autenticado.

**Response 200:**
```json
{
  "id": "uuid-v4",
  "username": "joao.silva",
  "displayName": "João Silva",
  "role": "operator"
}
```

---

## Salas (`/api/rooms`)

### `GET /api/rooms`
Lista todas as salas ativas.

**Response 200:**
```json
[
  { "id": "uuid", "code": "Sala 3", "name": "Centro Cirúrgico Norte", "isActive": true, "createdAt": "2026-05-04T..." }
]
```

---

### `POST /api/rooms` _(admin)_
Cria uma nova sala.

**Request:**
```json
{ "code": "SO-01", "name": "Sala Ortopedia" }
```

**Response 201:**
```json
{ "id": "uuid", "code": "SO-01", "name": "Sala Ortopedia" }
```

---

### `GET /api/rooms/:id`
Detalhes de uma sala específica.

---

### `PATCH /api/rooms/:id` _(admin)_
Atualiza `code` e/ou `name`.

---

## Cases (`/api/cases`)

### `GET /api/cases`
Lista cases. Suporta filtros via query string.

**Query params:**
| Parâmetro | Tipo   | Exemplo          | Descrição              |
|-----------|--------|------------------|------------------------|
| roomId    | string | `uuid`           | Filtra por sala        |
| status    | string | `active`         | active / completed / cancelled |
| date      | string | `2026-05-04`     | Data de referência (ISO) |

**Response 200:**
```json
[
  {
    "id": "uuid",
    "roomId": "uuid",
    "status": "active",
    "noticeName": "AVI-12345",
    "fullName": "Maria Souza",
    "surgeonName": "Dr. Alves",
    "referenceDateISO": "2026-05-04",
    "createdByUserId": "uuid",
    "createdAt": "2026-05-04T08:00:00Z"
  }
]
```

---

### `POST /api/cases`
Cria um novo case. `createdByUserId` é preenchido automaticamente a partir do JWT.

**Request:**
```json
{
  "roomId": "uuid",
  "referenceDateISO": "2026-05-04",
  "noticeName": "AVI-12345",
  "fullName": "Maria Souza",
  "attendanceNumber": "ATD-99999",
  "surgeonName": "Dr. Alves",
  "procedureName": "Colecistectomia",
  "birthDate": "1980-03-15",
  "allergies": "Penicilina",
  "weightKg": 68.5,
  "heightCm": 162,
  "plannedSurgeryTimeHHMM": "09:30"
}
```

**Response 201:**
```json
{ "id": "uuid", "roomId": "uuid", "status": "active", "createdAt": "..." }
```

---

### `GET /api/cases/:id`
Retorna o case com todos os eventos associados.

**Response 200:**
```json
{
  "id": "uuid",
  "roomId": "uuid",
  "status": "active",
  "fullName": "Maria Souza",
  "createdByUserId": "uuid",
  "createdBy": { "displayName": "João Silva" },
  "events": [
    {
      "id": "uuid",
      "eventType": "patient_in_or",
      "action": "in",
      "eventTimestamp": "2026-05-04T09:35:00Z",
      "isManualOverride": false,
      "createdByUserId": "uuid",
      "registeredBy": "João Silva",
      "createdAt": "2026-05-04T09:35:02Z"
    }
  ]
}
```

---

### `PATCH /api/cases/:id`
Atualiza dados do paciente/aviso. Não altera status.

---

### `POST /api/cases/:id/close`
Encerra o case. `closedByUserId` é preenchido automaticamente.

**Request:**
```json
{ "isAuto": false }
```

**Response 200:**
```json
{ "message": "Case encerrado.", "closedAt": "2026-05-04T14:22:00Z" }
```

---

## Eventos (`/api/cases/:caseId/events`)

### `GET /api/cases/:caseId/events`
Lista todos os eventos de um case, em ordem cronológica.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "caseId": "uuid",
    "eventType": "surgery",
    "action": "start",
    "eventTimestamp": "2026-05-04T10:00:00Z",
    "isManualOverride": false,
    "registeredBy": "João Silva",
    "createdAt": "2026-05-04T10:00:03Z"
  }
]
```

---

### `POST /api/cases/:caseId/events`
Registra um evento. `createdByUserId` = usuário logado.

**Request:**
```json
{
  "eventType": "surgery",
  "action": "start",
  "eventTimestamp": "2026-05-04T10:00:00Z",
  "isManualOverride": false
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "caseId": "uuid",
  "eventType": "surgery",
  "action": "start",
  "registeredBy": "João Silva",
  "createdAt": "2026-05-04T10:00:03Z"
}
```

**Erros:**
| Código | Situação                                    |
|--------|---------------------------------------------|
| 400    | eventType ou action inválidos               |
| 404    | caseId não encontrado                       |
| 409    | Ação já registrada (ex: "start" duplicado)  |

---

### `DELETE /api/events/:id`
Desfaz um evento. Permitido ao próprio usuário ou a um admin.

**Response 200:**
```json
{ "message": "Evento removido." }
```

---

## Usuários (`/api/users`) _(somente admin)_

### `GET /api/users`
Lista todos os usuários (sem `passwordHash`).

### `POST /api/users`
Cria um novo colaborador.

**Request:**
```json
{
  "username": "ana.silva",
  "password": "SenhaSegura#2026",
  "displayName": "Ana Silva",
  "role": "operator"
}
```

### `PATCH /api/users/:id`
Atualiza `displayName`, `role` e/ou `password`.

### `DELETE /api/users/:id`
Desativa o usuário (`is_active = 0`). Nunca apaga fisicamente.

---

## Migração (`/api/migrate`) _(somente admin)_

### `POST /api/migrate/import`
Importa o dump JSON do localStorage para o banco. Idempotente.

**Request:** o objeto JSON salvo em `localStorage` pelo app atual:
```json
{
  "rooms": [ { "id": "room-01", "code": "Sala 3" } ],
  "cases": [ { "id": "...", "roomId": "room-01", ... } ],
  "eventsByCaseId": {
    "case-id": [ { "id": "...", "type": "surgery", "action": "start", ... } ]
  }
}
```

**Response 200:**
```json
{
  "message": "Importação concluída.",
  "casesImported": 12,
  "eventsImported": 87
}
```

---

### `GET /api/migrate/export`
Exporta todos os dados em formato compatível com o localStorage (backup).

---

## Códigos de Erro Gerais

| Código | Significado                              |
|--------|------------------------------------------|
| 400    | Requisição malformada / campo obrigatório ausente |
| 401    | Token ausente, inválido ou expirado      |
| 403    | Permissão insuficiente (ex: role != admin) |
| 404    | Recurso não encontrado                   |
| 409    | Conflito (ex: evento duplicado)          |
| 429    | Rate limit excedido                      |
| 500    | Erro interno do servidor                 |
| 501    | Endpoint ainda não implementado (scaffolding) |
