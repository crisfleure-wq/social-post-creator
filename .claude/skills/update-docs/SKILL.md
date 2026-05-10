---
name: update-docs
description: Checklist determinístico para atualizar documentação ao fim de uma task/sessão neste projeto. Use quando o hook Stop avisar, quando o usuário pedir "atualize a doc", "review docs", ou ao fechar uma feature/PR. Cobre CLAUDE.md, docs/specs/, docs/adr/, README e estrutura Diátaxis.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Update Docs — checklist de fim de task/sessão

Esta skill garante que a documentação reflete o que foi feito **e** o que ficou
pendente. É chamada pelo hook `Stop` (`stop-docs-reminder.sh`) ou manualmente
pelo usuário no fim de uma feature/PR.

## Princípio

Documentação é parte do *deliverable*, não tarefa "pra depois". O critério de
"task completa" inclui: o leitor que abrir o repo amanhã consegue entender
**o que mudou, por quê, e o que ainda falta** sem precisar ler o diff.

## Processo

### 1. Inventário do que mudou nesta sessão

- Liste arquivos modificados (`git status` se for repo Git, ou inspeção do
  contexto da sessão).
- Classifique por tipo de mudança:
  - **Nova feature / endpoint / comando** → exige spec.
  - **Decisão arquitetural** (escolha de stack, padrão, boundary) → exige ADR.
  - **Mudança de contrato** (API, evento, CLI flag) → exige bump de versão e
    nota de compatibilidade.
  - **Bugfix interno** sem mudança de comportamento externo → geralmente
    *não* precisa de doc; commit message basta.
  - **Refactor puro** → idem.

### 2. Verifique cada artefato de doc

| Arquivo | Quando atualizar |
|---|---|
| `CLAUDE.md` | Mudou stack, comando essencial, convenção, estrutura, ou regra dura ("não fazer X"). |
| `docs/specs/<feature>.md` | Feature nova, mudou objetivo/contrato/critério de aceite. |
| `docs/adr/NNNN-<slug>.md` | Decisão arquitetural relevante. Numeração sequencial, status (proposed/accepted/superseded). |
| `README.md` | Mudou setup, comando primário, ou descrição do projeto. |
| `docs/how-to/`, `docs/tutorials/`, `docs/reference/`, `docs/explanation/` | Diátaxis — atualize a categoria correspondente. |
| `CHANGELOG.md` (se existir) | Toda mudança user-facing. |
| OpenAPI / AsyncAPI (se existir) | Mudança de contrato — antes do código, idealmente. |

### 3. Documente o que **falta** (não só o que foi feito)

Documentação só do "feito" mente por omissão. Sempre registre:
- **TODOs conhecidos**: o que foi adiado e por quê.
- **Riscos / débito**: workarounds, atalhos, decisões temporárias.
- **Follow-ups**: próximos passos lógicos.

Onde colocar:
- Numa seção `## Próximos passos` ou `## Pendências` da spec/ADR.
- Issues do tracker se houver — referencie no doc (`Refs: #123`).

### 4. Cheque consistência

- Comandos no CLAUDE.md realmente funcionam? (Mude o caminho? Renomeou flag?)
- Caminhos de arquivos referenciados existem?
- Versões de stack batem com `package.json` / `pyproject.toml`?
- Links internos não estão quebrados?

### 5. Se nada mudou de superfície externa

Diga explicitamente: **"✓ docs ok — <razão de uma linha>"**.
Exemplos válidos:
- `✓ docs ok — bugfix interno em scripts/render.mjs sem mudança de API`
- `✓ docs ok — refactor sem mudança de comportamento externo`
- `✓ docs ok — só mexi em testes`

Não pule a checagem em silêncio. O hook quer ver a decisão, não a omissão.

## Output esperado

Markdown estruturado, conciso:

```markdown
## Update Docs — <data> — <descrição da sessão em 1 linha>

### Arquivos de doc atualizados
- `CLAUDE.md` — adicionou comando X
- `docs/adr/0003-render-puppeteer.md` — nova ADR

### Pendências registradas
- `docs/specs/single-image.md#proximos-passos` — suporte a 16:9 nativo

### Sem update necessário
- (nenhum) | (motivo)

### Próximos passos sugeridos
- (opcional) ações que ficaram fora do escopo desta sessão
```

## Anti-padrões

- ❌ Atualizar CLAUDE.md com TUDO que aconteceu — vira changelog. CLAUDE.md
  é manual operacional, não diário.
- ❌ Criar ADR pra decisão trivial. ADR é pra decisão estrutural com
  consequência arquitetural duradoura.
- ❌ "Vou documentar depois" — depois é nunca.
- ❌ Documentar o "como" do código (o código é a fonte). Documente o
  "porquê" e o "o quê externo".
- ❌ Spec gigante sem critério de aceite — vira ficção, não spec.

## Critério de sucesso

A skill termina quando, para cada arquivo de doc relevante:
- Foi atualizado, **ou**
- Foi explicitamente declarado "não precisa atualizar" com razão de uma linha.

Não há terceira opção.
