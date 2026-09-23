# Handoff — WebdriverIO framework audit remediation

**Written:** 2026-09-23 (replaces the 2026-09-22 handoff; corrected after round 10)
**Branch:** `fix/audit-critical-findings` — ahead of `main`, **pushed to `origin`, not merged**
**Working tree:** clean
**Read first:** [audit.md](audit.md). It is the plan, the spec and the status tracker in one document.

---

## Where this stands

A practice WebdriverIO + TypeScript framework testing [saucedemo.com](https://www.saucedemo.com/). An audit produced 27 findings; four more surfaced while fixing them — #28 and #29 during the rounds, then #30 and #31 from round 10's first CI run — so the audit runs to 31.

**27 fixed · 2 deferred by the owner's decision · 1 closed by decision · 1 open.**

The one open finding is **#29** — diagnosed, narrowed, two untested experiments left. **#30 is closed by decision** (the CI trigger policy is intentional) and **#31 was fixed in round 11** (`.nvmrc` → 20.19.0, verified in CI). Both came out of round 10's first real CI run; see *CI status* below.

Nine rounds of work are on the branch. Each round is two commits: one `fix:`/`refactor:`/`chore:`/`test:` for the code, one `docs:` updating the audit. `git log --oneline main..HEAD` is the list; `git diff --stat main..HEAD` is the size.

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

Pushing a feature branch starts **no** CI run — see #30, that is deliberate. To check a branch in real CI before opening a PR:

```bash
gh workflow run "CI on demand" --ref <branch> -f environment=qa -f browser=chrome -f artifacts=true
gh run watch <run-id> --exit-status
```

`typecheck` and `lint` both run in CI, before the suite, in both workflows. The old `wdio` script is gone — `test` takes arguments after `--`. Node version lives in `.nvmrc` (20.19.0); both workflows read it via `node-version-file`. Runner is **tsx**, Chrome runs headless, Node 24 locally.

### CI status — corrected in round 10

An earlier version of this handoff said the CI changes had never run *because nothing was pushed*. **Both halves of that were wrong, in opposite directions.**

The branch **was** pushed, twice, on 2026-09-23. But the pushes started **no workflow at all**, because `ci.yml` triggers only on pushes to `main` / `continous-integration` and on pull requests to `main` — and this branch is neither.

**That is intentional, and the owner confirmed it on 2026-09-23.** Finding #30 is closed, not open: CI runs at PR time and on `main`, never on a feature-branch push. Do not expect a push to start a run, and do not "fix" the triggers.

To check a branch before a PR exists, **dispatch `ci-on-demand.yml` against it** — under this policy that is the supported path, not a workaround. Round 10 did exactly that. [Run 35840206691](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35840206691) went **green in 44 s**, and every round-8 CI change was confirmed to do its job — `.nvmrc` resolving to 20.17.0, typecheck and lint running before the suite, the collapsed Test step building the right arguments, `WDIO_LOG_LEVEL` producing 1,881 INFO lines, all 11 tests passing on ubuntu, and the artifact genuinely uploading (1,026,451 bytes, verified through the API rather than from the green step, since `if-no-files-found: warn` lets that step pass on nothing). The evidence table is in `audit.md` under *CI verification*.

**Two things still to know:**

- **`ci.yml` itself has still never run.** The dispatch exercises `ci-on-demand.yml` only. They share the checkout / setup / install / typecheck / lint prefix, so most of the risk is retired, but `ci.yml`'s own Test step and artifact upload are unproven. Only a PR to `main` triggers it — and under the #30 decision that is the intended route, so it stays unproven until a PR is opened.
- **The run opened finding #31, now fixed in round 11.** 14 `EBADENGINE` warnings — the ESLint 10 tree, `yargs@18`, `undici@7` and `cheerio`, carrying three distinct requirements whose binding constraint is `^20.19.0` — against `.nvmrc`'s `20.17.0`. #18 and #23 had landed in the same pass and disagreed. `.nvmrc` is now `20.19.0` and a second dispatch ([run 35844385334](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35844385334)) confirmed the count dropped 14 → 0 with the suite still green.

  **Note for any future Node bump: it cannot be verified locally.** This machine runs Node 24, where every range already passes, so the warnings do not reproduce here at all. The count has to be read out of a CI install log.

---

## The oldest open finding: #29

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

**What is still unknown: the crash mechanism.** All four workers resolve ChromeDriver from one shared cache directory under `AppData\Local\Temp` and spawn drivers within ~350 ms of each other. Plausible, unproven — keep it a hypothesis, not a conclusion.

**Two untested experiments remain.**

`maxInstances: 2` — be clear about what a result means. Fewer crashes would be a *mitigation* that costs wall-clock time, not a root-cause fix; the mechanism would still be unexplained. Don't let it land in the audit as "fixed" if it lands as "papered over."

**A per-worker ChromeDriver cache directory** — cheaper, and strictly more informative. The shared cache is the stated hypothesis and nothing has tested it directly. Giving each worker its own directory tests contention without paying the serialization cost, and unlike `maxInstances: 2` a positive result would actually *explain* the mechanism rather than only suppress the symptom. Worth doing first.

**How to reproduce.** Run the full suite in a loop with `--logLevel debug --outputDir <per-run dir>`, keeping logs only from runs that exit non-zero. 40 runs takes about four minutes. Read the launcher's `wdio.log` for the exit code and compare the crashed worker's spec log against a healthy one from the same run.

**Beware the statistics.** At a 1-in-40 base rate, a clean 40-run batch is weak evidence — roughly what luck produces anyway. A crash *with* a candidate fix applied is strong evidence against that fix. Interpret accordingly.

**Related loose end:** the `retried 2x` anomaly against a retry budget of 1 has reproduced in both captures. It correlates with the crash path rather than appearing at random, so it is a lead rather than the arithmetic puzzle it first looked like.

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

The branch is **pushed** to `origin` (`github.com/Lighting-Sun/wdio-framework`) at `eb2c939`, matching local HEAD. It is **not merged** and there is **no pull request**. The owner chose "keep the branch as-is" when offered merge / PR / keep; the pushes happened afterwards and do not change that.

**Ask before merging or opening a PR.** That decision is theirs.

Note the overlap with finding #30: opening a PR is also the zero-config way to get `ci.yml` to run for the first time. Raise it as one decision, not two.

Worth raising, though: the branch is 27 commits deep and has never been reviewed by anyone but the owner. That is a growing amount of unreviewed work on one line.
