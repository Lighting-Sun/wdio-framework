# Handoff — WebdriverIO framework audit remediation

**Written:** 2026-09-23, current as of round 12 (replaces the round-11 handoff of the same day)
**Integration:** `fix/audit-critical-findings` is **merged to `main`**, squash commit `9f18c20` via [PR #23](https://github.com/Lighting-Sun/wdio-framework/pull/23). New work starts from `main`, on a new branch.
**Machines:** the rounds so far ran on **Windows, Node 24**. The round-12 docs update was written on **macOS, Node 26.8.1, without `gh`**. That matters for #29; see below.
**Read first:** [audit.md](audit.md). It is the plan, the spec and the status tracker in one document.

---

## Where this stands

A practice WebdriverIO + TypeScript framework testing [saucedemo.com](https://www.saucedemo.com/). An audit produced 27 findings; four more surfaced while fixing them — #28 and #29 during the rounds, then #30 and #31 from round 10's first CI run — so the audit runs to 31.

**27 fixed · 2 deferred by the owner's decision · 1 closed by decision · 1 open.**

The one open finding is **#29** — diagnosed, narrowed, two untested experiments left. **#30 is closed by decision** (the CI trigger policy is intentional) and **#31 was fixed in round 11** (`.nvmrc` → 20.19.0, verified in CI). Both came out of round 10's first real CI run; see *CI status* below.

Eleven rounds of work went onto the branch, 34 commits in all, and landed on `main` as **one squash commit, `9f18c20`**. Most rounds are two commits: one `fix:`/`refactor:`/`chore:`/`test:` for the code, one `docs:` updating the audit. Round 10 is the exception: it changed no code, only ran CI for the first time and recorded what that exposed. Round 12 also changed no code: it merged the branch and recorded `ci.yml`'s first runs.

**Because of the squash, `main`'s history no longer shows the per-round commits or their commit messages, which hold the verification evidence.** They survive on `fix/audit-critical-findings`: `git log --oneline 10027e6..origin/fix/audit-critical-findings` lists them. **Don't delete that branch** without asking the owner, or that evidence becomes hard to reach. `audit.md` cites those short hashes.

**Keep `audit.md` current.** It carries a Progress section, a status column in the priority table, and a status blockquote on every finding that has been touched. That is how the next session knows what happened.

---

## Do not re-litigate these

The owner made these calls explicitly. Do not reopen them without being asked.

| Decision | Detail |
|---|---|
| **#30 — CI triggers stay as they are** | CI runs at PR time and on `main`, not on feature-branch pushes. The finding is **closed**, not deferred: there is no future pass in which the triggers get broadened. Use the `ci-on-demand.yml` dispatch to check a branch. |
| **#2 and #5 stay deferred** | CI artifact-on-failure, and the broken `dev` environment. Severity stays **Critical** — deferring work and downgrading risk are different decisions, and the audit records it that way. Do not "helpfully" fix them while editing those files. |
| **Visual testing is out of scope** | `@wdio/visual-service` was dropped in round 6 (#20). Nothing was lost: it had no assertions, no baseline directory, and `.gitignore` made baselines uncommittable. Do not reintroduce it. |
| **Assertion style** | Retry helpers live in the factory (`expectText`, `expectTextsFromElements`, `expectEventuallyEquals`), surfaced through page methods. Specs never receive raw elements. This preserves "no `$()` outside the factory" and keeps Allure logging in one place. |
| **Test data** | Fixed product lists in `placeHolderData.json`. No randomness, no seeding. |
| **Naming** | Hungarian prefixes were dropped (102 identifiers). The TypeScript signature carries the type. |
| **Fixtures** | `tests/support/flows.support.ts` holds reusable *preconditions*. A test whose subject **is** logging in must drive the login page directly — a fixture must never hide the thing under test. The two `login.spec` login tests are intentionally not converted. |
| **Prettier scope** | `*.md` and `.github` are in `.prettierignore` on purpose. `audit.md` and this file carry hand-aligned tables, and reformatting them churns every future diff. |

---

## Working agreement that has been in force

This matters more than any individual fix. The owner has consistently valued evidence over assertion.

1. **Verify against the old behavior, not just the new.** Don't claim the loop is bounded — run the old form, show the 60s timeout, then show the 2s failure. Don't claim an env var is wired — set it to a bogus value and show the tests break.
2. **A test that passes immediately proves nothing.** The four sort tests were mutation-checked by pairing each option with the wrong sort function; all four failed, which is what made the green run meaningful.
3. **Never commit on a red or unverified suite.**
4. **Report honestly when a fix is wrong.** The `onWorkerEnd` hook was implemented backwards first and the verification run caught it. Finding #1's fix turned out to be incomplete for six rounds. Both were surfaced plainly and recorded in the audit, not quietly patched.
5. **Say what was left untouched.** Each round lists the adjacent findings it did *not* fix, so the diff stays reviewable.
6. **Commit messages carry the why and the verification evidence.** Read `git log` before writing one.
7. Attribution on every commit: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## Commands

```bash
npm run typecheck                        # tsc --noEmit — must be clean before any commit
npm run lint                             # ESLint — also must be clean before any commit
npm run format                           # Prettier (code only; *.md and .github ignored)
npm run format:check
npm test                                 # full suite: 4 spec files, 11 tests, ~6s
npm test -- --spec tests/specs/filter.spec.ts
npm test -- --suite loginAndPurchase
WDIO_LOG_LEVEL=info npm test             # raise log level without touching the config
npm run open-allure                      # view the last report
```

Pushing a feature branch starts **no** CI run. That is deliberate (see #30). To check a branch in real CI before opening a PR:

```bash
gh workflow run "CI on demand" --ref <branch> -f environment=qa -f browser=chrome -f artifacts=true
gh run watch <run-id> --exit-status
```

`typecheck` and `lint` both run in CI, before the suite, in both workflows. The old `wdio` script is gone — `test` takes arguments after `--`. Node version lives in `.nvmrc` (20.19.0); both workflows read it via `node-version-file`. Runner is **tsx**, Chrome runs headless, Node 24 locally.

### CI status

**Both workflows have now run, and every run was green.** Before round 10 neither had. Every CI change from round 8 had been written and reasoned about but never executed.

**A feature-branch push starts no run at all, by design.** `ci.yml` triggers on pushes to `main` / `continous-integration` and on pull requests to `main`. The audit branch matched neither, so its pushes on 2026-09-23 started nothing until PR #23 was opened. The owner confirmed that policy the same day — finding #30 is **closed, not open**. Do not expect a push to trigger CI, and do not "fix" the triggers.

**To check a branch before a PR exists, dispatch `ci-on-demand.yml` against it.** Under this policy that is the supported path, not a workaround. The command is in the Commands section above.

| Run | Node | Result |
|---|---|---|
| [35840206691](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35840206691) | 20.17.0 | Green in 44 s. First execution of every round-8 CI change. |
| [35844385334](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35844385334) | 20.19.0 | Green. Verified the #31 bump: `EBADENGINE` 14 → 0. |
| [35889925746](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35889925746) | 20.19.0 | **`ci.yml`'s first run**, on PR #23 at `4205dc2`. Green in 51 s. |
| [35891879515](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35891879515) | 20.19.0 | `ci.yml` on `main` after the merge, at `9f18c20`. Green in 52 s. |

The first run confirmed each round-8 change individually rather than resting on the green checkmark: `.nvmrc` resolving through `node-version-file`, typecheck and lint running before the suite, the collapsed Test step building the right arguments, `WDIO_LOG_LEVEL` producing 1,881 INFO lines where local gives 0, 11 tests passing on ubuntu, `onWorkerEnd` correctly silent on green, and the artifact genuinely uploading — 1,026,451 bytes, checked through the REST API rather than from the green step, because `if-no-files-found: warn` lets that step pass having uploaded nothing. The full evidence table is in `audit.md` under *CI verification*.

**Three things to carry forward:**

- **`ci.yml` is proven, with one gap.** On both of its runs every step succeeded, and the `allure-report` artifact uploaded (1,026,497 and 1,026,439 bytes), which was checked through the REST API. `git diff 4205dc2 9f18c20` is empty, so the merge changed nothing the PR run had tested. **The gap: nobody has read the test count out of a `ci.yml` log.** Job logs need an authenticated session, and the round-12 machine had no `gh`. The Test step passing means every spec passed. The count itself is still unchecked.
- **A Node version bump cannot be verified on this machine.** Local is Node 24, where every engine range already passes, so `EBADENGINE` warnings do not reproduce here at all. A clean local install looks like evidence and is worth nothing; the count has to be read out of a CI install log. This is how #31 was verified.
- **Two annotations appear on every run.** `actions/checkout@v4`, `setup-node@v4` and `upload-artifact@v4` target Node 20 and are being force-run on Node 24 — bump them to `@v5` when convenient. Separately, `ubuntu-latest` migrates to Ubuntu 26 on 2026-10-19.

---

## The only open finding: #29

### A worker process crashes during startup

**Not a test bug. Not an assertion failure. The Node worker process dies.**

```
DEBUG @wdio/local-runner: Runner 0-2 finished with exit code 3221226505
```

`3221226505` = `0xC0000409` = Windows `STATUS_STACK_BUFFER_OVERRUN`, a fail-fast hard crash.

The crashed worker's log stops after `Using Chromedriver … from cache directory` and never reaches `Started Chromedriver … on port` or `POST /session`. Healthy workers in the same run reach both. The crashed worker leaves no `wdio-chrome-0-N-*` profile directory, although its own chromedriver log shows the driver starting fine. The driver came up and the worker died around it, roughly 750 ms in.

**That fully explains the missing Allure result and missing screenshot** — `afterTest` cannot run in a process that no longer exists.

**Three things are settled:**

- **It is not specific to any spec file — this is settled, not inferred.** Three captures, three different victims: `filter.spec`, then `login.spec`, then `completePurchase.spec`. Every one had the same exit code, the same log truncated at exactly the same line, the same missing profile directory. The crash takes whichever worker loses the startup race. **Do not go hunting for a cause inside a spec** — the finding's original title said `filter.spec` and that was the most misleading thing about it.
- **`@wdio/visual-service` is ruled out.** Removing it and re-running the loop reproduced the crash at the same rate with the same signature.
- **The rate is roughly 1 run in 25–40**, per-run rather than per-spec. It also appeared on a routine verification run on 2026-09-23, so it is very much still live.

**Every capture came from a Windows machine** (the exit code is a Windows status code, and the cache lives under `AppData`). **Only Windows can test the experiments below.** On macOS or Linux, the only useful result would be a crash, and even that would be a different crash from this one.

**What is still unknown: the crash mechanism.** All four workers resolve ChromeDriver from one shared cache directory under `AppData\Local\Temp` and spawn drivers within ~350 ms of each other. Plausible, unproven — keep it a hypothesis, not a conclusion.

**Two untested experiments remain.**

`maxInstances: 2` — be clear about what a result means. Fewer crashes would be a *mitigation* that costs wall-clock time, not a root-cause fix; the mechanism would still be unexplained. Don't let it land in the audit as "fixed" if it lands as "papered over."

**A per-worker ChromeDriver cache directory** — cheaper, and strictly more informative. The shared cache is the stated hypothesis and nothing has tested it directly. Giving each worker its own directory tests contention without paying the serialization cost, and unlike `maxInstances: 2` a positive result would actually *explain* the mechanism rather than only suppress the symptom. Worth doing first.

**How to reproduce.** Run the full suite in a loop with `--logLevel debug --outputDir <per-run dir>`, keeping logs only from runs that exit non-zero. 40 runs takes about four minutes. Read the launcher's `wdio.log` for the exit code and compare the crashed worker's spec log against a healthy one from the same run.

**Beware the statistics.** At a 1-in-40 base rate, a clean 40-run batch is weak evidence — roughly what luck produces anyway. A crash *with* a candidate fix applied is strong evidence against that fix. Interpret accordingly.

**Related loose end:** the `retried 2x` anomaly against a retry budget of 1 has reproduced in all three captures. It correlates with the crash path rather than appearing at random, so it is a lead rather than the arithmetic puzzle it first looked like.

---

## Gotchas discovered the hard way

**`await $$(...)` — the `await` is load-bearing, and ESLint says otherwise.** WDIO types `ChainablePromiseArray` as extending `AsyncIterators`, not `Promise`, so `@typescript-eslint/await-thenable` flags it. The runtime object *is* thenable. Probed directly: `await $$(...)` gives a real Array whose `.length` is a number; `$$(...).length` without the await is a Promise. Removing it makes `initialCount` a Promise and silently skips the loops in `clickAllIfExists` and `removeAllItemsFromCart` — **tests would still pass while doing nothing.** There is a scoped `eslint-disable-next-line` on it in `getElements`. Don't "clean it up."

**`onWorkerEnd(cid, exitCode, specs, retries)` — `retries` is the budget REMAINING, not the number used.** The launcher documents it as "Number or retries remaining." Reading it as retries-used reports every spec on a fully green run as flaky. Correct test is `SPEC_FILE_RETRIES - retries > 0`. Don't "simplify" it back.

**Allure's `addStep` and `addAttachment` return `Promise<void>`.** Not awaiting them is a floating promise. The screenshot attach in `afterTest` went unawaited from round 1 until round 7, which meant the failure screenshot could be lost during teardown — the exact thing finding #1 exists to prevent. ESLint caught it.

**Singleton page objects are fine under parallel execution.** The old architecture doc claimed otherwise. Each spec file runs in its own worker *process*, so every worker gets its own module instances. Nothing is shared. Don't "fix" the singleton exports on that basis.

**Session state does not reset between `it` blocks.** One browser session serves a whole spec *file*. `resetBrowserState()` must stay in every `beforeEach`, and must run *after* navigation, since storage is origin-scoped.

**Cleanup belongs in hooks, never at the bottom of a test body.** A failing test does not run to completion, so trailing cleanup silently does not happen and the next test inherits dirty state.

**Locators key off SauceDemo's `data-test` slugs, not visible text.** `UtilsMethods.toProductSlug()` turns "Sauce Labs Onesie" into `sauce-labs-onesie`, and `:has(button[data-test$='-sauce-labs-onesie'])` finds the card. The `$=` suffix match is deliberate — it survives the button flipping between `add-to-cart-` and `remove-`.

**Dump the live DOM before rewriting locators.** Doing so revealed that `inventory_item_name` no longer carried the trailing space the old selector matched on — that locator had been dead, not merely fragile.

**`getSelectorByValue` rejects quote characters by design.** Correct XPath escaping needs `concat()`, which string substitution cannot express. Failing loudly beats building a broken selector silently.

**Credentials come from `tests/support/credentials.support.ts`,** which reads `SAUCE_USERNAME` / `SAUCE_PASSWORD` (and the `LOCKED_OUT_` pair) with the JSON as fallback. Specs import from there. Other fixture data still comes from `placeHolderData.json`.

**`smoke` is a grep, not a suite, deliberately.** `@smoke` tags individual tests across several files. A `suites` entry would select whole *files* and quietly run more than was asked for.

**Mechanical renames need a compiler.** Dropping the prefixes made a parameter and a local in `clickAllIfExists` both `element`. `tsc` caught the shadowing; a careful reader plausibly would not. Always run `npm run typecheck` after a bulk rename.

---

## Known stale document, not yet addressed

**[consulting/.claude.md](consulting/.claude.md) has the same drift that finding #17 found in the architecture doc,** and nobody has been asked about it yet. It describes the project as "JavaScript ES6+ modules", refers to `tests/pages/page.js` and `[name].page.js` naming, documents test data as `JSON.parse(readFileSync(...))`, tells specs to load credentials from `tests/data/*.json`, and lists visual testing as an expertise area with "`@wdio/visual-service` is already configured with a baseline folder."

All of that is now wrong. It is a persona/instructions file rather than project documentation, so it was left alone rather than rewritten unasked — **raise it with the owner before touching it.**

---

## Integration status

**Merged.** The owner opened [PR #23](https://github.com/Lighting-Sun/wdio-framework/pull/23) and squash-merged it to `main` on 2026-09-23 as `9f18c20`. `ci.yml` ran green on both the PR and the merge commit. That settles both reasons the handoff used to give for raising the PR: `ci.yml` has now run, and the 34 commits have been through a PR.

**How future rounds should land:** branch off `main` and push. Pushing is routine. **Opening or merging a PR still needs the owner's approval each time.** Don't treat round 12's merge as standing permission.

**`fix/audit-critical-findings` still exists on `origin`.** It's merged, but keep it: it holds the per-round commit history that the squash flattened (see *Where this stands*).

## Suggested next step

1. **#29, on the Windows machine.** Start with the per-worker ChromeDriver cache directory, then try `maxInstances: 2`. Don't run the loop on macOS or Linux and call a clean result evidence.
2. **Bump the three actions from `@v4` to `@v5`**, then check with a `ci-on-demand.yml` dispatch. Do this before `ubuntu-latest` moves to Ubuntu 26 on 2026-10-19.
3. **Raise the stale `consulting/.claude.md` with the owner** (see above). Don't rewrite it without being asked.
4. Optionally, read the test count from the Test step log of [run 35891879515](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35891879515) to close the one gap in `ci.yml`'s verification.
