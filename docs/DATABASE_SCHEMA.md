# SetupSO MVP 2 — Schema do Banco de Dados

O arquivo SQL completo está em [`server/db/schema.sql`](../server/db/schema.sql).
Esta documentação descreve cada tabela, campo e relacionamento.

---

## Visão Geral (Diagrama ER)

```
users
  │
  ├── cases.created_by_user_id ──► cases ──► rooms
  ├── cases.closed_by_user_id  ──► │
  │                                │
  ├── events.created_by_user_id ──►└──► events
  │
  └── import_log.imported_by ──► import_log
```

---

## Tabela: `users`

Colaboradores que acessam o sistema. Nunca apagados fisicamente.

| Coluna          | Tipo    | Restrições                          | Descrição                              |
|-----------------|---------|-------------------------------------|----------------------------------------|
| `id`            | TEXT    | PK                                  | UUID v4                                |
| `username`      | TEXT    | NOT NULL, UNIQUE                    | Login único (ex.: "joao.silva")        |
| `password_hash` | TEXT    | NOT NULL                            | Hash bcrypt (rounds ≥ 12)              |
| `display_name`  | TEXT    | NOT NULL                            | Nome exibido na UI e relatórios        |
| `role`          | TEXT    | DEFAULT 'operator', CHECK(...)      | "admin" ou "operator"                  |
| `is_active`     | INTEGER | DEFAULT 1                           | 0 = desativado (soft-delete)           |
| `created_at`    | TEXT    | NOT NULL                            | ISO 8601                               |
| `updated_at`    | TEXT    | NOT NULL                            | ISO 8601                               |

**Notas:**
- `passwordHash` nunca é retornado pela API.
- Desativar um usuário (`is_active = 0`) não apaga seu histórico de eventos.
- O primeiro usuário admin é criado automaticamente pelo script `migrate.js`.

---

## Tabela: `rooms`

Salas cirúrgicas / centros cirúrgicos.

| Coluna       | Tipo    | Restrições              | Descrição                         |
|--------------|---------|-------------------------|-----------------------------------|
| `id`         | TEXT    | PK                      | UUID v4                           |
| `code`       | TEXT    | NOT NULL, UNIQUE        | Código curto (ex.: "Sala 3")      |
| `name`       | TEXT    |                         | Nome completo (opcional)          |
| `is_active`  | INTEGER | DEFAULT 1               | 0 = sala desativada               |
| `created_at` | TEXT    | NOT NULL                | ISO 8601                          |
| `updated_at` | TEXT    | NOT NULL                | ISO 8601                          |

---

## Tabela: `cases`

Cada procedimento cirúrgico ligado a uma sala.

| Coluna                      | Tipo    | Restrições              | Descrição                                    |
|-----------------------------|---------|-------------------------|----------------------------------------------|
| `id`                        | TEXT    | PK                      | UUID v4                                      |
| `room_id`                   | TEXT    | FK → rooms.id           | Sala onde ocorreu                            |
| `status`                    | TEXT    | CHECK(...)              | "active" / "completed" / "cancelled"         |
| `notice_name`               | TEXT    |                         | Aviso cirúrgico (código/nome do HIS)         |
| `full_name`                 | TEXT    |                         | Nome completo do paciente                    |
| `attendance_number`         | TEXT    |                         | Número de atendimento (MV/Tasy/etc.)         |
| `surgeon_name`              | TEXT    |                         | Nome do cirurgião principal                  |
| `procedure_name`            | TEXT    |                         | Descrição do procedimento                    |
| `birth_date`                | TEXT    |                         | Data de nascimento (YYYY-MM-DD)              |
| `allergies`                 | TEXT    |                         | Texto livre de alergias (exibe banner)       |
| `weight_kg`                 | REAL    |                         | Peso em kg                                   |
| `height_cm`                 | REAL    |                         | Altura em cm                                 |
| `planned_surgery_time_hhmm` | TEXT    |                         | Previsão de início da cirurgia (HH:MM)       |
| `reference_date_iso`        | TEXT    | NOT NULL                | Data do procedimento (YYYY-MM-DD)            |
| `is_auto`                   | INTEGER | DEFAULT 0               | 1 = encerrado por regra automática           |
| **`created_by_user_id`**    | TEXT    | FK → users.id           | **Auditoria: quem abriu o case**             |
| **`closed_by_user_id`**     | TEXT    | FK → users.id, nullable | **Auditoria: quem encerrou o case**          |
| `created_at`                | TEXT    | NOT NULL                | ISO 8601                                     |
| `updated_at`                | TEXT    | NOT NULL                | ISO 8601                                     |
| `closed_at`                 | TEXT    | nullable                | ISO 8601, preenchido ao encerrar             |

**Índices:**
- `idx_cases_room_status` → consultas por sala + status (tela principal)
- `idx_cases_reference_date` → relatórios por data

---

## Tabela: `events`

Registro cronológico de cada ação em um case. **Principal tabela de auditoria.**

| Coluna                   | Tipo    | Restrições              | Descrição                                         |
|--------------------------|---------|-------------------------|---------------------------------------------------|
| `id`                     | TEXT    | PK                      | UUID v4                                           |
| `case_id`                | TEXT    | FK → cases.id, CASCADE  | Case ao qual pertence                             |
| `event_type`             | TEXT    | NOT NULL                | Chave do EVENT_TYPES (ex.: "surgery", "rpa")      |
| `action`                 | TEXT    | CHECK(...)              | "in" / "out" / "start" / "end"                    |
| `event_timestamp`        | TEXT    | NOT NULL                | Momento real do evento (ISO 8601)                 |
| `is_manual_override`     | INTEGER | DEFAULT 0               | 1 = usuário editou manualmente o horário          |
| **`created_by_user_id`** | TEXT    | FK → users.id, nullable | **Auditoria: quem registrou o evento**            |
| `created_at`             | TEXT    | NOT NULL                | Momento em que o registro foi criado no banco     |

**Campo de auditoria chave:** `created_by_user_id`
- Preenchido automaticamente com o ID do usuário autenticado no momento do clique.
- `NULL` apenas para dados importados do localStorage (legado).
- Permite responder: "Quem registrou a entrada do paciente na SO às 09:35?"

**Índices:**
- `idx_events_case_id` → listagem de eventos por case
- `idx_events_event_type` → análise por tipo de evento
- `idx_events_created_by` → relatórios de auditoria por colaborador

---

## Tabela: `import_log`

Rastreia cada importação do localStorage para o banco.

| Coluna            | Tipo    | Descrição                                  |
|-------------------|---------|--------------------------------------------|
| `id`              | TEXT    | UUID v4                                    |
| `imported_by`     | TEXT    | FK → users.id, quem executou o import      |
| `source_device`   | TEXT    | User-agent do dispositivo de origem        |
| `imported_at`     | TEXT    | ISO 8601                                   |
| `cases_imported`  | INTEGER | Quantidade de cases criados                |
| `events_imported` | INTEGER | Quantidade de eventos criados              |
| `raw_payload`     | TEXT    | JSON original (para auditoria/reversão)    |

---

## Considerações de Migração para PostgreSQL

Se no futuro o volume crescer e SQLite não for suficiente:

1. Os tipos `TEXT` para PKs (UUID) e datas (ISO 8601) são compatíveis com Postgres.
2. `INTEGER` (0/1) vira `BOOLEAN`.
3. `REAL` vira `NUMERIC` ou `FLOAT8`.
4. Os `CHECK constraints` são idênticos.
5. `ON DELETE CASCADE` é suportado.
6. Apenas a sintaxe de `PRAGMA` é específica do SQLite; basta remover.
