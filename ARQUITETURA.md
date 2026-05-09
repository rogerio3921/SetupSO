# 🏗️ Estrutura de Diretórios - SetupSO v2

```
SetupSO/
│
├─ 📦 backend/                      ← Node.js + Express + Prisma
│  ├─ src/
│  │  └─ server.ts                  ✅ API principal com todos endpoints
│  ├─ prisma/
│  │  ├─ schema.prisma              ✅ Modelo de dados completo
│  │  └─ seed.ts                    ✅ Dados iniciais (rooms, status, config)
│  ├─ package.json                  ✅ Dependências backend
│  ├─ tsconfig.json                 ✅ Configuração TypeScript
│  ├─ Dockerfile                    ✅ Build container backend
│  ├─ .env.example                  ✅ Variáveis de ambiente
│  └─ .gitignore
│
├─ 🎨 frontend/                     ← React + Tailwind
│  ├─ src/
│  │  ├─ App.tsx                    ✅ Componente principal com grid de salas
│  │  ├─ index.tsx                  ✅ Entry point React
│  │  ├─ App.css                    ✅ Estilos globais
│  │  └─ index.css                  ✅ Tailwind imports
│  ├─ public/
│  │  └─ index.html                 ✅ Template HTML
│  ├─ package.json                  ✅ Dependências frontend
│  ├─ tailwind.config.js            ✅ Configuração Tailwind
│  ├─ postcss.config.js             ✅ PostCSS + autoprefixer
│  ├─ Dockerfile                    ✅ Build container frontend
│  ├─ .env.development              ✅ Variáveis desenvolvimento
│  └─ .gitignore
│
├─ 🐳 docker/
│  └─ init.sql                      ✅ Inicialização MySQL
│
├─ 📜 docker-compose.yml            ✅ Orquestração (3 containers)
├─ 📋 README.md                     ✅ Documentação principal
├─ 📋 REQUISITOS.md                 ✅ Requisitos funcionais/não-funcionais
├─ 📋 ARQUITETURA.md                ✅ Este documento
│
├─ 📂 .git/                         (Git repository)
├─ 📄 index8.html                   (Código legacy - referência)
└─ 📄 app.js                        (Código legacy - referência)
```

---

## 🎯 O Que Foi Criado

### ✅ 1. Backend API (4008)
```
Endpoints criados:
├─ GET  /api/health              ← Health check
├─ GET  /api/rooms               ← Listar salas
├─ POST /api/rooms               ← Criar sala
├─ GET  /api/cases               ← Listar cases
├─ GET  /api/rooms/:roomId/case  ← Get/criar case ativo
├─ PATCH /api/cases/:caseId      ← Atualizar case
├─ POST /api/events              ← Registrar evento
├─ GET  /api/cases/:caseId/events ← Listar eventos
├─ GET  /api/users               ← Listar usuários
├─ POST /api/users               ← Criar usuário
├─ GET  /api/status-legends      ← Legendas de status
├─ POST /api/status-legends      ← Criar legenda
└─ GET  /api/card-config         ← Configuração de campos
```

### ✅ 2. Banco de Dados (3308)
```
Tabelas criadas:
├─ users              ← Usuários da enfermagem
├─ rooms              ← Salas cirúrgicas
├─ cases              ← Cases cirúrgicos
├─ events             ← Eventos de entrada/saída
├─ status_legends     ← Legendas customizáveis
└─ card_configs       ← Configuração de panei
```

### ✅ 3. Frontend React (3008)
```
Componentes implementados:
├─ App.tsx            ← Layout principal
│  ├─ Header          ← Logo e navegação
│  ├─ Rooms Grid      ← Cards de salas
│  ├─ Room Detail     ← Detalhes do case ativo
│  └─ Conexão API     ← Busca dados via Axios
└─ Styling           ← Tailwind CSS completo
```

### ✅ 4. Containerização
```
Serviços Docker:
├─ db              MySQL 8.0 (porta 3308)
│  └─ Volume: mysql_data
├─ backend         Node.js (porta 4008)
│  └─ Healthcheck + Prisma migrations
├─ frontend        React (porta 3008)
│  └─ Build otimizado multi-stage
└─ network         Bridge comum (setupso-network)
```

---

## 📊 Porta Mapeamento

| Serviço | Porta Interna | Porta Externa | URL |
|---------|---------------|---------------|-----|
| Frontend | 3000 | **3008** | http://localhost:3008 |
| Backend | 4000 | **4008** | http://localhost:4008/api |
| MySQL | 3306 | **3308** | localhost:3308 |

