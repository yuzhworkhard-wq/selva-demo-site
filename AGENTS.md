<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

# Demo and sync (always)

The user reviews **only** the main-site demo: `site/` via `./scripts/serve.sh` (http://localhost:8123/), entering tools from the platform. Do not demo `apps/video-clone` with `npm run dev` (localhost:5180).

Work is not done until the main site is updated:

- Changes in `apps/video-clone/src/` require `npm run build` so artifacts land in `site/clone/` and sync to `source/clone/`.
- Changes in `site/` must be mirrored in `source/`.
- Do not say the change is finished if only the sub-app source changed.
