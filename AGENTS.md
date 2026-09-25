# Project instructions

Read `C:\Users\tarfr\.codex\RTK.md` and follow its shell-command guidance.

Use the installed TypeSafe skill at `.agents/skills/typesafe-ai/SKILL.md` when
planning or implementing AI judgments for this project. Read the relevant live
documentation as the skill requires. Keep deterministic business rules in code;
using the skill does not require adding TypeSafe calls to every workflow.

Use `tarv12.md` as the sole consolidated target architecture. `space.md`,
`commerce.md`, and `site.md` define its three product contracts.

For new tables, columns and internal identifiers, use one semantic word in
lowercase. Do not use spaces, underscores, hyphens or joined multiword names.
Use structure for qualification (for example, `tasks.owner`). Preserve required
external API spellings behind adapters; do not rename existing interfaces without
a deliberate migration. Design for the full commerce cycle across domains using
the shared core and domain packages described in `tarv12.md`.

<!-- groma:start -->
## Groma

This project uses Groma. Before you scan, inspect, or curate architecture, or change files for a Backlog task, run `groma agent-instructions` and read the guide it names for that job. When it reports a first scan, ask the user whether they want you to curate the architecture. Do not edit Groma-owned architecture files directly.
<!-- groma:end -->
