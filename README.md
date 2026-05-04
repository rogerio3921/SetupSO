# SetupSO — MVP 2

Aplicativo HTML+JS puro para rastreamento de eventos em salas cirúrgicas.
Funciona 100% offline — sem backend, sem build. Estado salvo no `localStorage` do navegador.

---

## Como abrir o app

### ✅ Opção recomendada — servidor local (evita erros de CORS/arquivo)

Abrir o `index.html` diretamente via `file://` pode fazer o app parecer funcionar, mas alguns
navegadores bloqueiam recursos. Use um servidor local mínimo:

#### Python (sem instalação extra)

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Depois abra: <http://localhost:8080>

#### Node.js / npx (sem instalação extra além do Node)

```bash
npx serve .
```

Depois abra o endereço mostrado no terminal (geralmente <http://localhost:3000>).

#### VS Code — Live Server

1. Instale a extensão **Live Server** (Ritwick Dey)
2. Clique com o botão direito em `index.html` → **Open with Live Server**
3. O navegador abrirá automaticamente em `http://127.0.0.1:5500`

> **Nota:** Se o Live Server abrir e o app parecer em branco ou não funcionar, veja a seção
> de diagnóstico abaixo.

---

## Como abrir o DevTools (console de erros)

O DevTools permite ver erros JavaScript que impedem o app de funcionar.

| Sistema | Atalho |
|---|---|
| Windows / Linux | `F12` ou `Ctrl + Shift + I` |
| macOS | `Cmd + Option + I` |
| Qualquer SO | Menu do navegador → "Mais ferramentas" → "Ferramentas do desenvolvedor" |

Após abrir o DevTools, clique na aba **Console** para ver mensagens de erro.

> **Não consigo abrir com F12?** Tente `Ctrl + Shift + I` (Windows/Linux) ou clique com o
> botão direito em qualquer lugar da página e escolha **Inspecionar**.

---

## Painel de diagnóstico integrado (sem DevTools)

O `index.html` inclui um **painel de diagnóstico** embutido que captura automaticamente erros
JavaScript e os exibe diretamente na tela — sem precisar abrir o DevTools.

- Se ocorrer um erro, um painel vermelho aparecerá na parte inferior da tela com a mensagem.
- Uma barra no topo da página mostra se `app.js` carregou corretamente, a versão, se o
  `localStorage` está disponível e se todos os elementos críticos da UI estão presentes.
- Use o botão **"▲ Ver log de erros"** na barra de healthcheck para abrir/fechar o painel.

---

## Estrutura do projeto

```
SetupSO/
├── index.html   ← entrada principal (abrir este arquivo)
├── app.js       ← toda a lógica do app
└── README.md    ← este arquivo
```

> O arquivo `index8.html` é uma versão anterior mantida para referência. Use `index.html`.

---

## Requisitos

- Navegador moderno (Chrome, Edge, Firefox, Safari)
- Conexão com a internet apenas para carregar o Tailwind CSS via CDN (na primeira abertura)
- Sem backend, sem Node.js obrigatório para rodar

---

## Solução de problemas comuns

| Sintoma | Possível causa | Solução |
|---|---|---|
| Tela em branco | `app.js` não carregou | Abra via servidor local (Python/npx/Live Server) |
| Erro "Cannot read properties of null" | Elemento HTML não encontrado | Verifique a barra de healthcheck |
| Dados não salvam | `localStorage` bloqueado | Use HTTPS ou servidor local (não `file://`) |
| Tailwind não carrega (app sem estilo) | Sem internet | Conecte-se à internet ou substitua o CDN por versão local |
| App funciona mas relógio não atualiza | JavaScript bloqueado | Verifique extensões do navegador que possam bloquear scripts |
