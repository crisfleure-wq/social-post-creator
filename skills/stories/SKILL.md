---
description: Gera sequência de stories Instagram (1080×1920) para um cliente específico. Use quando pedir /stories, criar stories, ou gerar sequência vertical.
---

# /stories — Orquestrador de Stories

Você é o **orquestrador** do pipeline de stories multi-cliente.

## Input

`$ARGUMENTS` contém: `<cliente> <tema> [N slides]`

Exemplos:
- `/stories blink-marketing dica rápida sobre tráfego pago`
- `/stories blink-marketing bastidor: planejamento de cliente 5 slides`

## Processo

### 1. Parse dos argumentos

- Primeiro token = `clientSlug`
- Número no final (ex: `5 slides` ou `5`) = override de slide count
- Resto = `tema`

### 2. Carregar contexto do cliente

```bash
spc-load-client "<clientSlug>" stories
```

### 3. Resolver slug + versão

```bash
spc-resolve-output "<clientSlug>" "<tema>" stories
```

Crie o `versionDir` com `mkdir -p`.

Comunique: *"Cliente: `<displayName>` · Formato: stories 1080×1920 · v<N>"*

### 4. Subagent 1: news-scout

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

### 5. Subagent 2: carousel-writer

Invoque com o `carousel-writer`, mas com contexto de formato `stories`:

```
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  displayName: <config.displayName>
  format: stories
  canvas: { width: 1080, height: 1920 }
  designSystemPath: <paths.designSystemPath>
  tokensPath: <paths.tokensPath>
  templatesDir: <paths.clientDir>/design/templates/stories/
  briefingPath: <paths.briefingPath>
  learningsPath: <paths.learningsPath>
  slideCount:
    min: <formatConfig.slideCount.min>
    max: <formatConfig.slideCount.max>
    default: <slideCountOverride ou formatConfig.slideCount.default>
  tone: <config.identity.tone>
  voice: <config.voice>
```

> Nota: se `templates/stories/` não existir para o cliente, use os templates de carrossel como fallback e informe o usuário.

### 6. Subagent 3: caption-writer

```
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  maxHashtags: <config.caption.maxHashtags>
  signatureHashtags: <config.caption.signatureHashtags>
  ctaStyle: <config.caption.ctaStyle>
  tone: <config.identity.tone>
  briefingPath: <paths.briefingPath>
```

### 7. Renderer

Stories usam canvas 1080×1920. Passe o canvas override:

```bash
spc render.mjs <versionDir> --client=<clientSlug> --canvas=1080x1920
```

### 8. Output final

```
✓ /stories pronto
  Cliente   : <displayName>
  Tema      : <tema>
  Slug      : <slug>
  Versão    : v<N>
  Slides    : <N> PNGs em images/<clientSlug>/stories/<slug>/v<N>/slides/
  Legenda   : images/<clientSlug>/stories/<slug>/v<N>/caption.txt
  Fonte     : <chosen.url>
```