---

## 🔄 Fluxo de Dados

```
┌─────────────────────┐
│   Frontend React    │
│   (port 3008)       │
└──────────┬──────────┘
           │
           │ HTTP/JSON
           │ Axios
           ▼
┌─────────────────────┐
│  Backend Express    │
│   (port 4008)       │
│  + Prisma ORM       │
└──────────┬──────────┘
           │
           │ SQL
           │
           ▼
┌─────────────────────┐
│   MySQL Database    │
│   (port 3308)       │
└─────────────────────┘
```

---

## 🚀 Como Usar

### Opção 1: Docker Compose (Recomendado)

```bash
# Ir para o diretório do projeto
cd /home/william/Documentos/Projects\ Will/SetupSO

# Subir todos os containers
docker-compose up --build

# Aguardar até ver:
# ✓ db container iniciado
# ✓ backend container iniciado
# ✓ frontend container iniciado

# Acessar:
# Frontend:  http://localhost:3008
# Backend:   http://localhost:4008/api/health
# MySQL:     localhost:3308 (via MySQL client)
```

### Opção 2: Desenvolvimento Local

#### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev  # rodar em localhost:4000
```

#### Frontend
```bash
cd frontend
npm install
npm start  # rodar em localhost:3000
```

---

## 📦 Modelos de Dados

### User
```typescript
{
  id: string
  email: string (unique)
  fullName: string
  badgeNumber: string (unique)
  corenNumber?: string
  department: string
  function: string // Auxiliar, Técnico, Enfermeiro
  role: string // Admin, User
  password: string
}
```

### Room
```typescript
{
  id: string
  code: string (unique)  // "Sala 1", "Sala 2"
  name: string           // "Sala de Cirurgia 1"
  capacity: number
}
```

### Case
```typescript
{
  id: string
  roomId: string (FK)
  code: string           // "Sala1-2026-05-09-01"
  status: "active" | "closed"
  
  // Paciente
  patientFullName?: string
  noticeNumber?: string
  procedureName?: string
  surgeonName?: string
  attendanceNumber?: string
  birthDate?: string
  allergies?: string
  weightKg?: string
  heightCm?: string
  
  // Timing
  plannedSurgeryTime?: string
  referenceDate?: string
  patientPhase: "open" | "closed"
  roomPhase: "open" | "closed"
}
```

### Event
```typescript
{
  id: string
  caseId: string (FK)
  userId?: string (FK)
  eventKey: string       // "anesthesia_team", "surgery", etc
  action: "start" | "end" | "in" | "out"
  happenedAt: DateTime
  createdAt: DateTime
  auto: boolean          // Fechamento automático?
}
```

### StatusLegend
```typescript
{
  id: string
  status: string (unique)  // "LIBERADO", "EM_PREPARO"
  color: string            // "#10b981"
  label: string            // "Sala liberada"
}
```

### CardConfig
```typescript
{
  id: string
  fieldName: string
  label: string
  visible: boolean
  order: number
}
```

---

## 🔌 Integração Entre Serviços

### Backend → Frontend
- Frontend busca dados via REST API (`/api/rooms`, `/api/cases`)
- Requisições via Axios
- Auto-refresh a cada 5 segundos (no App.tsx)

### Backend → Database
- Prisma ORM gerencia queries
- Migrations automáticas com Docker
- Seed inicial com data padrão

### Docker Compose
- Coordena 3 containers
- Network bridge compartilhada
- Healthcheck no MySQL antes de rodar backend

---

## 📝 Próximas Implementações

1. **Autenticação JWT**
   - Login/logout endpoints
   - Token validation middleware
   
2. **Componentes React Expandidos**
   - Room detail view
   - Event list e buttons
   - Modal para editar dados do paciente
   
3. **Dashboard TV**
   - View com refresh automático
   - KPIs em tempo real
   - Tabela de salas
   
4. **Relatórios**
   - Exportação PDF/Excel
   - Filtros avançados
   
5. **WebSockets**
   - Real-time updates
   - Broadcast de eventos
   
6. **Mobile**
   - React Native app

---

## ✅ Checklist de Setup

- [ ] Docker & Docker Compose instalados
- [ ] Clonar/baixar o projeto
- [ ] Executar `docker-compose up --build`
- [ ] Aguardar containers iniciarem
- [ ] Acessar http://localhost:3008
- [ ] Testar GET /api/health → OK

---

**Data de Criação**: 2026-05-09  
**Status**: MVP 1.0 Completo ✅
