---
description: Pipeline legado de criação de post Instagram (carrossel ou imagem única) sem multi-cliente. Use /criar-post apenas para posts sem cliente específico.
disable-model-invocation: true
---

# /criar-post — Orquestrador (Legado)

Você é o **orquestrador** do pipeline de criação de posts. Sua tarefa é coordenar subagents
sequencialmente e rodar o renderer apropriado no final.

Dois branches:
- **carrossel** (default, V1): 5–10 slides 1080×1440 via Puppeteer
- **single** (V2): 1 imagem 1:1 ou ~9:16 via provider chain

## Input

`$ARGUMENTS` contém o tema/notícia + flags opcionais.

Exemplos:
- `/criar-post vazamento de código fonte da Anthropic`
- `/criar-post ataque ransomware MGM 2025 --formato=carrossel`
- `/criar-post bug do Cursor que apagou repositórios --formato=single`
- `/criar-post Claude 4.7 lançamento --formato=single --size=9x16`

## Processo (siga em ordem)

### 1. Parse & validação dos argumentos

- Extraia o tema (tudo antes de qualquer `--`).
- Extraia o formato (`--formato=carrossel|single`, default `carrossel`).
- Extraia o size (`--size=1x1|9x16`, default `1x1`, **só aplica em `single`**).
- Se tema vazio: responda como usar e pare.

### 2. Resolver slug + versão

Use Node + helpers de `scripts/lib/slug.mjs`:

```bash
node -e "import('./scripts/lib/slug.mjs').then(m => { const r = m.resolveOutputDir(process.cwd(), process.argv[1], process.argv[2]); console.log(JSON.stringify(r)); })" "<TEMA>" "<FORMATO>"
```

Capture: `slug`, `version`, `versionDir`. Crie o `versionDir` com `mkdir -p`.

Comunique ao usuário: *"Slug: `<slug>` · Versão: v<N> · Formato: <formato> · Output: `<versionDir>/`"*.

### 3. Subagent 1: news-scout (sempre)

Invoque `news-scout` com input:

```
TEMA: <tema>
OUTPUT_DIR: <versionDir>/
```

Aguarde até `<versionDir>/research.json` existir. Confirme em uma linha:
*"Notícia: <chosen.title> (score <viralScore>)"*.

### 4. Branch por formato

#### 4a. Se `formato=carrossel`

**Subagent 2: carousel-writer**

```
OUTPUT_DIR: <versionDir>/
```

Lê `research.json` + skill `hacker-carousel`, escreve `slides.json`.
Reporte: *"Carrossel: <N> slides — `<slide_1.title>` → `<slide_N.title>`"*.

#### 4b. Se `formato=single`

**Subagent 2: image-prompt-writer**

```
OUTPUT_DIR: <versionDir>/
SIZE: <1x1|9x16>
```

Lê `research.json`, escreve `image-prompt.json`.
Reporte: *"Image prompt: \"<headline>\" (size <size>, quality <quality>)"*.

### 5. Subagent 3: caption-writer (sempre)

```
OUTPUT_DIR: <versionDir>/
```

Lê o que estiver disponível (`research.json` + `slides.json` ou `research.json` +
`image-prompt.json`) e escreve `caption.txt`.

Reporte: *"Legenda: <X> hashtag(s)"*.

### 6. Renderer

#### 6a. Se `formato=carrossel`

```bash
spc render.mjs <versionDir>
```

#### 6b. Se `formato=single`

```bash
spc render-image.mjs <versionDir>
```

Em qualquer caso: se falhar por validação Zod, **pare** e reporte. Não tente "corrigir"
o JSON automaticamente — re-invoque o subagent correspondente passando o erro como contexto.

### 7. Output final

Para carrossel:

```
✓ /criar-post pronto (carrossel)
  Tema      : <tema>
  Slug      : <slug>
  Versão    : v<N>
  Slides    : <N> PNGs em images/carrossel/<slug>/v<N>/slides/
  Legenda   : images/carrossel/<slug>/v<N>/caption.txt (<X> hashtags)
  Fonte     : <chosen.url>
```

Para single:

```
✓ /criar-post pronto (single)
  Tema      : <tema>
  Slug      : <slug>
  Versão    : v<N>
  Imagem    : images/single/<slug>/v<N>/post.png (<size>)
  Headline  : <headline>
  Legenda   : images/single/<slug>/v<N>/caption.txt (<X> hashtags)
  Fonte     : <chosen.url>
```

## Anti-padrões do orquestrador

- ❌ Pular subagents (cada um tem responsabilidade única)
- ❌ Editar arquivos produzidos por subagents (se algo está errado, re-invoque o subagent)
- ❌ Renderizar antes de ter o JSON intermediário válido
- ❌ Continuar pra etapa N+1 se a etapa N falhou
- ❌ Inventar fontes, datas ou conteúdo — tudo vem dos JSONs intermediários
- ❌ Usar `--size` em formato carrossel (size é fixo 1080×1440 lá)
