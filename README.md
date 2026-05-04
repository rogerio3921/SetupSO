# SetupSO

Sistema de controle de salas cirúrgicas (Centro Cirúrgico) — MVP 2.

---

## Funcionalidades

- Registro de eventos por sala (transporte, admissão, paciente em SO, anestesia, cirurgia, RPA, limpeza, etc.)
- Dashboard TV com métricas em tempo real
- Relatórios de cases (ativos e finalizados)
- **Login com autenticação JWT** — dados segregados por usuário
- **Banco de dados SQLite** via backend Node.js + Express
- Modo offline: dados salvos no `localStorage` e sincronizados ao servidor quando disponível
- Exportar / Importar estado em JSON (fallback)
- Indicador visual de estado do salvamento

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm

---

## Instalação e execução local

```bash
# 1. Clone o repositório
git clone https://github.com/rogerio3921/SetupSO.git
cd SetupSO

# 2. Instale as dependências
npm install

# 3. Configure variáveis de ambiente (opcional)
cp .env.example .env
# Edite .env e mude JWT_SECRET para um valor seguro

# 4. Inicie o servidor
npm start
```

O servidor estará disponível em **http://localhost:3000**.

Abra `http://localhost:3000/index.html` (ou `index8.html`) no navegador.

---

## Variáveis de ambiente

| Variável     | Padrão                                | Descrição                              |
|--------------|---------------------------------------|----------------------------------------|
| `PORT`       | `3000`                                | Porta do servidor HTTP                 |
| `JWT_SECRET` | `setupso-dev-secret-change-in-prod`   | Segredo para assinar tokens JWT        |
| `DB_PATH`    | `./setupso.db`                        | Caminho do arquivo SQLite              |

> ⚠️ **Em produção**, defina `JWT_SECRET` como uma string longa e aleatória (mínimo 32 caracteres).

---

## Endpoints da API

### Autenticação

| Método | Rota                    | Descrição                                      |
|--------|-------------------------|------------------------------------------------|
| POST   | `/api/auth/register`    | Cria uma nova conta (`{ username, password }`) |
| POST   | `/api/auth/login`       | Faz login e retorna um token JWT               |

**Exemplo de login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"seu_usuario","password":"sua_senha"}'
# Resposta: { "token": "...", "username": "seu_usuario" }
```

### Estado (autenticado)

Inclua o header `Authorization: Bearer <token>` em todas as requisições abaixo.

| Método | Rota          | Descrição                            |
|--------|---------------|--------------------------------------|
| GET    | `/api/state`  | Retorna o estado salvo do usuário    |
| PUT    | `/api/state`  | Salva/atualiza o estado do usuário   |

---

## Fluxo de login no frontend

1. Ao abrir `index.html`, se o usuário não estiver autenticado, um overlay de login é exibido.
2. O usuário pode:
   - **Entrar** com uma conta existente → o estado é carregado do servidor.
   - **Criar conta** → nova conta é criada e o usuário é autenticado automaticamente.
   - **Usar sem login (modo offline)** → dados ficam apenas no `localStorage`.
3. Cada alteração de dado dispara um `save()` que:
   - Salva imediatamente no `localStorage` (sem falha mesmo offline).
   - Agenda uma sincronização com o servidor após 1,2s (debounce).
4. O indicador "Salvo (servidor)" / "Salvando…" / "⚠ Erro ao salvar" fica visível no cabeçalho.
5. Exportar / Importar JSON permite fazer backup ou migrar dados entre dispositivos.

---

## Estrutura do projeto

```
SetupSO/
├── index.html       # Frontend principal (com login + indicador de save)
├── index8.html      # Frontend legado (compatível, sem login UI)
├── app.js           # Lógica front-end (storage, eventos, render, API)
├── server.js        # Servidor Node.js (Express + SQLite + JWT)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Licença

ISC
