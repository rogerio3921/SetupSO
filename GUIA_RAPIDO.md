# 🚀 GUIA DE INÍCIO RÁPIDO - SetupSO v2

## ⚡ TL;DR - 30 Segundos

```bash
cd /home/william/Documentos/Projects\ Will/SetupSO
docker-compose up --build
```

Então acesse: **http://localhost:3008**

---

## 📦 Estrutura do Projeto

```
SetupSO/
│
├── 📑 DOCUMENTAÇÃO
│   ├── README.md              ← Documentação principal
│   ├── REQUISITOS.md          ← Funcionalidades atuais e planejadas
│   ├── ARQUITETURA.md         ← Estrutura técnica
│   ├── SUMARIO.md             ← Este sumário
│   └── GUIA_RAPIDO.md         ← Este arquivo
│
├── 🔧 BACKEND (Node.js + Express + Prisma)
│   ├── src/
│   │   └── server.ts          ← ⭐ API com 13 endpoints
│   ├── prisma/
│   │   ├── schema.prisma      ← ⭐ Modelo de dados (7 tabelas)
│   │   └── seed.ts            ← ⭐ Seed automático
│   ├── package.json           ← Dependências
│   ├── tsconfig.json          ← TypeScript config
│   ├── Dockerfile             ← Build do container
│   ├── .env.example           ← Exemplo de env vars
│   └── .gitignore
│
├── 🎨 FRONTEND (React + Tailwind)
│   ├── src/
│   │   ├── App.tsx            ← ⭐ Componente principal
│   │   ├── index.tsx          ← Entry point
│   │   ├── App.css
│   │   └── index.css          ← Tailwind imports
│   ├── public/
│   │   └── index.html         ← HTML template
│   ├── package.json           ← Dependências
│   ├── tailwind.config.js     ← Tailwind config
│   ├── postcss.config.js      ← PostCSS config
│   ├── Dockerfile             ← Build do container
│   ├── .env.development       ← API URL
│   └── .gitignore
│
├── 🐳 DOCKER
│   ├── docker-compose.yml     ← ⭐ Orquestração (3 containers)
│   └── docker/
│       └── init.sql           ← Inicialização MySQL
│
└── 📚 CÓDIGO LEGADO (Referência)
    ├── index8.html            ← Front antigo
    └── app.js                 ← Lógica antiga (para migrar)
```

---

## 🎯 Componentes Principais

### ⭐ Backend (backend/src/server.ts)
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **ORM**: Prisma
- **Porta Interna**: 4000
- **Porta Externa**: 4008
- **Endpoints**: 13 (rooms, cases, events, users, config)

### ⭐ Banco de Dados (backend/prisma/schema.prisma)
- **Banco**: MySQL 8.0
- **Porta**: 3308
- **Tabelas**: 7 (users, rooms, cases, events, status_legends, card_configs)
- **Seed**: Automático (4 salas, 10 status, 8 campos)

### ⭐ Frontend (frontend/src/App.tsx)
- **Framework**: React 18
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Porta Interna**: 3000
- **Porta Externa**: 3008

### ⭐ Orquestração (docker-compose.yml)
- **MySQL**: Container com healthcheck
- **Backend**: Container com migrations automáticas
- **Frontend**: Container com build multi-stage
- **Network**: Bridge compartilhada

---

## 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Status do servidor |
| `GET` | `/api/rooms` | Listar todas as salas |
| `POST` | `/api/rooms` | Criar nova sala |
| `GET` | `/api/cases` | Listar todos os cases |
| `GET` | `/api/rooms/:roomId/case` | Get/criar case ativo |
| `PATCH` | `/api/cases/:caseId` | Atualizar case |
| `POST` | `/api/events` | Registrar evento |
| `GET` | `/api/cases/:caseId/events` | Listar eventos |
| `GET` | `/api/users` | Listar usuários |
| `POST` | `/api/users` | Criar usuário |
| `GET` | `/api/status-legends` | Legendas de status |
| `POST` | `/api/status-legends` | Criar legenda |
| `GET` | `/api/card-config` | Config de campos |

---

