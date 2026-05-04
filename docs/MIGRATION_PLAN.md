# SetupSO MVP 2 — Plano de Migração (localStorage → API)

Este documento descreve como migrar os dados históricos armazenados localmente
em cada dispositivo para o banco de dados central, sem perda de informação.

---

## Situação Atual

- **Onde os dados estão:** `localStorage` de cada navegador, chave `setupso_mvp2_state_ultra_robust_20260502_1105`
- **Formato:** JSON com a estrutura `{ rooms, cases, eventsByCaseId }`
- **Problema:** Dados isolados por dispositivo; sem auditoria de usuário; sem sincronização

---

## Estratégia de Migração

### Fase 1 — Exportar o dump do localStorage

No navegador de cada dispositivo, o administrador abre o Console (F12) e executa:

```javascript
// Exportar dados locais para arquivo JSON
const key = "setupso_mvp2_state_ultra_robust_20260502_1105";
const data = localStorage.getItem(key);
const blob = new Blob([data || "{}"], { type: "application/json" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "setupso_export_" + new Date().toISOString().slice(0,10) + ".json";
a.click();
```

**Alternativa (futura):** adicionar botão "Exportar backup JSON" na interface do app.

---

### Fase 2 — Importar via API (uma vez por dispositivo)

Com o backend rodando, o administrador autenticado envia o arquivo exportado:

```bash
# Exemplo com curl
curl -X POST https://seu-servidor/api/migrate/import \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d @setupso_export_2026-05-04.json
```

Ou via interface web (upload de arquivo → POST automático).

**A rota `/api/migrate/import` é idempotente:** pode ser executada várias vezes
sem duplicar dados (usa `INSERT OR IGNORE` baseado no `id` do case/evento).

---

### Fase 3 — Validação

Após a importação:

1. Conferir contagem: `GET /api/cases?date=YYYY-MM-DD` vs. registros locais.
2. Conferir eventos: `GET /api/cases/:id` e comparar com o JSON exportado.
3. Verificar `import_log` para confirmar que o import foi registrado.

---

### Fase 4 — Transição do Frontend

Após confirmar que os dados históricos estão no banco:

1. Atualizar `app.js` para usar a API REST em vez de `localStorage`:
   - `loadState()` → `GET /api/cases?roomId=...&status=active`
   - `addEvent()` → `POST /api/cases/:id/events`
   - `saveState()` → chamadas PATCH automáticas
2. Adicionar tela de login (formulário HTML simples → `POST /api/auth/login`).
3. Armazenar o JWT em `sessionStorage` (não em `localStorage`; evita acesso por outros scripts).
4. Adicionar header `Authorization: Bearer <token>` em todas as chamadas `fetch`.

**Compatibilidade retroativa:** durante a transição, o app pode operar em modo híbrido:
- Se a API responder → usar API.
- Se a API não responder (rede cai) → cair de volta para localStorage com banner de aviso.

---

## Mapeamento de Campos (localStorage → Banco)

| Campo no localStorage | Campo no banco          | Observação                                   |
|-----------------------|-------------------------|----------------------------------------------|
| `case.id`             | `cases.id`              | Mantido como PK                              |
| `case.roomId`         | `cases.room_id`         | Deve existir na tabela `rooms`               |
| `case.data.fullName`  | `cases.full_name`       |                                              |
| `case.data.noticeName`| `cases.notice_name`     |                                              |
| `case.status`         | `cases.status`          | "active" / "completed"                       |
| `case.isAuto`         | `cases.is_auto`         | 0 ou 1                                       |
| `event.id`            | `events.id`             | Mantido como PK                              |
| `event.type`          | `events.event_type`     |                                              |
| `event.action`        | `events.action`         | "in"/"out"/"start"/"end"                     |
| `event.ts`            | `events.event_timestamp`| ISO 8601                                     |
| `event.manual`        | `events.is_manual_override` |                                          |
| _(não existia)_       | `events.created_by_user_id` | `NULL` para registros legados            |
| _(não existia)_       | `cases.created_by_user_id`  | `NULL` para registros legados            |

---

## Riscos e Mitigações

| Risco                                              | Mitigação                                                        |
|----------------------------------------------------|------------------------------------------------------------------|
| Dados duplicados de múltiplos dispositivos         | `INSERT OR IGNORE` + IDs únicos gerados pelo frontend (UUID)    |
| Conflito de `roomId` (IDs locais vs. banco)        | Criar as salas no banco antes do import; mapear por `code`      |
| Dados corrompidos no localStorage                  | `try/catch` no parser; `import_log` guarda o payload original   |
| Usuário apaga o localStorage antes de exportar     | Avisar e forçar export antes de migrar o frontend               |
| Rede cai durante uso                               | Modo híbrido localStorage + API com banner de aviso             |

---

## Checklist de Migração (por Unidade/Centro Cirúrgico)

- [ ] Backend rodando e acessível na rede
- [ ] Usuário admin criado (`npm run db:migrate`)
- [ ] Admin autenticado e com token válido
- [ ] Exportar JSON de cada dispositivo (via Console ou botão)
- [ ] Importar via `POST /api/migrate/import` (um arquivo por dispositivo)
- [ ] Validar contagens no banco vs. exportados
- [ ] Atualizar o `app.js` para usar a API (substituir `loadState`/`saveState`)
- [ ] Treinar colaboradores no novo fluxo de login
- [ ] Monitorar logs por 1 semana (erros 401/403/500)
