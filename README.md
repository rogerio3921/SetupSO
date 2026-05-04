# SetupSO — MVP Online

Centro Cirúrgico Digital com **autenticação**, **banco de dados PostgreSQL** e suporte a **múltiplos hospitais** (multi-tenant).

## Arquitetura

```
Frontend (HTML/CSS/JS)  →  API REST (Node.js/Express)  →  PostgreSQL
         └── servido pelo próprio servidor Node.js
```

### Funcionalidades
- Login com **usuário + senha** (bcrypt + JWT)
- Perfis: **admin** e **colaborador**
- Auditoria: todo evento registra **quem** e **quando**
- **Multi-hospital**: cada hospital (tenant) tem seus dados isolados
- Dashboard TV em tempo real
- Relatórios por hospital

---

## Início rápido (Docker — recomendado)

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

### Passos

```bash
# 1. Clonar
git clone https://github.com/rogerio3921/SetupSO
cd SetupSO

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e troque JWT_SECRET e as senhas

# 3. Subir
docker compose up -d

# 4. Abrir no navegador
# http://localhost:3000
# Login padrão: admin / admin123
```

---

## Início rápido (sem Docker)

### Pré-requisitos
- Node.js >= 18
- PostgreSQL >= 14 rodando

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env
cp .env.example .env
# Edite DATABASE_URL, JWT_SECRET e credenciais

# 3. Criar tabelas e usuário admin padrão
npm run db:migrate

# 4. Iniciar servidor
npm start

# http://localhost:3000
```

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `DATABASE_URL` | Connection string do PostgreSQL | — |
| `JWT_SECRET` | Segredo para assinar tokens JWT | — |
| `JWT_EXPIRES_IN` | Expiração do token | `8h` |
| `BOOTSTRAP_ADMIN_USERNAME` | Usuário admin criado na 1ª execução | `admin` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Senha do admin padrão | `admin123` |

> ⚠️ **Troque `JWT_SECRET` e `BOOTSTRAP_ADMIN_PASSWORD` antes de colocar em produção.**

---

## API REST

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login com username + password |
| `GET` | `/api/auth/me` | Dados do usuário logado |

### Operação
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/rooms` | Listar salas do hospital |
| `GET` | `/api/rooms/:id/active-case` | Case ativo da sala (cria se não existir) |
| `GET` | `/api/cases` | Listar todos os cases |
| `GET` | `/api/cases/:id` | Detalhes do case |
| `PATCH` | `/api/cases/:id` | Editar detalhes do case |
| `GET` | `/api/cases/:id/events` | Listar eventos do case |
| `POST` | `/api/cases/:id/events` | Registrar evento (com auditoria) |
| `DELETE` | `/api/cases/:id/events/:evId` | Desfazer evento |

### Admin
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/admin/users` | Listar usuários do hospital |
| `POST` | `/api/admin/users` | Criar usuário |
| `PATCH` | `/api/admin/users/:id` | Editar / desativar usuário |
| `GET` | `/api/admin/tenants` | Listar hospitais |
| `POST` | `/api/admin/tenants` | Criar hospital |

---

## Modelo de dados

```
tenants           → hospitais / clientes
  └── users       → usuários (admin / collaborator)
  └── rooms       → salas cirúrgicas
      └── cases   → procedimentos (1 ativo por sala)
          └── events → etapas registradas (com created_by_user_id)
```

---

## Deploy em produção

### Cloud (ex: Railway, Render, Fly.io, AWS)
1. Provisionar banco PostgreSQL gerenciado.
2. Fazer deploy do container (Dockerfile incluído).
3. Configurar variáveis de ambiente no painel da plataforma.
4. Garantir HTTPS (obrigatório em produção).

### On-premises (hospital)
```bash
# Numa máquina com Docker na rede do hospital:
docker compose up -d

# Tablets e PCs acessam via navegador:
# http://<IP-DA-MAQUINA>:3000
```

---

## Perfis de acesso

| Ação | Admin | Colaborador |
|---|---|---|
| Registrar eventos | ✅ | ✅ |
| Editar detalhes do case | ✅ | ✅ |
| Ver relatórios | ✅ | ✅ |
| Criar / desativar usuários | ✅ | ❌ |
| Criar salas | ✅ | ❌ |

---

## Próximos passos (pós-MVP)

- [ ] LGPD: pseudonimização de dados do paciente
- [ ] Notificações em tempo real (WebSocket / SSE)
- [ ] Exportar relatórios em CSV/PDF
- [ ] Modo degradado (offline-first com sync)
- [ ] Tela de gestão de hospitais (super-admin)
- [ ] Autenticação via cookie httpOnly em vez de localStorage