## 🗄️ Modelos de Dados

### User (Usuários)
```json
{
  "id": "uuid",
  "email": "user@hospital.com",
  "fullName": "João Silva",
  "badgeNumber": "EMP001",
  "corenNumber": "COREN123",
  "department": "Centro Cirúrgico",
  "function": "Enfermeiro",
  "role": "Admin"
}
```

### Room (Salas)
```json
{
  "id": "uuid",
  "code": "Sala 1",
  "name": "Sala de Cirurgia 1",
  "capacity": 1
}
```

### Case (Cirurgia)
```json
{
  "id": "uuid",
  "roomId": "uuid",
  "code": "Sala1-2026-05-09-01",
  "status": "active",
  "patientFullName": "Maria Santos",
  "procedureName": "Prostatectomia VLP",
  "surgeonName": "Dr. Carlos Volpe",
  "plannedSurgeryTime": "08:00"
}
```

### Event (Evento)
```json
{
  "id": "uuid",
  "caseId": "uuid",
  "eventKey": "surgery",
  "action": "start",
  "happenedAt": "2026-05-09T08:30:00Z",
  "auto": false
}
```

---

## 🚀 Como Usar

### Opção 1: Docker (Recomendado)

#### Pré-requisitos
- Docker instalado
- Docker Compose instalado

#### Comandos
```bash
# Navegar para o projeto
cd /home/william/Documentos/Projects\ Will/SetupSO

# Construir e subir containers
docker-compose up --build

# Aguarde as mensagens:
# ✓ db service started
# ✓ backend service started
# ✓ frontend service started
```

#### Acessar
- **Frontend**: http://localhost:3008
- **Backend API**: http://localhost:4008/api/health
- **MySQL**: localhost:3308 (user: setupso, pass: setupso123)

#### Parar
```bash
docker-compose down
```

#### Remover dados
```bash
docker-compose down -v  # Remove volumes também
```

---

### Opção 2: Desenvolvimento Local

#### Backend

**Pré-requisitos**
- Node.js 20+
- MySQL 8.0 rodando localmente

**Setup**
```bash
cd backend

# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
nano .env
# DATABASE_URL="mysql://root:password@localhost:3306/setupso"

# Instalar dependências
npm install

# Gerar Prisma client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Seed do banco (dados iniciais)
npm run prisma:seed

# Iniciar servidor em modo desenvolvimento
npm run dev
```

**Verificar**
- Backend rodando: http://localhost:4000/api/health
- Deve retornar: `{"status":"ok","timestamp":"..."}`

#### Frontend

**Pré-requisitos**
- Node.js 20+
- Backend rodando

**Setup**
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm start
```

**Acessar**
- Frontend: http://localhost:3000 (ou a porta que React escolher)

---

## 📊 Arquitetura Visual

```
┌─────────────────────────────────────────────────────────┐
│                   USER BROWSER                           │
│              http://localhost:3008                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│         FRONTEND (React Container)                      │
│         PORT 3008 (external) → 3000 (internal)         │
│         - App.tsx: Grid de salas                        │
│         - Axios: Requisições HTTP                       │
│         - Tailwind: Styling                             │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API JSON
                       ▼
┌─────────────────────────────────────────────────────────┐
│        BACKEND (Express Container)                      │
│        PORT 4008 (external) → 4000 (internal)          │
│        - 13 endpoints REST                              │
│        - CORS enabled                                   │
│        - Prisma ORM                                     │
└──────────────────────┬──────────────────────────────────┘
                       │ SQL Queries
                       ▼
┌─────────────────────────────────────────────────────────┐
│         DATABASE (MySQL Container)                      │
│         PORT 3308 (external) → 3306 (internal)         │
│         - 7 tabelas Prisma                              │
│         - Volume persistente: mysql_data                │
│         - Seed automático                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Comandos Úteis

### Docker

```bash
# Ver status dos containers
docker-compose ps

# Ver logs do backend
docker-compose logs backend -f

# Ver logs do frontend
docker-compose logs frontend -f

# Ver logs do MySQL
docker-compose logs db -f

# Executar comando no backend
docker-compose exec backend npm run prisma:studio

# Parar um serviço específico
docker-compose stop backend

# Reiniciar um serviço
docker-compose restart backend
```

