# HARD RULES — Kivan workspace

These are not suggestions. Each section is a blocking checklist: if any box
cannot be checked, STOP that action and either fix the blocker or surface it
to the user. Never proceed with an unchecked box, never mark a box from
memory — run the command/check each time.

## 0. The persona system — training happens everywhere

The team lives at **`github.com/srivardhanjalan/personas`** (PRIVATE; local
clone `~/workspace/personas`): one `.md` per persona — software-developer,
content-writer, content-designer, educator, team-leader, product-designer,
product-manager (more as the user adds them).

- [ ] **Route every lesson.** When the user issues a rule or a lesson is
      learned in ANY repo: update this file (if it changes how the agent
      operates) AND the persona file(s) the lesson belongs to — phrased in
      that craft's voice, with the war story that earned it. Practices
      without provenance get deleted.
- [ ] **Personas influence each other.** Cross-link the affected personas'
      *Influences* sections when a rule spans crafts; a spanning rule lives
      in both files, each from its own angle.
- [ ] Persona updates land via PR in that repo; the user's rule-issuing
      message is the approval for the training PR that captures it.
- [ ] This system spans all repos in the workspace — the personas are the
      accumulating team; keep them trained.
- [ ] **The brainstormer persona observes continuously**: when work
      surfaces a signal (something the user builds, repeats, or struggles
      with), append to `personas/thinking/` — signal → idea → research →
      verdict (pursue/park/kill) → next probe. Killed ideas keep their
      autopsy. Surface only validated ideas to the user.

## 1. Git & GitHub — every repo in this workspace

- [ ] **New-repo bootstrap — run at creation, every repo:**
      (1) `main-pr-only` ruleset — require PR, block force-push and branch
      deletion, zero bypass actors — then PROVE it with a probe push that
      must be rejected. Private repos on the free plan reject rulesets
      (403: Pro required) — note it and rely on the behavioral rule until
      the plan allows enforcement.
      (2) Enable GitHub Pages (main, /) for public content repos and add a
      site index. NEVER enable Pages on secret stores or the vault —
      serving secrets as a website is exposure with no upside.
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
- [ ] **A squash-merge severs ancestry — sync stacked children immediately.**
      When a base branch (e.g. a step baseline) squash-merges, a child
      branch's deletions can resurrect silently on its next merge from main:
      git treats a file absent from the child but present in the squash as a
      clean add, because deletes only conflict when the file exists in the
      merge base. The moment the base merges: `git merge origin/main` into
      the child, diff the result for resurrected files, and re-run the FULL
      gate — a conflict resolution is a change round. (Step 04's merge
      resurrected `KivanLoader.tsx`; tsc caught it only by luck of a renamed
      token.)

## 2. Zero bloat — the codebase's constitution

- [ ] **Never add anything that might be needed later.** No token, prop,
      export, config entry, dependency, or component without a caller at
      commit time. Speculative abstraction is a defect, not foresight.
- [ ] **Cleanliness claims come from tools, never from grep-and-assert.**
      The gate is `tools/audit-step.sh` (kivan-tutorial): tsc → knip →
      jscpd → color-literal report → AI semantic reviewer.
- [ ] **Run the gate to a FIXED POINT — 3 consecutive clean runs.**
      Deleting dead code orphans other code, AND the AI stage is a sampler:
      runs 7–8 of step 04 were clean, run 9 found real items on unchanged
      code. The fixed point is declared only after 3 consecutive no-finding
      runs on unchanged code, the middle one under the alternate lens
      (`AUDIT_LENS=deadweight`). Any finding resets the count. Deterministic
      stages (tsc/knip/jscpd/grep) count from a single run. (It took 6
      rounds on an 800-line step, 11+ on step 04.)
- [ ] **Colors/radii/shadows/spacing are tokens.** A literal in a component
      is either a documented single-use one-off or a defect. A value used
      twice, or with semantic meaning, becomes a token at that moment.
- [ ] **One concern per file, named for what it contains.** Terraform: one
      file per resource/concern (providers, variables, outputs, ecr.tf,
      apprunner.tf, iam.tf, …) — never a monolithic main.tf. FastAPI:
      main.py only assembles (middleware + router includes); routers live in
      app/routes/<domain>.py, models in app/models/<domain>.py, one domain
      per file. The same principle applies to any stack: a file's name must
      tell you what's inside, and growth happens by adding files, not by
      fattening one.
- [ ] **Comments must not lie.** If a comment claims a relationship
      ("defaults to X", "kept in sync with Y"), the code must enforce it or
      the comment must go.

## 3. Logical unification & abstraction — hunt duplication by meaning

- [ ] **Every change round ends with a semantic-duplication hunt**, not just
      mechanical checks. Ask, in order: do two screens/views want one layout
      or scaffold? Do two functions do one job two ways? Is a JSX/logic
      block a shared component or hook waiting to be named? Is a repeated or
      semantic value a token/config entry? (The AI reviewer in the gate runs
      exactly these questions — it is mandatory, never waived.)
- [ ] **The extraction bar, both directions:** extract when it reduces net
      complexity in the code as it exists NOW — a second real caller, a
      semantic value hiding in literals, one concept spelled multiple ways
      (`pill`+`full`, three circle idioms). Do NOT extract for imagined
      future callers — speculative abstraction is a defect, exactly like
      dead code.
- [ ] **Where shared things live:** shared *values* → tokens/config; shared
      *looks* → components; shared *behavior* → hooks/utils; shared
      *scaffolds* → layout components. One concept, one name, one place —
      if two names mean the same thing, collapse them.
