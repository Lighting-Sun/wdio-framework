# Handoff — WebdriverIO framework audit remediation

**Written:** 2026-09-22
**Branch:** `fix/audit-critical-findings` (ahead of `main`; run `git log --oneline main..HEAD` for the current list — **nothing pushed, nothing merged**)
**Working tree:** clean
**Read first:** [audit.md](audit.md) — it is the plan, the spec, and the status tracker all at once.

---

## What this is

A practice WebdriverIO + TypeScript framework testing [saucedemo.com](https://www.saucedemo.com/). It was audited, producing 27 findings; two more (#28, #29) were discovered while fixing them. Fixes are being applied in priority order, in rounds.

**Of 29 findings: 25 fixed, 2 deferred by the owner's explicit decision, 2 open.** The two open ones are #29 (diagnosed and narrowed, not fixed) and #17. The whole tooling block #18–#27 is closed.

`audit.md` carries a Progress section, a status column in the priority table, and a status blockquote on every finding that has been touched. **Keep it current** — it is how the next session knows where things stand. Every fix round has been two commits: one `fix:`/`refactor:` for the code, one `docs:` updating the audit.

---

## Do not re-litigate these

The owner made these calls explicitly. Do not reopen them without being asked.

| Decision | Detail |
|---|---|
| **#2 and #5 are deferred** | CI artifact-on-failure and the broken `dev` environment. Severity stays **Critical** — deferring work and downgrading risk are different decisions, and the audit records it that way. Do not "helpfully" fix them. |
| **Assertion style** | Retry helpers live in the factory (`expectText`, `expectTextsFromElements`, `expectEventuallyEquals`). Specs do **not** get raw elements. This preserves the "no `$()` outside the factory" rule and keeps Allure logging centralized. |
| **Test data** | Fixed product lists in `placeHolderData.json`. No randomness, no seeding. |
| **Naming** | Hungarian prefixes were **dropped** (102 identifiers). The TypeScript signature carries the type. |
| **Fixtures** | `tests/support/flows.support.ts` holds reusable *preconditions*. A test whose subject **is** logging in must still drive the login page directly — a fixture must never hide the thing under test. The two `login.spec` login tests are intentionally not converted. |

---

## Working agreement that has been in force

This matters more than any individual fix. The owner has consistently valued evidence over assertion.

1. **Verify against the old behavior, not just the new.** Don't claim "`reduce` no longer throws" — run the old form, show the `TypeError`, then show `0`. Don't claim screenshots attach — force a failure and count the PNGs.
2. **Never commit on a red or unverified suite.** When a flake appeared mid-round, the work stopped and got investigated before committing.
3. **Report honestly when a fix is wrong.** The `onWorkerEnd` hook was implemented incorrectly first (see Gotchas) and the verification run caught it. That was surfaced plainly, not quietly patched.
4. **Say what was left untouched.** Each round explicitly listed adjacent findings that were *not* fixed, so the diff stays reviewable.
5. **Commit messages carry the why and the verification evidence**, so the reasoning survives outside the chat. Follow the existing format — read `git log` before writing one.
6. Attribution line on every commit: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## Commands

```bash
npm run typecheck                      # tsc --noEmit — must be clean before any commit
npm run lint                           # ESLint — also must be clean before any commit
npm run format                         # Prettier (code only; *.md and .github are ignored)
npm test                               # full suite: 4 spec files, 8 tests, ~6s
npm test -- --spec tests/specs/filter.spec.ts
npm test -- --suite loginAndPurchase
WDIO_LOG_LEVEL=info npm test           # raise log level without touching the config
npm run open-allure                    # view the last report
```

`typecheck` and `lint` both run in CI now, before the suite, in both workflows. The old `wdio` script is gone — `test` takes arguments after `--`. Node version lives in `.nvmrc` (20.17.0) and both workflows read it with `node-version-file`.

Runner is **tsx** (not ts-node). Node 24 locally, CI pins 20.17.0. Chrome runs headless.

---

## What remains

### #29 — a worker process crashes during startup (High, **recommended next**)

**Round 5 found the root cause. It is not a test bug and not an assertion failure — the worker process dies.**

A 40-run loop at `--logLevel debug` reproduced it once (run 19 of 40). The launcher log:

```
DEBUG @wdio/local-runner: Runner 0-2 finished with exit code 3221226505
```

`3221226505` = `0xC0000409` = Windows `STATUS_STACK_BUFFER_OVERRUN`, a fail-fast hard crash of the Node worker process.

The crashed worker's log stops after `Using Chromedriver … from cache directory` and never reaches `Started Chromedriver … on port` or `POST /session`, while healthy workers in the same run reach both. The crashed worker also left no `wdio-chrome-0-2-*` profile directory, though its own chromedriver log shows the driver starting fine. So the driver came up and the worker died around it, ~750 ms in.

**This fully explains the missing Allure result and missing screenshot** — `afterTest` cannot run in a process that no longer exists. The spec that reports the failure is a victim of worker ordering, not a cause; there is nothing to fix in it.

**Still unknown:** the crash mechanism. All four workers resolve ChromeDriver from one shared cache directory under `AppData\Local\Temp` and spawn drivers within ~350 ms of each other. Plausible, unproven — keep it a hypothesis.

**Round 6 ruled out the visual service, and renamed the problem.**

`@wdio/visual-service` was removed (#20) and the loop re-run: **crashed again, 1 of 40, identical exit code and identical truncation point.** Not the cause. Removing it was still right on its own merits.

**The crash is not specific to `filter.spec`.** Round 6's casualty was `login.spec` on worker 0-3 — same signature, same truncated log, same missing profile dir, same `retried 2x`. The crash takes whichever worker loses the startup race. **Do not go hunting for a cause inside any individual spec file.**

**Remaining untested experiment:** `maxInstances: 2`.

A 40-run loop takes about four minutes. The script is worth recreating: run the full suite in a loop with `--logLevel debug --outputDir <per-run dir>`, and keep the logs only from runs that exit non-zero.

**Also reproduced:** the `retried 2x` anomaly against a budget of 1. It correlates with the crash path rather than appearing at random — a lead, not the arithmetic puzzle it first looked like.

### #17 — sort coverage and the stale architecture doc (Medium)

`filter.spec.ts` tests only `lohi`; add `hilo`, `az`, `za` as a data-driven loop. Then fix [architecture/projectArchitecture.md](architecture/projectArchitecture.md), which is **actively wrong**: it claims four sort options are covered and still refers to `.js` files that became `.ts` before this work began. It also predates the `tests/support/` layer entirely.

### Tooling (#18–#27) — closed

**All of #18–#27 is done** as of round 8. Nothing remains in this block.

---

## Gotchas discovered the hard way

**`onWorkerEnd(cid, exitCode, specs, retries)` — `retries` is the budget REMAINING, not the number used.** The launcher documents it as *"Number or retries remaining"*. Reading it as retries-used makes every spec on a fully green run report as flaky. Correct test is `SPEC_FILE_RETRIES - retries > 0`. This is implemented in `wdio.conf.ts`; don't "simplify" it back.

**One unexplained observation:** a single captured failure logged `was retried 2x` despite a budget of 1, which should be arithmetically impossible and did not happen in the controlled test used to verify #21. Recorded in finding #29. Not yet understood.

**`await $$(...)` — the `await` is load-bearing, and ESLint says otherwise.** WDIO types `ChainablePromiseArray` as extending `AsyncIterators`, not `Promise`, so `@typescript-eslint/await-thenable` flags it as awaiting a non-Promise. The runtime object *is* thenable. Probed: `await $$(...)` gives a real Array whose `.length` is a number; `$$(...).length` without the await is a Promise. Removing it would make `initialCount` a Promise and silently skip the loops in `clickAllIfExists` and `removeAllItemsFromCart` — tests would still "pass" while doing nothing. There is a scoped `eslint-disable-next-line` on it in `getElements`; **don't "clean it up".**

**Allure's `addStep` and `addAttachment` return `Promise<void>`.** Not awaiting them is a floating promise. The screenshot attach in `afterTest` was unawaited from #1 until round 7, which meant the screenshot could be lost during teardown. Await them.

**Credentials no longer come from the JSON directly.** `tests/support/credentials.support.ts` reads `SAUCE_USERNAME` / `SAUCE_PASSWORD` (and the `LOCKED_OUT_` pair) with the fixtures as fallback. Specs import from there, not from `placeHolderData.json`. The other fixture data (products, personal info, error message) still comes from the JSON.

**`smoke` is a grep, not a suite, and that is deliberate.** `@smoke` tags individual tests spread across several spec files. Adding `smoke` to the `suites` map would select whole *files* and silently run more than was asked for. The on-demand workflow special-cases it for that reason.

**Mechanical renames need a compiler.** Dropping the prefixes made a parameter and a local in `clickAllIfExists` both `element`. `tsc` caught the shadowing; a careful human reading would plausibly have missed it. Always `npx tsc --noEmit` after a bulk rename.

**Locators key off SauceDemo's `data-test` slugs, not visible text.** `UtilsMethods.toProductSlug()` turns "Sauce Labs Onesie" into `sauce-labs-onesie`, and `:has(button[data-test$='-sauce-labs-onesie'])` finds the card. The `$=` suffix match is deliberate — it survives the button flipping between `add-to-cart-` and `remove-`.

**The live DOM was dumped before rewriting locators, and it paid off:** `inventory_item_name` no longer carries the trailing space the old selector matched on, so that locator had been dead, not merely fragile. Dump the DOM before guessing at attributes.

**Session state does not reset between `it` blocks.** WebdriverIO creates one session per spec *file*. `resetBrowserState()` in `tests/support/session.support.ts` must stay in every `beforeEach`, and it must run *after* navigation, since storage is origin-scoped.

**`quote characters in locator values throw` by design.** `getSelectorByValue` rejects them rather than escaping, because correct XPath escaping needs `concat()`, which string substitution cannot express. Failing loudly beats building a broken selector silently.

---

## Integration status

Nothing is pushed. `origin` is `github.com/Lighting-Sun/wdio-framework`. The owner chose "keep the branch as-is" when offered merge/PR/keep, and has not revisited it. **Ask before pushing, merging, or opening a PR** — that decision is theirs.

Run `git diff --stat main..HEAD` for the current size of the branch.
