# 🗓️ SetupSO - Roadmap Detalhado (2 Sprints)

## 📊 Visão Geral

```
Sprint 1 (MVP)     ✅ COMPLETO
├─ Frontend React
├─ Backend Express
├─ MySQL Database
└─ Docker Compose

Sprint 2           🔄 EM IMPLEMENTAÇÃO
├─ JWT Autenticação ✅ Implementado
├─ Login/Register UI (Em progresso)
├─ Proteção de rotas
└─ Controle de permissões

Sprint 3           📋 PLANEJADO
├─ Interface Avançada
├─ Dashboard TV Completo
├─ Timeline visual
└─ KPIs em tempo real

Sprint 4           📋 PLANEJADO
├─ Checklists Cirúrgicos
├─ Alertas em Tempo Real
├─ Notificações Push
└─ WebSockets

Sprint 5           📋 PLANEJADO
├─ Mobile (React Native)
├─ Integração PEP (HIS)
├─ Integração CME
└─ Integração Farmácia
```

---

## 🚀 Sprint 2: Autenticação JWT (ATUAL)

### ✅ O que foi feito

#### Backend
- [x] Arquivo `auth.ts` com funções JWT
  - `generateToken()` - Cria JWT
  - `verifyToken()` - Valida JWT
  - `authMiddleware` - Protege rotas
  - `roleMiddleware` - Valida permissões
  - `hashPassword()` - Criptografa senha
  - `comparePasswords()` - Valida senha

- [x] Arquivo `routes/auth.ts` com endpoints
  - `POST /auth/register` - Registra novo usuário
  - `POST /auth/login` - Login com email/senha
  - `POST /auth/logout` - Logout
  - `GET /auth/me` - Dados do usuário logado

- [x] Atualizado `server.ts`
  - Proteção de rotas com `authMiddleware`
  - Controle de admin com `roleMiddleware`
  - Rota de autenticação integrada

- [x] Dependências adicionadas
  - `jsonwebtoken` - JWT
  - `bcryptjs` - Hash de senhas

#### Frontend
- [x] Componente `Login.tsx`
  - Form de login/registro
  - Validação de campos
  - Armazenamento de token no localStorage
  - Tratamento de erros

- [x] Atualizado `App.tsx`
  - Verificação de autenticação
  - Logout com limpeza de dados
  - Header com dados do usuário
  - Envio de token em requisições

### 📋 Próximas tarefas (Sprint 2)

- [ ] Refresh token endpoint
- [ ] Session persistence (token refresh automático)
- [ ] Password reset flow
- [ ] Email verification
- [ ] 2FA (Two-Factor Authentication)
- [ ] Audit log para logins/logouts

---

## 🎨 Sprint 3: Interface Avançada + Dashboard TV

### Funcionalidades Planejadas

#### Advanced Room Detail (Componente novo)
```
Header da Sala
├─ Informações do paciente
├─ Status atual
├─ Horários (previsto vs real)
└─ Equipe responsável

Timeline Visual
├─ Eventos em ordem cronológica
├─ Duração de cada etapa
├─ Comparação com previsto
└─ Identificação de atrasos

Eventos Interativos
├─ Botões para registrar entrada/saída
├─ Validações em tempo real
├─ Confirmação de ações críticas
└─ Undo (desfazer última ação)

KPIs Dashboard
├─ Tempo em SO (ao vivo)
├─ Tempo de cirurgia
├─ Tempo de anestesia
├─ Total de transporte
└─ Estimativa de conclusão
```

#### Dashboard TV Melhorado
```
Visualização Múltiplas Salas
├─ Grid com uma linha por sala
├─ Status colorido por legenda
├─ Duração em tempo real
├─ Alertas de atraso
└─ Indicador de progresso

KPIs Agregados
├─ Média de tempos
├─ Total de casos
├─ % com RPA.in
├─ % com RPA.out
└─ Auto-closures por caso

Filtros e Buscas
├─ Filtrar por sala
├─ Filtrar por cirurgião
├─ Filtrar por status
└─ Timeline (últimas 24h)
```

### Tarefas Sprint 3

- [ ] Componente `RoomDetail.tsx` (avançado)
- [ ] Componente `Timeline.tsx` (visual)
- [ ] Componente `EventButton.tsx` (interativo)
- [ ] Componente `DashboardTV.tsx` (melhorado)
- [ ] Componente `KPICard.tsx` (reutilizável)
- [ ] Hook `useRealtimeUpdates()` (WebSockets prep)
- [ ] Integrar Tailwind com cores dinâmicas
- [ ] Testes unitários

### Estimativa: 2 semanas

---

## 📋 Sprint 4: Checklists + Alertas em Tempo Real

### Funcionalidades Planejadas

#### Checklists Cirúrgicos
```
Modelo de Dados
├─ ChecklistTemplate (modelo padrão)
├─ ChecklistInstance (instância por caso)
├─ ChecklistItem (itens com validação)
└─ ChecklistResponse (respostas)

Interface
├─ Modal de checklist
├─ Itens com checkbox/radio/textarea
├─ Bloqueio progressivo (só avança com validação)
├─ Assinatura digital
└─ Histórico de resposta

Automação
├─ Checklist obrigatório antes de cirurgia
├─ Integração com eventos (auto-completa itens)
├─ Validação cruzada com CME/Farmácia
└─ Notificação se pendências
```

