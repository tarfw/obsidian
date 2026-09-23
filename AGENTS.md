# Project instructions

Read `C:\Users\tarfr\.codex\RTK.md` and follow its shell-command guidance.

Use the installed TypeSafe skill at `.agents/skills/typesafe-ai/SKILL.md` when
planning or implementing AI judgments for this project. Read the relevant live
documentation as the skill requires. Keep deterministic business rules in code;
using the skill does not require adding TypeSafe calls to every workflow.

Use `tarv12.md` as the sole consolidated target architecture. It distinguishes
proposed work from existing implementation. Earlier architecture versions and
`techstack.md` are historical inputs, not competing instructions.

For new tables, columns and internal identifiers, use one semantic word in
lowercase. Do not use spaces, underscores, hyphens or joined multiword names.
Use structure for qualification (for example, `tasks.owner`). Preserve required
external API spellings behind adapters; do not rename existing interfaces without
a deliberate migration. Design for the full commerce cycle across domains using
the shared core and domain packages described in `tarv12.md`.