- [ ] **Unify to a fixed point.** Extraction changes the code, which exposes
      the next duplication (6 rounds on an 800-line step). Repeat the hunt
      until a full pass finds nothing.

## 4. Verification & honesty

- [ ] **Direct-loop reviews; delegated subagents execute.** The main
      (directing) loop does orchestration, scoping, and EVERY review
      verdict — whatever model it runs on. Mechanical execution — builds,
      file sweeps, E2E driving, ports — is delegated to subagents with a
      precise brief and hard constraints (no git, evidence-only reports);
      the directing loop reviews their evidence before anything ships.
      `claude -p` reviewers pin a model for consistency across runs
      (`AUDIT_REVIEWER_MODEL`, default `claude-fable-5` in the gate) so a
      verdict doesn't drift with whatever CLI default is current.
- [ ] **Everything created gets an adversarial review before it ships.**
      After creating ANY artifact — code, README, Medium post, image, script,
      config, PR description — run an adversarial reviewer against it
      (`claude -p` with a brief to attack: correctness, false claims, missing
      cases, misleading copy, broken commands). Then address EVERY finding:
      fix it, or record the explicit reason it stands. AI reviewers are
      samplers — a review loop ends only after **3 consecutive no-finding
      passes on the unchanged artifact**, each pass under progressively more
      scrutiny than the last (a deeper, more adversarial lens each round,
      never the same pass re-run); any finding resets the count. (The gate's semantic
      reviewer covers step code; everything else gets its own adversarial
      pass.)
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

## 5. This machine's environment traps

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
- [ ] **The canonical secret store is `github.com/srivardhanjalan/secrets-vault`**
      (PRIVATE; local clone at `~/workspace/secrets-vault`). One directory
      per project, files mirroring their in-project paths, every key logged
      in the project's NOTES.md (what/issuer/rotation). New secrets go to
      the vault first, then the gitignored local copy. That repo must never
      be public or referenced from public code.
- [ ] **AWS: every resource is created through Terraform, tagged via the
      provider's `default_tags` (Project + Environment), and thereby in the
      stack's tag-based resource group — no untagged, ungrouped, or
      console-created resources.** Where a service self-creates a resource
      (e.g. App Runner log groups), the deploy script must tag it into the
      group and bound it (retention), and teardown docs must sweep it.

## 6. Working with the user

- [ ] **Announce the plan before executing a multi-step task — then proceed,
      no confirmation gate.** When a task needs breaking down, FIRST show a
      labeled plan: how the task decomposes into sub-tasks and which
      persona/team-member handles each. Then start immediately. This is a
      heads-up for transparency, not an approval checkpoint — state the
      breakdown and the cast, and go; only an explicit "wait" stops it.
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
- [ ] **Every post is crisp, the author's story, and instructive — all
      three, no trade-offs.** CRISP: zero bloat applies to prose exactly as
      to code — every sentence is either the story or the lesson; cut
      anything that is neither (throat-clearing, restated points, decorative
      asides). STORY: the series speaks as Srivardhan's lived build journey
      — "I", a real arc (setup → struggle → resolution), own decisions and
      scars; never a detached narrator, never phrasing implying anyone else
      did the work. INSTRUCTIVE: these are tutorial posts — a reader must
      finish able to DO the step; the story carries the lesson, never
      replaces it. If a section reads like a manual, rewrite it as the
      moment it was lived; if it reads like a memoir, restore the lesson.
- [ ] **Titles: wit that carries the meaning ("Zero to Shipped"), never
      wit that replaces it.** The test: at zero context, an uncharitable
      reader must still decode what the piece delivers AND want to click.
      Boring-but-accurate fails (no pull); clever-but-opaque fails
      (misread); the target is both. Specifics and war stories live in the
      subtitle.
- [ ] **Every article carries multiple images** — the cover plus a visual
      for each major section (a real terminal, a token sheet, a before/after
      panel, real screenshots), in the house style. A wall of prose is a
      defect.
- [ ] **Article imagery must depict the article's actual content.** A cover
      or in-post image is built from the subject itself — a setup post shows
      the script's real terminal output, a UI step shows real screenshots of
      that step, an infra post shows that step's stack — never generic app
      shots or decoration. Prefer real artifacts over mocks whenever the
      thing exists to capture.

## 7. The tutorial's own conventions (kivan-tutorial)

- Step folders: `NN-name`, self-contained, runnable; posts numbered to match.
- Per step: baseline commit (copy of previous step, via PR) → code PR →
  content PR; step README and post deep-link the code PR's Files-changed.
- **Every step ships a LinkedIn deliverable too** (user directive
  2026-07-18): a step is content-complete only with BOTH the Medium article
  AND a LinkedIn post+carousel at `linkedin/NN-name/` (`post.md` +
  `carousel.html` + exported `<slug>-carousel.pdf`), landing as its own
  `content/NN-linkedin-carousel` PR (separate from the step content PR). The
  carousel clones the committed template and reuses that step's
  mocks/screenshots; both post and carousel pass their review panel
  (content-writer, social-media-manager, educator, graphic/content-designer)
  before the PR opens. Owned by the social-media-manager persona.
- `tools/audit-step.sh <step>` is the pre-PR gate. Semantic review runs as
  the AI reviewer inside the gate (never waived, never "attested away" when
  the CLI is available).
- Cache-bust raw.githubusercontent image URLs with the commit hash when
  rebuilding paste-HTML.
- Every content PR that adds a post, mock page, or step also updates the
  Pages site index (`index.md`) — it is hand-maintained and goes stale
  silently otherwise.
