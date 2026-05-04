# SetupSO — MVP 2 (Online)

Sistema de controle de fluxo de salas cirúrgicas com autenticação, auditoria e persistência em banco de dados.

> **Status:** Scaffolding MVP 2 — backend em implementação.  
> O frontend atual (`public/index.html` + `public/app.js`) ainda opera com localStorage enquanto a API não está completamente implementada.

---

## Arquitetura

```
Frontend (navegador)  ←→  Express API  ←→  SQLite (DB)
       ↑
 Tablet / PC (rede local ou internet)
```

Veja a documentação completa em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Pré-requisitos

- **Node.js** ≥ 18 ([nodejs.org](https://nodejs.org))
- **npm** ≥ 9 (incluído com Node.js)
- Sistema operacional: Windows 10+, macOS 12+, ou Linux

---

## Execução Local (Backend + Frontend)

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/rogerio3921/SetupSO.git
cd SetupSO
npm install
```

### 2. Configurar variáveis de ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar o .env com um editor de texto e definir:
# - JWT_SECRET  → string aleatória longa (veja instruções abaixo)
# - ADMIN_PASSWORD → senha forte para o primeiro login
```

**Gerar um `JWT_SECRET` seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Inicializar o banco de dados

```bash
npm run db:migrate
```

Isso cria o arquivo SQLite e o usuário administrador inicial com as credenciais
definidas em `ADMIN_USERNAME` e `ADMIN_PASSWORD` no `.env`.

### 4. Iniciar o servidor

```bash
# Produção
npm start

# Desenvolvimento (reinicia ao salvar arquivos)
npm run dev
```

O servidor estará disponível em: **http://localhost:3000**

---

## Variáveis de Ambiente

| Variável          | Padrão                        | Descrição                                              |
|-------------------|-------------------------------|--------------------------------------------------------|
| `PORT`            | `3000`                        | Porta do servidor HTTP                                 |
| `NODE_ENV`        | `development`                 | `development` ou `production`                          |
| `JWT_SECRET`      | _(obrigatório)_               | Segredo para assinar tokens JWT — nunca compartilhe    |
| `JWT_EXPIRES_IN`  | `8h`                          | Expiração do token (ex.: `8h`, `24h`, `7d`)            |
| `DB_PATH`         | `./server/db/setupso.sqlite`  | Caminho para o arquivo SQLite                          |
| `CORS_ORIGIN`     | `http://localhost:3000`       | Origens permitidas (vírgula para múltiplas)            |
| `BCRYPT_ROUNDS`   | `12`                          | Rounds do bcrypt (mínimo 12 em produção)               |
| `ADMIN_USERNAME`  | `admin`                       | Username do admin inicial (criado na 1ª migração)      |
| `ADMIN_PASSWORD`  | _(ver .env.example)_          | **Altere imediatamente após o primeiro login**         |
| `ADMIN_DISPLAY_NAME` | `Administrador`            | Nome exibido do admin inicial                          |

---

## Segurança Mínima

### Em desenvolvimento (local)
- Altere `ADMIN_PASSWORD` no `.env` antes de qualquer uso real.
- Nunca faça commit do arquivo `.env` (ele está no `.gitignore`).

### Em produção (exposição na internet ou rede hospitalar)
1. **HTTPS obrigatório** — configure um proxy reverso (nginx ou Caddy) com TLS.
2. **JWT_SECRET** com no mínimo 64 bytes aleatórios.
3. **BCRYPT_ROUNDS = 12** (padrão; aumentar para 14 em servidores mais potentes).
4. **CORS_ORIGIN** → apenas o domínio real da aplicação (nunca `*`).
5. **Backup diário** do arquivo SQLite: `cp setupso.sqlite setupso_backup_$(date +%Y%m%d).sqlite`.
6. **Firewall**: a porta do Node.js não deve ser exposta diretamente; use nginx na frente.

### Exemplo de configuração nginx (HTTPS)
```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com.br;

    ssl_certificate     /etc/ssl/certs/seu-dominio.crt;
    ssl_certificate_key /etc/ssl/private/seu-dominio.key;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}
# Redirecionar HTTP → HTTPS
server {
    listen 80;
    server_name seu-dominio.com.br;
    return 301 https://$host$request_uri;
}
```

---

## Estrutura do Projeto

```
SetupSO/
├── public/              ← frontend (servido em GET /)
│   ├── index.html
│   └── app.js
├── server/
│   ├── index.js         ← servidor Express
│   ├── db/
│   │   ├── schema.sql   ← DDL do banco
│   │   └── migrate.js   ← script de inicialização
│   ├── middleware/
│   │   └── auth.js      ← middleware JWT
│   └── routes/
│       ├── auth.js
│       ├── rooms.js
│       ├── cases.js
│       ├── events.js
│       ├── users.js
│       └── migrate.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_CONTRACTS.md
│   └── MIGRATION_PLAN.md
├── .env.example
├── .gitignore
└── package.json
```

---

## Documentação Adicional

| Documento                                          | Descrição                                        |
|----------------------------------------------------|--------------------------------------------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | Arquitetura completa, stack, fluxo de auth       |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Schema do banco, campos de auditoria             |
| [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)     | Todos os endpoints REST com exemplos             |
| [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md)   | Como migrar do localStorage para o banco         |

---

## Auditoria de Colaboradores

Cada evento registrado no sistema inclui `createdByUserId`, vinculado ao usuário autenticado.  
Isso permite responder perguntas como:

- "Quem registrou a entrada do paciente na SO às 09:35?"
- "Quem encerrou o case da Sala 3 às 14:22?"
- "Quais ações o colaborador João Silva registrou hoje?"

Veja a query de exemplo:
```sql
SELECT
  e.event_timestamp,
  e.event_type,
  e.action,
  u.display_name AS registrado_por,
  c.full_name AS paciente,
  r.code AS sala
FROM events e
JOIN cases c ON c.id = e.case_id
JOIN rooms r ON r.id = c.room_id
LEFT JOIN users u ON u.id = e.created_by_user_id
WHERE DATE(e.event_timestamp) = '2026-05-04'
ORDER BY e.event_timestamp;
```

---

## Fluxo de Login (resumido)

1. Usuário abre o app → vê tela de login (username + senha).
2. Frontend envia `POST /api/auth/login` → recebe JWT.
3. JWT é armazenado em `sessionStorage` (descartado ao fechar o navegador).
4. Todas as chamadas subsequentes incluem `Authorization: Bearer <token>`.
5. Token expira em 8 horas → usuário é redirecionado para login.

---

## Como Adicionar um Colaborador

```bash
# Via API (admin autenticado)
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "maria.santos",
    "password": "SenhaForte#2026",
    "displayName": "Maria Santos",
    "role": "operator"
  }'
```

---

## Licença

Uso interno. Todos os direitos reservados.
