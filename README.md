# SetupSO
Setup de tempos e movimentos em Centro Cirurgico
# Setup de Sala — Frontend (Demo)

Projeto demo em React + Vite + TypeScript + Tailwind para o "Setup de Sala" — inclui TabletView (fluxo de botões) e DashboardView (KPIs simples). Usa mock API baseado em localStorage.

Pré-requisitos
- Node 18+
- npm ou pnpm

Como rodar
1. Instalar dependências:
   npm install

2. Rodar em desenvolvimento:
   npm run dev
   (Abre em http://localhost:5173)

O que está implementado
- TabletView:
  - Pares de botões lado-a-lado conforme solicitado:
    - Entrada Paciente / Saída Paciente
    - Início Anestesia / Fim Anestesia
    - Início Procedimento / Fim Procedimento
    - Entrada CME / Saída CME
    - Entrada Limpeza / Saída Limpeza
  - Regras client-side:
    - Entrada Limpeza habilitada apenas se já existir Saída Paciente.
    - Saída CME habilitada apenas se houve Entrada CME.
  - Eventos são persistidos em localStorage (mock API via src/services/eventsService.ts).
- DashboardView:
  - Exibe KPIs demo e lista de eventos gravados.

Como trocar para backend real
- Substitua as funções de eventsService.createEvent e getEvents por chamadas HTTP para seu endpoint (por exemplo, POST /api/v1/events).
- Adicione autenticação (JWT) e passe headers de tenant/user conforme backend.

Próximos passos recomendados
- Substituir localStorage por IndexedDB (localForage) para robustez offline.
- Implementar optimistic updates e fila de sincronização.
- Integrar WebSocket para atualizações em tempo real.
- Adicionar testes unitários e E2E.

Se quiser, eu já:
- converto o mock para chamadas reais ao seu backend esqueleto; ou
- adiciono offline-sync (localForage) e client_event_id; ou
- adiciono WebSocket mock para demo em tempo real.

Diz qual próximo passo prefere e eu prossigo.
