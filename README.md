# SetupSO — MVP 2

Aplicativo de rastreamento de eventos de sala cirúrgica (SO).  
**100 % local · sem backend · dados persistidos via `localStorage`.**

## Estrutura

```
SetupSO/
├── index.html   ← interface principal
├── app.js       ← lógica da aplicação
├── package.json ← script opcional para servidor estático
└── .vscode/
    └── settings.json  ← configuração do Live Server
```

## Como executar

### Opção 1 — VS Code + Live Server (recomendado)

1. Instale a extensão **Live Server** (Ritwick Dey) no VS Code:  
   `Ext ID: ritwickdey.LiveServer`
2. Abra a pasta do projeto no VS Code:  
   `File › Open Folder…` → selecione a pasta `SetupSO`
3. Clique com o botão direito em **`index.html`** no Explorer e escolha  
   **"Open with Live Server"** (ou use o botão **Go Live** na barra de status).
4. O navegador abrirá em `http://127.0.0.1:5500/index.html`.

> O `.vscode/settings.json` já configura o Live Server para abrir `index.html` por padrão.

---

### Opção 2 — Abrir diretamente no navegador (sem servidor)

1. Localize o arquivo `index.html` no explorador de arquivos do SO.
2. Dê duplo clique — o navegador abrirá com URL `file:///...`.
3. Todos os recursos são carregados localmente; o Tailwind CSS é carregado via CDN  
   (requer conexão à internet apenas na **primeira** abertura enquanto o cache não estiver populado).

> **Offline total:** depois da primeira carga o Tailwind fica em cache pelo navegador.  
> Os dados do app são salvos no `localStorage` do próprio navegador — nenhum servidor necessário.

---

### Opção 3 — Servidor estático via Node.js / `npx serve`

Requer [Node.js](https://nodejs.org/) instalado.

```bash
# Na pasta do projeto:
npm run serve
# ou diretamente:
npx serve .
```

Acesse `http://localhost:3000` (ou a porta indicada no terminal).

---

## Notas

| Item | Detalhe |
|------|---------|
| Tailwind CSS | Carregado via CDN (`cdn.tailwindcss.com`) |
| Persistência | `localStorage` do navegador |
| Backend | **Não há** — app totalmente estático |
| Compatibilidade | Chrome, Firefox, Edge, Safari (versões modernas) |
| Caminhos | `index.html` carrega `./app.js` (caminho relativo — ambos na mesma pasta) |

## Desenvolvimento no VS Code

Extensões úteis:

- **Live Server** (`ritwickdey.LiveServer`) — servidor com hot-reload
- **Prettier** (`esbenp.prettier-vscode`) — formatação de código
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — autocomplete de classes
