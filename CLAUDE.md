# HARD RULES — Kivan workspace

These are not suggestions. Each section is a blocking checklist: if any box
cannot be checked, STOP that action and either fix the blocker or surface it
to the user. Never proceed with an unchecked box, never mark a box from
memory — run the command/check each time.

## 1. Git & GitHub — every repo in this workspace

- [ ] **NEVER commit or push directly to main/master.** Every change — code,
      docs, images, tooling — lands via branch → PR → squash-merge.
      (kivan-tutorial enforces this with an active GitHub ruleset, no
      admin bypass. Behave identically in repos that don't.)
- [ ] **NEVER `git reset`/force-push shared history to fix a mistake.**
      Fix forward: amend inside the open PR, or a revert commit/PR if merged.
      A reset of pushed history happens only on an explicit user order, and
      only after a full snapshot of the current state.
- [ ] **Before `git add -A` ever meets `git commit`:** run `git status` and
      read the staged list. (A deleted-but-tracked folder once shipped as a
      silent deletion this way.)
- [ ] **Run ALL gates before `gh pr create`, not after.** PRs cannot be
      deleted — mistakes in them are permanent public record.
- [ ] **NEVER merge a PR without an explicit user go-ahead.** PRs stay open
      for review; "gates pass" is necessary, not sufficient.
- [ ] **One PR = one readable story.** Step code and step content are
      separate PRs; a PR's Files-changed view must read as one pure delta.
      Never let an add-then-delete narrative into a single PR's history.

## 2. Zero bloat — the codebase's constitution

- [ ] **Never add anything that might be needed later.** No token, prop,
      export, config entry, dependency, or component without a caller at
      commit time. Speculative abstraction is a defect, not foresight.
- [ ] **Cleanliness claims come from tools, never from grep-and-assert.**
      The gate is `tools/audit-step.sh` (kivan-tutorial): tsc → knip →
      jscpd → color-literal report → AI semantic reviewer.
- [ ] **Run the gate to a FIXED POINT.** Deleting dead code orphans other
      code; repeat the full gate until it exits clean. A single pass is
      never proof (it took 6 rounds on an 800-line step).
- [ ] **Colors/radii/shadows/spacing are tokens.** A literal in a component
      is either a documented single-use one-off or a defect. A value used
      twice, or with semantic meaning, becomes a token at that moment.
- [ ] **Comments must not lie.** If a comment claims a relationship
      ("defaults to X", "kept in sync with Y"), the code must enforce it or
      the comment must go.

## 3. Verification & honesty

- [ ] **Never say "verified/works/done" without having executed the thing
      in this session** — UI: build + boot + screenshot; API: real request;
      script: a real run (including its failure path). Files existing ≠
      software working.
- [ ] **After every substantive change round: re-verify.** tsc + gate +
      (for UI) reload and screenshot. Claims from before the change are void.
- [ ] **A failing assertion stops the pipeline.** Never let a script
      blunder past a failed patch/check (bash: `set -euo pipefail`; a
      failed Python assert must abort the surrounding flow).
- [ ] **Report failures verbatim, immediately.** Two failed attempts at the
      same fix → change approach or surface to the user; never grind.

## 4. This machine's environment traps

- [ ] Metro/Expo for simulators: **always `--localhost`** (LAN IPs are
      blocked); never pipe a long-running server through `head`/`grep`
      (SIGPIPE kills it) — `nohup … > logfile &` and read the file.
- [ ] **Watchman cannot spawn from harness shells** (reduced priority).
      Steps disable it via `metro.config.js` (`useWatchman: false`) and
      jest config (`watchman: false`). Don't re-enable; don't retry the
      daemon.
- [ ] **Expo dependency versions are set by `npx expo install --fix`**,
      never hand-pinned ranges (React must exactly match Expo Go's
      renderer).
- [ ] **App Runner images build ONLY via the colima-rosetta docker driver**
      (`docker build` on the colima-rosetta context). buildx/QEMU builds
      pass locally and die on AWS with CREATE_FAILED and no logs.
- [ ] Secrets live only in gitignored `frontend/.env.local` and
      `infra/terraform.tfvars`. Never in code, never in a commit, never in
      a public image (mask account IDs in screenshots/heroes).

## 5. Working with the user

- [ ] **Design changes: propose before implementing.** Standing directive.
- [ ] **"Why/what" questions get an answer and assessment first** — do not
      rush into action while a question is on the table.
- [ ] **Before any destructive/irreversible operation** (reset, rm of
      non-generated files, force-push, visibility change): snapshot what
      will be lost, state the blast radius, and confirm it matches an
      explicit user instruction.
- [ ] **Published content must match code reality.** Any code change that
      invalidates a claim in a Medium post/README triggers a sync pass in
      the same round (and a note if the post is already live).
- [ ] **Mocks must match the end experience exactly** — when the app
      changes visually, regenerate the affected mock/hero images in the
      same round.

## 6. The tutorial's own conventions (kivan-tutorial)

- Step folders: `NN-name`, self-contained, runnable; posts numbered to match.
- Per step: baseline commit (copy of previous step, via PR) → code PR →
  content PR; step README and post deep-link the code PR's Files-changed.
- `tools/audit-step.sh <step>` is the pre-PR gate. Semantic review runs as
  the AI reviewer inside the gate (never waived, never "attested away" when
  the CLI is available).
- Cache-bust raw.githubusercontent image URLs with the commit hash when
  rebuilding paste-HTML.
