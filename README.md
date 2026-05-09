# SetupSO - Sistema de Gestão de Tempos e Movimentos

## 📋 Estrutura do Projeto

```
SetupSO/
├── backend/                    # Node.js + Express + Prisma
│   ├── src/
│   │   └── server.ts          # Main API server
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Database seeding
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/                   # React + Tailwind
│   ├── src/
│   │   ├── App.tsx            # Main component
│   │   └── index.tsx          # Entry point
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.development
├── docker/
│   └── init.sql               # Database initialization
├── docker-compose.yml         # Orchestration
└── README.md
```

## 🚀 Portas

- **Frontend (React)**: `3008` (externa) → `3000` (interna)
- **Backend (Express)**: `4008` (externa) → `4000` (interna)
- **Database (MySQL)**: `3308` (externa) → `3306` (interna)

## 📦 Stack Tecnológico

### Backend
- **Node.js** com Express.js
- **TypeScript** para type safety
- **Prisma** como ORM
- **MySQL** como banco de dados
- **CORS** habilitado

### Frontend
- **React 18** com TypeScript
- **Tailwind CSS** para styling
- **Axios** para requisições HTTP
- **React Router** para navegação

## 🏗️ Modelos de Dados (Prisma)

### User
- Gerencimento de usuários (enfermagem)
- Roles: Admin, User
- Funções: Auxiliar, Técnico, Enfermeiro

### Room
- Salas cirúrgicas
- Código e nome
- Capacidade

### Case
- Casos cirúrgicos ativos
- Dados do paciente
- Informações de cirurgia
- Status do paciente e sala

### Event
- Eventos de entrada/saída
- Rastreamento de tempos
- Suporte a automação

### StatusLegend
- Legendas customizáveis
- Cores por status
- Configuração de UI

### CardConfig
- Configuração de campos no painel
- Visibilidade e ordem

## 🔑 Principais Funcionalidades

### Atuais (v1)
- ✅ Painel de salas
- ✅ Rastreamento de eventos
- ✅ Dashboard TV (ao vivo)
- ✅ Relatórios
- ✅ Registro de tempos e movimentos

### Planejadas (v2+)
- 📋 Checklists cirúrgicos
- 🔔 Alertas inteligentes
- 📊 Análises preditivas
- 📱 Versão mobile
- 🤝 Integração com SoftwareCME
- 🔐 Auditorias e compliance
- 🌱 Sustentabilidade

## 🛠️ Setup & Instalação

### Pré-requisitos
- Docker & Docker Compose
- ou Node.js 20+ e MySQL 8.0

### Com Docker (Recomendado)

```bash
cd /home/william/Documentos/Projects\ Will/SetupSO
docker-compose up --build
```

Acesse:
- Frontend: http://localhost:3008
- Backend API: http://localhost:4008
- MySQL: localhost:3308

### Sem Docker

#### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## 📝 API Endpoints

### Health
- `GET /api/health` - Status do servidor

### Rooms
- `GET /api/rooms` - Listar salas
- `POST /api/rooms` - Criar sala

### Cases
- `GET /api/cases` - Listar cases
- `GET /api/rooms/:roomId/case` - Get/create case ativo
- `PATCH /api/cases/:caseId` - Atualizar case

### Events
- `POST /api/events` - Registrar evento
- `GET /api/cases/:caseId/events` - Listar eventos

### Users
- `GET /api/users` - Listar usuários (admin)
- `POST /api/users` - Criar usuário (admin)

### Status & Config
- `GET /api/status-legends` - Legendas de status
- `POST /api/status-legends` - Criar legenda
- `GET /api/card-config` - Configuração de cards

## 🔄 Migração do Código Legado

O código HTML/JS original (`index8.html` e `app.js`) foi refatorado para:
1. **Frontend React** com componentes reutilizáveis
2. **Backend separado** com API RESTful
3. **Banco de dados persistente** com Prisma
4. **Containers Docker** para deployment

## 🎯 Próximos Passos

1. ✅ Criar estrutura base (feito)
2. Implementar autenticação/JWT
3. Expandir componentes React
4. Integrar checklists inteligentes
5. Sistema de alertas em tempo real (WebSockets)
6. Versão mobile (React Native)
7. Integração com APIs externas (CME, PEP, etc)

---

**Versão**: 1.0 MVP  
**Data**: 2026-05-09  
**Autor**: William
