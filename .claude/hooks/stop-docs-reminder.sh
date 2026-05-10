#!/usr/bin/env bash
# stop-docs-reminder.sh
# Dispara no evento Stop (fim de sessão/turno).
# Bloqueia o stop UMA VEZ por sessão, lembrando Claude de checar se a
# documentação precisa ser atualizada com o que foi feito (e o que falta).
#
# Heurísticas:
#   - Só nudge se houve Write/Edit/NotebookEdit em arquivos relevantes
#     (ignora outputs efêmeros: images/**, *.png, *.jpg, *.html debug, etc).
#   - Respeita stop_hook_active pra nunca recursar.
#   - Marker por session_id evita lembrar repetidamente no mesmo turno-loop.
set -uo pipefail

INPUT=$(cat)

# Anti-loop: se já estamos dentro de um stop hook, sai limpo.
STOP_ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty')

MARKER="/tmp/claude-docs-reminded-${SESSION_ID}"

# Já lembramos nesta sessão — não chateia mais.
if [ -f "$MARKER" ]; then
  exit 0
fi

# Sem transcript = não dá pra inspecionar; sai silencioso.
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

# Conta edits em arquivos relevantes (código, config, docs).
# Ignora outputs efêmeros do pipeline (images/**, html debug, png/jpg).
RELEVANT_EDITS=$(jq -r '
  select(.message.content?) |
  .message.content[]? |
  select(.type == "tool_use" and (.name == "Edit" or .name == "Write" or .name == "NotebookEdit")) |
  .input.file_path // .input.path // empty
' "$TRANSCRIPT_PATH" 2>/dev/null \
  | grep -v -E '/images/' \
  | grep -v -E '\.(png|jpg|jpeg|webp|gif|pdf)$' \
  | grep -v -E '/html/slide_[0-9]+\.html$' \
  | grep -v -E '/(meta|research|slides|image-prompt)\.json$' \
  | grep -v -E '/caption\.txt$' \
  | grep -v -E '^/tmp/' \
  | head -1 || true)

# Sem edits relevantes (ex: sessão de pesquisa, ou só rodou /criar-post)
# → não há docs pra atualizar. Sai silencioso.
if [ -z "$RELEVANT_EDITS" ]; then
  exit 0
fi

# Marca que já lembramos nesta sessão.
touch "$MARKER" 2>/dev/null || true

# Bloqueia o stop com a mensagem. Claude vê o `reason` como input do usuário
# e DEVE responder antes de poder encerrar.
cat <<'JSON'
{
  "decision": "block",
  "reason": "Antes de encerrar — esta sessão modificou código/config. Verifique se a documentação precisa de update:\n\n1. Invoque a skill `update-docs` para rodar o checklist deste projeto (CLAUDE.md, docs/specs/, docs/adr/, README).\n2. Atualize o que mudou de superfície externa (contratos, comandos, fluxos, decisões arquiteturais).\n3. Anote o que ficou pendente (TODOs, follow-ups, débito conhecido) numa seção `## Próximos passos` da spec ou ADR correspondente.\n\nSe nada do que foi feito impacta documentação (ex: bugfix interno, refactor sem mudança de comportamento), responda explicitamente '✓ docs ok — <razão>' e siga. Não pule essa checagem em silêncio."
}
JSON
