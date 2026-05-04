# SetupSO — MVP 2

Aplicação web para controle de salas cirúrgicas (SetupSO).  
Roda 100% no navegador, sem backend — todos os dados ficam no `localStorage`.

---

## Como rodar localmente

### Opção 1 — VS Code + Live Server (recomendado)

1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server** (Ritwick Dey) se ainda não tiver.
3. Clique com o botão direito em **`index8.html`** → **"Open with Live Server"**.
4. O navegador abrirá em `http://127.0.0.1:5500/index8.html` (ou porta similar).

> **Dica:** Se o arquivo não abrir automaticamente na página certa, navegue manualmente até `index8.html` na URL do navegador.

---

### Opção 2 — Python (sem instalar nada)

```bash
# Python 3
python -m http.server 5500
```

Acesse: [http://localhost:5500/index8.html](http://localhost:5500/index8.html)

Windows (PowerShell / CMD):

```bat
py -m http.server 5500
```

---

### Opção 3 — npx serve (sem instalar globalmente)

```bash
npx serve .
```

Acesse a URL exibida no terminal (ex.: `http://localhost:3000/index8.html`).

---

### Opção 4 — npm run serve (via package.json)

```bash
npm install
npm run serve
```

Acesse: [http://localhost:8080/index8.html](http://localhost:8080/index8.html)

---

## Aviso do Tailwind CDN no Console

Você verá esta mensagem no console do navegador:

```
cdn.tailwindcss.com should not be used in production.
```

**Isso é esperado e normal para um MVP.**  
O projeto usa o CDN do Tailwind por simplicidade — não há build step.

### Como remover o aviso em produção (opcional)

Substitua a tag CDN por uma build local do Tailwind:

```bash
npm install -D tailwindcss
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch
```

E troque no `index8.html`:

```html
<!-- Antes (CDN — gera aviso) -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Depois (build local — sem aviso) -->
<link rel="stylesheet" href="./dist/output.css" />
```

Para um MVP estático, **o aviso pode ser ignorado com segurança**.

---

## Estrutura do projeto

```
SetupSO/
├── index8.html   # Interface principal (HTML + Tailwind CDN)
├── app.js        # Lógica da aplicação (vanilla JS, sem dependências)
├── favicon.svg   # Ícone do app (navegadores modernos)
├── favicon.ico   # Ícone do app (compatibilidade)
├── package.json  # Scripts utilitários (opcional)
└── README.md
```

---

## Tecnologias

- HTML5 + CSS (Tailwind via CDN)
- JavaScript vanilla (sem frameworks)
- `localStorage` para persistência de dados
