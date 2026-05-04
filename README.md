# SetupSO — MVP 2

Painel de salas cirúrgicas (single-file, offline, localStorage).

## Estrutura

```
SetupSO/
├── index.html   ← interface principal
├── app.js       ← lógica da aplicação
├── package.json ← scripts de servidor local (opcional)
└── README.md    ← este arquivo
```

## Como abrir

### Opção 1 — VS Code + Live Server (extensão)

1. Instale a extensão **Live Server** (Ritwick Dey) no VS Code.
2. Clique com o botão direito em **`index.html`** no Explorer e escolha **"Open with Live Server"**.
3. O navegador abrirá em `http://127.0.0.1:5500/index.html` (ou porta similar).

> ⚠️ **Atenção:** Abrir o arquivo diretamente (duplo-clique / `file://`) pode causar erros de CORS e impedir o carregamento do `app.js`. Use sempre um servidor HTTP local.

### Opção 2 — Node.js + http-server (sem extensão)

```bash
# Instale as dependências (apenas uma vez)
npm install

# Inicie o servidor
npm start
```

O navegador abrirá automaticamente em `http://localhost:8080/index.html`.

### Opção 3 — Python (sem nenhuma instalação extra)

```bash
# Python 3
python3 -m http.server 8080

# Python 2 (legado)
python -m SimpleHTTPServer 8080
```

Acesse `http://localhost:8080/index.html` no navegador.

---

## Solução de problemas (Troubleshooting)

### 1. Página em branco ou sem estilo

- Confirme que você abriu via servidor HTTP (URL começa com `http://`) e **não** com `file://`.
- Verifique se `index.html` e `app.js` estão na **mesma pasta**.

### 2. Erro "Failed to load resource: net::ERR_FILE_NOT_FOUND" (app.js 404)

- Abra o DevTools (`F12`) → aba **Console** ou **Network**.
- Confira se o arquivo `app.js` existe na mesma pasta que `index.html`.
- Confirme que o servidor está servindo a pasta correta (não uma subpasta).

### 3. Live Server não abre / porta bloqueada

1. Verifique se a extensão **Live Server** está instalada e habilitada.
2. Tente mudar a porta: `Ctrl+Shift+P` → **"Live Server: Change Live Server Port"** → use `5501` ou `3000`.
3. Se o firewall bloquear a porta padrão (5500), escolha uma porta acima de 3000.
4. Desative temporariamente outras extensões de servidor para evitar conflito.

### 4. Conflito de extensões

- Desative outras extensões que possam servir arquivos (ex: outras variantes de Live Server).
- Recarregue o VS Code com `Ctrl+Shift+P` → **"Reload Window"**.

### 5. Erros de JavaScript no Console (IDs ausentes / null reference)

Abra o DevTools (`F12`) → **Console** e procure por erros como:

```
TypeError: Cannot set properties of null
```

Isso indica que o `app.js` tentou acessar um elemento HTML pelo `id` que não existe.
Os IDs esperados pelo `app.js` são:

| ID HTML              | Onde aparece               |
|----------------------|----------------------------|
| `buildStamp`         | Header                     |
| `clockTop`           | Header (relógio)           |
| `todayTop`           | Header (data)              |
| `tabRooms`           | Botão aba Salas            |
| `tabDashboard`       | Botão aba Dashboard        |
| `tabReports`         | Botão aba Relatórios       |
| `roomsGrid`          | Container de salas         |
| `dashKpis`           | Grid de KPIs do Dashboard  |
| `dashTvTable`        | Tabela do Dashboard (TV)   |
| `dashUpdatedAt`      | Timestamp do Dashboard     |
| `reportsTable`       | Tabela de relatórios       |
| `viewRooms`          | Seção de salas             |
| `viewDashboard`      | Seção do Dashboard         |
| `viewReports`        | Seção de relatórios        |
| `viewRoomDetail`     | Seção de detalhe de sala   |

Abra `index.html` e verifique se todos esses `id` estão presentes.

### 6. Mixed Content (HTTPS/HTTP)

Se hospedar em HTTPS e o Tailwind CDN falhar:

- Verifique no Console se há erros de "Mixed Content".
- O script `https://cdn.tailwindcss.com` requer conexão com a internet.
- Para uso offline completo, baixe o Tailwind localmente: `npm install tailwindcss` ou use o binário standalone.

### 7. Como inspecionar com DevTools passo a passo

1. Pressione `F12` (ou `Ctrl+Shift+I`) para abrir o DevTools.
2. Vá à aba **Console** — erros em vermelho indicam o problema.
3. Vá à aba **Network** e recarregue (`F5`):
   - Verifique se `app.js` retornou **200 OK** (não 404).
   - Verifique se `https://cdn.tailwindcss.com` carregou (necessário online).
4. Vá à aba **Application** → **Local Storage** → confirme que o domínio correto aparece (não `file://`).

### 8. Limpar dados locais (reset)

Clique no botão **"Limpar"** no cabeçalho da aplicação para apagar todos os dados do `localStorage` e reiniciar.

Ou via Console do DevTools:

```javascript
localStorage.removeItem("setupso_mvp2_state_ultra_robust_20260502_1105");
location.reload();
```

---

## Tecnologias

- **HTML/CSS/JS** puro — sem framework, sem build step
- **Tailwind CSS** via CDN (requer internet na primeira carga)
- **localStorage** para persistência offline
