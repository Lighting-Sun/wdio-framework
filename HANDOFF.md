# Handoff — WebdriverIO framework audit remediation

**Written:** 2026-09-22
**Branch:** `fix/audit-critical-findings` (12 commits ahead of `main`, **nothing pushed, nothing merged**)
**Working tree:** clean
**Read first:** [audit.md](audit.md) — it is the plan, the spec, and the status tracker all at once.

---

## What this is

A practice WebdriverIO + TypeScript framework testing [saucedemo.com](https://www.saucedemo.com/). It was audited, producing 27 findings; two more (#28, #29) were discovered while fixing them. Fixes are being applied in priority order, in rounds.

**15 of 29 findings are fixed. 2 are deferred by the owner's explicit decision. 3 remain open.**

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
npx tsc --noEmit          # type check — must be clean before any commit
npx wdio                  # full suite: 4 spec files, 8 tests, ~6s
npx wdio --spec tests/specs/filter.spec.ts
npm run open-allure       # view the last report
```

Runner is **tsx** (not ts-node). Node 24 locally, CI pins 20.17.0. Chrome runs headless.

---

## What remains

### #29 — rare `filter.spec` failure under parallel load (High, **recommended next**)

The most valuable thing to work on: a flaky suite erodes trust faster than a missing feature.

**Known:**
- ~1 run in 10–15 of the full 4-worker suite. Passes 6/6 in isolation.
- Produces **no Allure result and no screenshot**, so it fails *outside* the test body — `afterTest` never runs. **This rules out an assertion failure.**
- The retry also failed, so it is not purely transient within a run.
- **It predates the fix work** — the same signature appeared in round 2, before the changes that were live when it was caught.

**Leading hypothesis:** browser-session creation contention. `maxInstances: 10` against 4 spec files starts all four workers at once.

**Next steps, in order:** loop with `--logLevel debug` and keep the worker log from a failing run; try `maxInstances: 2` to test the contention theory; check whether `@wdio/visual-service` (configured but unused — finding #20) participates in session setup.

### #17 — sort coverage and the stale architecture doc (Medium)

`filter.spec.ts` tests only `lohi`; add `hilo`, `az`, `za` as a data-driven loop. Then fix [architecture/projectArchitecture.md](architecture/projectArchitecture.md), which is **actively wrong**: it claims four sort options are covered and still refers to `.js` files that became `.ts` before this work began. It also predates the `tests/support/` layer entirely.

### #18–20, #22–27 — tooling (Low)

`#18` (ESLint + Prettier) is worth pulling forward: it would have caught the variable shadowing described below before `tsc` did, and the README already tells contributors to install both extensions even though no config exists. The rest — untyped config object, unused visual service, `logLevel`, Node version pinning, thin npm scripts, credentials in JSON, unquoted workflow inputs, duplicated CI steps — can trickle in.

---

## Gotchas discovered the hard way

**`onWorkerEnd(cid, exitCode, specs, retries)` — `retries` is the budget REMAINING, not the number used.** The launcher documents it as *"Number or retries remaining"*. Reading it as retries-used makes every spec on a fully green run report as flaky. Correct test is `SPEC_FILE_RETRIES - retries > 0`. This is implemented in `wdio.conf.ts`; don't "simplify" it back.

**One unexplained observation:** a single captured failure logged `was retried 2x` despite a budget of 1, which should be arithmetically impossible and did not happen in the controlled test used to verify #21. Recorded in finding #29. Not yet understood.

**Mechanical renames need a compiler.** Dropping the prefixes made a parameter and a local in `clickAllIfExists` both `element`. `tsc` caught the shadowing; a careful human reading would plausibly have missed it. Always `npx tsc --noEmit` after a bulk rename.

**Locators key off SauceDemo's `data-test` slugs, not visible text.** `UtilsMethods.toProductSlug()` turns "Sauce Labs Onesie" into `sauce-labs-onesie`, and `:has(button[data-test$='-sauce-labs-onesie'])` finds the card. The `$=` suffix match is deliberate — it survives the button flipping between `add-to-cart-` and `remove-`.

**The live DOM was dumped before rewriting locators, and it paid off:** `inventory_item_name` no longer carries the trailing space the old selector matched on, so that locator had been dead, not merely fragile. Dump the DOM before guessing at attributes.

**Session state does not reset between `it` blocks.** WebdriverIO creates one session per spec *file*. `resetBrowserState()` in `tests/support/session.support.ts` must stay in every `beforeEach`, and it must run *after* navigation, since storage is origin-scoped.

**`quote characters in locator values throw` by design.** `getSelectorByValue` rejects them rather than escaping, because correct XPath escaping needs `concat()`, which string substitution cannot express. Failing loudly beats building a broken selector silently.

---

## Integration status

Nothing is pushed. `origin` is `github.com/Lighting-Sun/wdio-framework`. The owner chose "keep the branch as-is" when offered merge/PR/keep, and has not revisited it. **Ask before pushing, merging, or opening a PR** — that decision is theirs.

20 files changed, +917/−264 against `main`.
