---
description: Cria a estrutura completa de um novo cliente a partir do scaffold _base. Use quando pedir /novo-cliente, cadastrar cliente, criar cliente novo.
---

# /novo-cliente — Scaffolding de Cliente

Você cria a estrutura de diretórios e arquivos para um novo cliente.

## Input

`$ARGUMENTS` contém: `<slug> <nome-display> <@handle>`

Exemplos:
- `/novo-cliente affetto Affetto @affetto.oficial`
- `/novo-cliente ducan Ducan @ducan.studio`
- `/novo-cliente minimais Minimais @minimais.co`

## Processo

### 1. Validação

- `slug` deve ser kebab-case (só letras minúsculas, números, hífens)
- `slug` não pode ser `_base` (reservado)
- Verifique se `clients/<slug>/` **não existe** (se existir, informe e pare)
- `handle` deve começar com `@`

### 2. Criar estrutura

Copie a estrutura de `clients/_base/` para `clients/<slug>/`, substituindo placeholders:

```bash
mkdir -p clients/<slug>/design/templates/carrossel
mkdir -p clients/<slug>/design/templates/stories
mkdir -p clients/<slug>/design/templates/reels-cover
mkdir -p clients/<slug>/design/fonts
mkdir -p clients/<slug>/assets
mkdir -p clients/<slug>/examples
mkdir -p clients/<slug>/feedback
```

### 3. Criar `client.json`

Copie `clients/_base/client.json.template` para `clients/<slug>/client.json` e substitua:
- `{{SLUG}}` → `<slug>`
- `{{DISPLAY_NAME}}` → `<nome-display>`
- `{{HANDLE}}` → `<@handle>`

### 4. Criar documentos com placeholders preenchidos

Copie de `_base/` e substitua `{{DISPLAY_NAME}}` em:
- `briefing.md`
- `personas.md`
- `calendar.md`
- `design/DESIGN.md`
- `design/tokens.css` (substitua `{{DISPLAY_NAME}}` no comentário header)
- `feedback/learnings.md`

### 5. Copiar templates base

Copie os templates HTML de `clients/_base/design/templates/carrossel/` para
`clients/<slug>/design/templates/carrossel/`:
- `cover.html`
- `content.html`
- `cta.html`

### 6. Criar metrics.jsonl vazio

```bash
touch clients/<slug>/feedback/metrics.jsonl
```

### 7. Output final

```
✓ /novo-cliente criado
  Cliente    : <nome-display>
  Slug       : <slug>
  Handle     : <@handle>
  Diretório  : clients/<slug>/

  Próximos passos:
  1. Edite clients/<slug>/briefing.md — tom de voz, público, referências
  2. Edite clients/<slug>/design/tokens.css — paleta de cores e tipografia
  3. Edite clients/<slug>/design/DESIGN.md — regras visuais
  4. Adicione logo em clients/<slug>/assets/logo.png
  5. Adicione fontes em clients/<slug>/design/fonts/
  6. Personalize os templates HTML em design/templates/carrossel/
  7. Teste: /carrossel <slug> <qualquer tema>
```

## Anti-padrões

- ❌ Criar cliente com slug que já existe
- ❌ Pular a criação de algum arquivo essencial (client.json é obrigatório)
- ❌ Deixar `{{SLUG}}`, `{{DISPLAY_NAME}}`, `{{HANDLE}}` sem substituir
