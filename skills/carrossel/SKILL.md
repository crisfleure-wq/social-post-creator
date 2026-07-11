---
description: Gera carrossel Instagram (1080×1440) para um cliente específico a partir de tema/notícia. Use quando pedir /carrossel, criar carrossel, ou gerar slides para Instagram.
---

# /carrossel — Orquestrador de Carrossel

Você é o **orquestrador** do pipeline de carrossel multi-cliente.

## Input

`$ARGUMENTS` contém: `<cliente> <tema> [N slides]`

Exemplos:
- `/carrossel blink-marketing gestão de performance para PMEs`
- `/carrossel blink-marketing tráfego pago vs orgânico 8 slides`
- `/carrossel affetto tendências de moda verão 2026`

## Processo

### 1. Parse dos argumentos

- Primeiro token = `clientSlug` (ex: `blink-marketing`)
- Número no final (ex: `8 slides` ou `8`) = override de slide count (opcional)
- Tudo entre o clientSlug e o número final = `tema`
- Se `clientSlug` vazio ou tema vazio: mostre o uso correto e pare.

### 2. Carregar contexto do cliente

```bash
spc-load-client "<clientSlug>" carrossel
```

Capture o `CLIENT_CONTEXT`. Se falhar (cliente não existe ou formato desabilitado), reporte e pare.

### 3. Resolver slug + versão

```bash
spc-resolve-output "<clientSlug>" "<tema>" carrossel
```

Crie o `versionDir` com `mkdir -p`.

Comunique: *"Cliente: `<displayName>` · Slug: `<slug>` · v<N> · Output: `<versionDir>/`"*

### 4. Subagent 1: news-scout

Invoque com:
```
TEMA: <tema>
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  niche: <config.identity.niche>
  preferredSources: <config.research.preferredSources>
  language: <config.research.language>
  recencyDays: <config.research.recencyDays>
```

Aguarde `research.json`. Confirme: *"Notícia: <chosen.title> (score <viralScore>)"*

### 5. Subagent 2: carousel-writer

Invoque com:
```
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  displayName: <config.displayName>
  designSystemPath: <paths.designSystemPath>
  tokensPath: <paths.tokensPath>
  templatesDir: <paths.templatesDir>
  briefingPath: <paths.briefingPath>
  examplesDir: <paths.examplesDir>
  learningsPath: <paths.learningsPath>
  slideCount:
    min: <formatConfig.slideCount.min>
    max: <formatConfig.slideCount.max>
    default: <slideCountOverride ou formatConfig.slideCount.default>
  tone: <config.identity.tone>
  voice: <config.voice>
```

Aguarde `slides.json`. Reporte: *"Carrossel: <N> slides — `<slide_1.title>` → `<slide_N.title>`"*

### 6. Subagent 3: caption-writer

Invoque com:
```
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  maxHashtags: <config.caption.maxHashtags>
  signatureHashtags: <config.caption.signatureHashtags>
  ctaStyle: <config.caption.ctaStyle>
  tone: <config.identity.tone>
  voice: <config.voice>
  briefingPath: <paths.briefingPath>
  learningsPath: <paths.learningsPath>
```

Reporte: *"Legenda: <X> hashtag(s)"*

### 7. Renderer

```bash
spc render.mjs <versionDir> --client=<clientSlug>
```

Se falhar por validação Zod: **pare** e reporte. Não corrija JSON automaticamente — re-invoque o subagent com o erro como contexto.

### 8. Output final

```
✓ /carrossel pronto
  Cliente   : <displayName>
  Tema      : <tema>
  Slug      : <slug>
  Versão    : v<N>
  Slides    : <N> PNGs em images/<clientSlug>/carrossel/<slug>/v<N>/slides/
  Legenda   : images/<clientSlug>/carrossel/<slug>/v<N>/caption.txt (<X> hashtags)
  Fonte     : <chosen.url>
```

## Anti-padrões

- ❌ Pular subagents
- ❌ Editar JSON produzido por subagents (re-invoque se errado)
- ❌ Renderizar antes de ter slides.json válido
- ❌ Inventar conteúdo — tudo vem dos JSONs intermediários
- ❌ Usar template do cliente errado
