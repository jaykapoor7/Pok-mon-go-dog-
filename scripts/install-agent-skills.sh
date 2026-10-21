#!/usr/bin/env bash
set -euo pipefail
# Run from the repository root. Installs complete upstream skill packages (including data,
# references and scripts) to both Claude Code and Codex project directories.
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "Node.js and npm are required" >&2
  exit 1
fi
install() {
  echo "Installing $2 from $1"
  npx --yes skills add "$1" --skill "$2" -a claude-code -a codex --copy -y
}
install anthropics/skills frontend-design
install vercel-labs/agent-skills vercel-react-best-practices
install vercel-labs/agent-skills web-design-guidelines
install nextlevelbuilder/ui-ux-pro-max-skill ui-ux-pro-max
install Leonxlnx/taste-skill design-taste-frontend
install vercel-labs/agent-browser agent-browser
install wshobson/agents wcag-audit-patterns
if [[ "${1:-}" == "--video" ]]; then
  install remotion-dev/skills remotion-best-practices
fi
echo "Installation finished. Check results: npx --yes skills list"
echo "Browser QA requires installing the agent-browser CLI separately."
echo "Review changes and commit updated skill packages when satisfied."