### MySQL

```bash
# Acessar MySQL dentro do container
docker-compose exec db mysql -uroot -ppassword setupso

# Fazer backup
docker-compose exec db mysqldump -uroot -ppassword setupso > backup.sql

# Restaurar
docker-compose exec -T db mysql -uroot -ppassword setupso < backup.sql
```

### Node.js

```bash
# Dentro do backend
npm run prisma:studio    # UI para banco de dados
npm run prisma:migrate   # Rodar migrations
npm run prisma:seed      # Rodar seed
npm run build            # Build TypeScript
npm run dev              # Modo desenvolvimento
```

---

## ✅ Verificação Rápida

Depois de iniciar, verifique:

1. **Frontend carrega?**
   - http://localhost:3008
   - Deve mostrar grid de salas

2. **Backend responde?**
   - http://localhost:4008/api/health
   - Deve retornar `{"status":"ok",...}`

3. **API retorna salas?**
   - http://localhost:4008/api/rooms
   - Deve retornar array com 4 salas padrão

4. **Database conecta?**
   - `docker-compose exec db mysql -uroot -ppassword setupso`
   - Listar tabelas: `SHOW TABLES;`

---

## 🐛 Troubleshooting

### Porta 3008/4008/3308 já em uso?

```bash
# Encontrar processo usando a porta
lsof -i :3008
lsof -i :4008
lsof -i :3308

# Matar processo
kill -9 <PID>
```

### Container não inicia?

```bash
# Ver logs detalhados
docker-compose logs backend
docker-compose logs db
docker-compose logs frontend

# Reconstruir do zero
docker-compose down -v
docker-compose up --build
```

### Conexão com banco recusada?

- Aguardar ~10 segundos para MySQL iniciar
- Verificar healthcheck: `docker-compose ps`
- Checar DATABASE_URL no .env

### Frontend não conecta com backend?

- Verificar CORS no backend (habilitado por padrão)
- Verificar REACT_APP_API_URL no .env.development
- Checar console do navegador (F12 → Network/Console)

---

## 📚 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/server.ts` | 🔑 Toda a lógica da API |
| `backend/prisma/schema.prisma` | 🔑 Definição do banco |
| `frontend/src/App.tsx` | 🔑 Interface principal |
| `docker-compose.yml` | 🔑 Orquestração |
| `README.md` | Documentação completa |
| `REQUISITOS.md` | Funcionalidades |
| `ARQUITETURA.md` | Detalhes técnicos |

---

## 🎓 Próximos Passos

1. **Explorar o código**
   - Abrir `backend/src/server.ts` para entender endpoints
   - Abrir `frontend/src/App.tsx` para entender componentes

2. **Modificar dados**
   - Acessar `http://localhost:4008/api/rooms`
   - Ver 4 salas criadas pelo seed

3. **Adicionar funcionalidade**
   - Criar novo endpoint no backend
   - Consumir no frontend com Axios

4. **Deploy**
   - Push para Docker Hub
   - Deploy em Kubernetes
   - Usar Docker Swarm

---

## 💡 Dicas

- Use Postman/Insomnia para testar endpoints
- Use DevTools (F12) para debug no frontend
- Use `docker-compose logs -f` para monitorar
- Prisma Studio (`npm run prisma:studio`) é ótimo para explorar dados

---

## 📞 Resumo Executivo

| Aspecto | Detalhe |
|--------|---------|
| **Status** | ✅ Pronto para uso |
| **Tempo Setup** | ~5 minutos (Docker) |
| **Arquitetura** | 3-tier (frontend, backend, database) |
| **Containers** | 3 (React, Express, MySQL) |
| **Endpoints** | 13 REST APIs |
| **Tabelas** | 7 (Prisma ORM) |
| **Portas** | 3008 (front), 4008 (back), 3308 (db) |
| **Documentação** | 5 arquivos .md |

---

**SetupSO v2 - Pronto para Production! 🚀**

Criado em: 9 de maio de 2026