#### Alertas em Tempo Real
```
Tipos de Alertas
├─ Atraso na chegada (> 5min)
├─ Tempo de SO excessivo (> 4h)
├─ Checklist pendente
├─ Recurso não disponível (CME/Farmácia/Eng)
├─ Equipe ausente
└─ Anomalia de timing

Sistema de Notificações
├─ Toast in-app
├─ Notificação push (browser)
├─ Email (opcional)
├─ SMS (futuro)
└─ Integração com buzzer hospital

Dashboard de Alertas
├─ Fila de alertas
├─ Prioridade (critica/alta/média/baixa)
├─ Ação recomendada
└─ Histórico
```

### Tarefas Sprint 4

- [ ] Schemas Prisma para Checklists
- [ ] Endpoints CRUD para Checklists
- [ ] Componente `ChecklistModal.tsx`
- [ ] Sistema de alertas no backend
- [ ] WebSocket para broadcast de alertas
- [ ] Componente `AlertCenter.tsx`
- [ ] Integração com Service Workers (PWA)
- [ ] Testes de stress (múltiplos alertas)

### Estimativa: 3 semanas

---

## 📱 Sprint 5: Mobile + Integrações

### Funcionalidades Planejadas

#### Mobile App (React Native)
```
Estrutura
├─ Reusa lógica do backend
├─ Interface otimizada para touch
├─ Sincronização offline
└─ Notificações nativas

Funcionalidades
├─ Login/autenticação
├─ Lista de salas/cases
├─ Registrar eventos
├─ Receber alertas
├─ Checklist mobile
└─ Relatórios básicos
```

#### Integração PEP (HIS)
```
Dados Sincronizados
├─ Pacientes (nome, data nasc, etc)
├─ Procedimentos
├─ Cirurgiões
├─ Agendamento
└─ Faturamento

Endpoints PEP
├─ GET /pacientes/:id
├─ GET /procedimentos
├─ GET /cirurgioes
├─ POST /faturamento
└─ GET /agendamento

Sincronização
├─ Batch sync (daily)
├─ Real-time events (webhooks)
├─ Tratamento de conflitos
└─ Retry automático
```

#### Integração CME
```
Rastreabilidade
├─ Entrada de caixas
├─ Saída de caixas
├─ Histórico de uso
└─ Estéril vs reutilizável

Endpoints CME
├─ GET /caixas/:id
├─ POST /caixas/:id/entrada
├─ POST /caixas/:id/saida
└─ GET /caixas/historico

Validação
├─ Verifique se caixa está estéril
├─ Alerta se instrumental faltando
├─ Bloqueio de cirurgia se CME pendente
└─ Rastreamento automático
```

### Tarefas Sprint 5

- [ ] Setup React Native
- [ ] Compartilhamento de código (monorepo)
- [ ] Integração PEP (OAuth2/API Key)
- [ ] Integração CME (REST/SOAP)
- [ ] Sincronização de dados
- [ ] Webhooks para eventos externos
- [ ] Testes de integração
- [ ] Documentação de API (OpenAPI/Swagger)

### Estimativa: 4 semanas

---

## 🛠️ Tecnologias Necessárias

### Sprint 2 (JWT) - ✅ Já adicionadas
- `jsonwebtoken` - JWT token generation
- `bcryptjs` - Password hashing

### Sprint 3 (Interface)
- `react-icons` - Ícones
- `framer-motion` - Animações
- `recharts` - Gráficos

### Sprint 4 (Checklists + Alertas)
- `socket.io` - WebSockets
- `react-toastify` - Toast notifications
- `comlink` - Web Workers (performance)

### Sprint 5 (Mobile + Integrações)
- `react-native` - Mobile framework
- `axios` - HTTP client
- `oauth2-fetch` - OAuth2 handling
- `graphql` - Para queries complexas (futuro)

---

## 📈 Métricas de Sucesso

### Sprint 2
- [ ] 100% de endpoints autenticados
- [ ] 0 requests sem token
- [ ] Password strength requirements
- [ ] Logs de autenticação

### Sprint 3
- [ ] Dashboard TV renderiza < 1s
- [ ] KPIs atualizam em tempo real
- [ ] 0 erros de layout responsivo
- [ ] Accessibility score > 90

### Sprint 4
- [ ] Alertas chegam < 3s
- [ ] Checklist completo < 5min
- [ ] 99.9% uptime do WebSocket
- [ ] 0 alertas duplicados

### Sprint 5
- [ ] App Mobile < 50MB
- [ ] Offline sync 100% confiável
- [ ] Integração PEP < 500ms latência
- [ ] 95% dados sincronizados

---

## 🎯 Timeline Estimado

```
Sprint 2 (JWT)              1 semana  (5 dias)   ← ATUAL
Sprint 3 (Interface)        2 semanas (10 dias)
Sprint 4 (Checklists)       3 semanas (15 dias)
Sprint 5 (Mobile)           4 semanas (20 dias)

TOTAL                       10 semanas (50 dias úteis)
                            ~3 meses de desenvolvimento
```

---

## 📝 Documentação a Criar

- [ ] API Documentation (OpenAPI/Swagger)
- [ ] Mobile Dev Guide
- [ ] Integration Guide (PEP, CME)
- [ ] Deployment Guide (Kubernetes)
- [ ] Security Whitepaper
- [ ] Performance Benchmarks

---

## ✅ Checklist Sprint 2

- [x] JWT auth implementation
- [x] Login/Register UI
- [x] Protected routes
- [x] Token storage
- [ ] Refresh token endpoint
- [ ] Password reset
- [ ] Email verification
- [ ] Audit logging

**Status Sprint 2**: ~40% Completo

---

**Roadmap Versão**: 1.0  
**Data**: 9 de maio de 2026  
**Próxima Atualização**: Após Sprint 2 completo
