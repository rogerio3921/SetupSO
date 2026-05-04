# SetupSO — MVP 2

Sistema de controle de tempo cirúrgico por sala operatória.  
Dados salvos em **localStorage** — sem servidor, sem banco de dados.

---

## Como rodar localmente no VS Code

### ✅ Opção recomendada — Live Server

1. Instale a extensão **Live Server** no VS Code  
   (Extensões → pesquise "Live Server" → instalar)
2. Abra a pasta do projeto no VS Code
3. Clique com o botão direito no **`index.html`** → **Open with Live Server**
4. O navegador abrirá em `http://127.0.0.1:5500/` automaticamente

### Opção alternativa — Python (sem extensão)

```bash
# Python 3
python -m http.server 5500
```

Acesse: `http://localhost:5500`

### Opção alternativa — Node.js

```bash
npx serve .
```

---

## Estrutura do projeto

```
SetupSO/
├── index.html      ← entrada principal (use este com Live Server)
├── app.js          ← toda a lógica da aplicação
├── favicon.svg     ← ícone da aba do navegador
└── README.md
```

> `index8.html` é uma versão alternativa do HTML; o arquivo principal é `index.html`.

---

## Dependências externas

| Recurso | URL | Observação |
|---------|-----|------------|
| Tailwind CSS | `https://cdn.tailwindcss.com` | Carregado via CDN — requer internet para estilização |

Sem internet, a lógica continua funcionando, mas o CSS (Tailwind) não será carregado.

---

## Solução de problemas

### Live Server abre `app.js` em vez do app

**Causa:** Não há `index.html` na pasta, então o servidor exibe o conteúdo do diretório ou um arquivo aleatório.  
**Solução:** Certifique-se de que o arquivo `index.html` está na raiz do projeto.

### Erro 404 para `favicon.ico` no console

```
GET http://127.0.0.1:5500/favicon.ico 404 (Not Found)
```

**É inofensivo.** O navegador busca `favicon.ico` automaticamente.  
O projeto já inclui `favicon.svg` referenciado no `<head>` do `index.html`.  
Se o erro persistir, pode ser ignorado sem impacto no funcionamento.

### Interface sem estilo (página em branco/sem cores)

**Causa:** Sem conexão com a internet, o Tailwind CSS (CDN) não carrega.  
**Solução:** Conecte-se à internet. A lógica da aplicação funciona offline, mas o CSS requer CDN.

### Dados não salvam entre sessões

O `localStorage` persiste por **origem** (`http://127.0.0.1:5500`).  
- Abrir via `file://` pode ter comportamento diferente por navegador.
- Use sempre o Live Server (`http://127.0.0.1:5500`) para consistência.

---

## Versão

MVP 2 — Build 2026-05-02
