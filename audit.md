# WebdriverIO Framework Audit

**Audience:** junior QA engineers working on this repo.
**Written:** 2026-09-22 · **Last updated:** 2026-09-23 (round 10 — first CI verification)
**Scope:** all source files, `wdio.conf.ts`, `tsconfig.json`, both GitHub Actions workflows, and the architecture doc.
**Status:** **26 of 31 findings fixed. Three open (#29, #30, #31), two deferred by decision (#2, #5).** See Progress below.

---

## Progress

**Branch:** `fix/audit-critical-findings`

| Commit | What |
|--------|------|
| `d4f9fc0` | This document |
| `2913efd` | Round 1 — findings #1, #3, #4, #6, #7, #8 |
| `0df9a27` | Progress tracking added to this document |
| `e330547` | Round 2 — finding #13 |
| `500cb94` | Round 2 — findings #11, #10, #15 |
| `2237345` | Round 3 — findings #28, #21, #16 |
| `6d48709` | Round 4 — finding #12 |
| `868f897` | Round 4 — finding #14 |
| `2dbff97` | Round 5 — finding #9; #29 diagnosed |
| `a208a0a` | Round 6 — finding #20; #29 narrowed |
| `02729e2`, `69799e2` | Round 7 — findings #18, #19 |
| `044188a` | Round 8 — findings #22–#27 |
| `5b6ba89`, `501b953` | Round 9 — finding #17 |
| _(no code change)_ | Round 10 — first CI run on the branch; findings #30, #31 opened |

**Fixed — 26 findings:** #1, #3, #4, and #6–#28 — that is, everything except the two deferred (#2, #5) and the three open (#29, #30, #31).

**The entire tooling and hygiene block (#18–#27) is now closed** as originally written, though #30 and #31 are follow-ons from it that only a real CI run could expose.

**Deferred by decision — 2 findings:** #2 and #5, at unchanged severity.

**Four findings were discovered while fixing the others:** #28 (fixed), #29 (open), and #30 and #31 (both opened by round 10's CI run). The audit therefore runs to 31, not the original 27.

**Current verification state** — re-checked 2026-09-23, after round 10:

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm run format:check` — clean.
- Full suite — 4 spec files, **11 tests** passing (8 before round 9 added the three extra sort cases).
- **The suite now also passes in real CI** — see *CI verification* below. Locally it was Windows and Node 24; CI is ubuntu and Node 20.17.0, so that is the first evidence the framework is not accidentally tied to one machine.
- **#29 still reproduces.** It appeared on a routine verification run on 2026-09-23; the immediate re-run was fully green. Across the two controlled 40-run loops it landed once each time. Nothing in the test code is implicated — see the finding. It has **not** been seen in CI, but one green ubuntu run is no evidence either way against a Windows-only crash at a 1-in-25-to-40 rate.

### CI verification — 2026-09-23

Every CI change from round 8 had been written and reasoned about but **never executed**. `ci-on-demand.yml` was dispatched against the branch ([run 35840206691](https://github.com/Lighting-Sun/wdio-framework/actions/runs/35840206691)) — green in 44s. What the log actually proves, step by step:

| Change | Evidence |
|--------|----------|
| `node-version-file` (#23) | `node-version-file: .nvmrc` → `Attempting to download 20.17.0` → `node: v20.17.0`. The pin resolves; CI no longer carries its own hardcoded version. |
| Typecheck + Lint steps (#24) | Both ran, both clean, both before the suite. Neither had ever run in CI before. |
| Collapsed Test step (#27) | `Running: npm test -- --env qa --browser chrome` — with no suite selected, the script added neither `--suite` nor `--mochaOpts.grep`, which is the branch the three old steps handled by omission. |
| `WDIO_LOG_LEVEL` (#22) | 1,881 INFO lines in the job log. Unset locally the count is 0, so the variable is genuinely driving the level. |
| Suite integrity | 4 spec files, 11 tests, all passing on Chrome 153 headless — the same counts as locally. |
| `onWorkerEnd` flaky hook (#21) | Silent, which is the correct behaviour on a fully green run. This is precisely the case the first implementation got backwards. |
| Artifact upload | Really uploaded: 1,026,451 bytes, artifact ID 10740893333, confirmed through the REST API rather than from the green step alone — `if-no-files-found: warn` means that step can pass having uploaded nothing. |

**Two new findings came out of this run**, #30 and #31. Both are things that only a real CI execution could surface, which is itself the argument for having done it.

**`ci.yml` is still unexercised.** The dispatch runs `ci-on-demand.yml` only. The two workflows share the checkout / setup / install / typecheck / lint prefix, so most of the risk is retired, but `ci.yml`'s own Test step and artifact upload have not run. Only a pull request to `main` triggers it — see #30.

Each round's own evidence is in its commit message and in the status note on its finding.

Each finding says *what* is wrong, *why* it matters, and *what to do about it*.

---

## Overall assessment

This is a genuinely solid framework for a practice project:

- Clean layering: spec → page object → component → browser-interaction factory.
- Locators are centralized in each page class and carry human-readable descriptions.
- TypeScript is in `strict` mode and the project type-checks with zero errors.
- CI is parameterized by environment, browser, and suite.

The findings below are about **reliability**, **diagnosability**, and **habits that break at scale** — not about the structure, which is sound.

---

## Priority summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Failure screenshots are taken and thrown away | Critical | ✅ Fixed |
| 2 | CI never uploads the report when tests fail | Critical | 🕓 Deferred |
| 3 | Tests inside one spec file share browser state | Critical | ✅ Fixed |
| 4 | Randomized test data makes failures unreproducible | Critical | ✅ Fixed |
| 5 | `--env dev` is broken | Critical | 🕓 Deferred |
| 6 | `await expect(await ...)` throws away auto-retrying assertions | High | ✅ Fixed |
| 7 | Allure gets 109 text attachments instead of steps | High | ✅ Fixed |
| 8 | `setValue` secretly clicks first | High | ✅ Fixed |
| 9 | `clickAllIfExists` uses a hardcoded 1s timeout in an unbounded loop | High | ✅ Fixed |
| 10 | Brittle locators | High | ✅ Fixed |
| 11 | String-template locators have no safety net | High | ✅ Fixed |
| 12 | Massive duplication in specs — no fixture layer | Medium | ✅ Fixed |
| 13 | Test data read with `readFileSync`, untyped and cwd-dependent | Medium | ✅ Fixed |
| 14 | Misleading names and typos | Medium | ✅ Fixed |
| 15 | Dead code | Medium | ✅ Fixed |
| 16 | `async` functions that do nothing asynchronous (plus two latent bugs) | Medium | ✅ Fixed |
| 17 | `filter.spec.ts` covers 1 of 4 sort options; architecture doc is stale | Medium | ✅ Fixed |
| 18–27 | Tooling and hygiene | Low | ✅ All fixed |
| 28 | Sort assertion does not wait for the list to re-render | High | ✅ Fixed |
| 29 | A worker process crashes rarely during startup under parallel load | High | ⬜ Open — root cause identified |
| 30 | `ci.yml` never runs on a feature branch | Medium | ⬜ Open |
| 31 | `.nvmrc` pins a Node version the dependency tree no longer supports | Low | ⬜ Open |

🕓 **Deferred** = accepted as valid, but scheduled for future work rather than the current pass. The severity is unchanged — these are still critical findings, they are just not being fixed right now.

---

## Critical — these cause real failures or lost information

### 1. Failure screenshots are taken and thrown away ✅ Fixed

> **Fixed in `2913efd`; completed in `02729e2`.** `afterTest` now captures the returned base64 string and attaches it as `image/png`. Verified by forcing a failure: 2 PNGs were written and referenced in the result JSON.
>
> **The first fix was incomplete.** `addAttachment` returns `Promise<void>` and was not awaited, so `afterTest` could resolve before the attachment was written and the screenshot could still be lost during teardown — the exact failure this finding exists to prevent. ESLint's `no-floating-promises` caught it when #18 landed, which is the clearest argument for that finding that this audit has produced.

**Where:** `wdio.conf.ts:103-107`

```ts
afterTest: async function (_test, _context, { passed }) {
    if (!passed) { await browser.takeScreenshot(); }
}
```

`browser.takeScreenshot()` returns a base64 string. Nothing receives it, so it is garbage-collected. When a test fails in CI you get a stack trace and no picture — the single most useful debugging artifact is missing.

**Change:** capture the return value and attach it to Allure.

```ts
const shot = await browser.takeScreenshot();
allureReporter.addAttachment('Screenshot on failure', Buffer.from(shot, 'base64'), 'image/png');
```

**Why do this first:** every other finding costs you time; this one costs you time *exactly when you are already blocked*.

---

### 2. CI never uploads the report when tests fail 🕓 Deferred — future work

> **Status:** flagged for a future pass. Until it is fixed, the workaround is to read the failure output directly from the Actions job log, since no Allure artifact will be produced on a red run.

**Where:** `.github/workflows/ci.yml:27-30` and `.github/workflows/ci-on-demand.yml:60-64`

GitHub Actions stops a job at the first failing step. `npx wdio` exits non-zero on test failure, so the `upload-artifact` step is skipped and no Allure report is produced.

**Change:** add `if: always()` (or `if: ${{ !cancelled() }}`) to the upload step. In `ci-on-demand.yml` that becomes:

```yaml
if: ${{ always() && github.event.inputs.artifacts == 'true' }}
```

**Why:** a report you only get on green runs is a report you never need.

---

### 3. Tests inside one spec file share browser state ✅ Fixed

> **Fixed in `2913efd`.** Added `tests/support/session.support.ts` with `resetBrowserState()` — it deletes cookies, clears session and local storage, then refreshes — and called it from every `beforeEach`. The end-of-test `removeAllItemsFromCart()` cleanup calls were removed, and cart removal became a test of its own.

**Where:** `login.spec.ts:7-9`, `addProductsToCart.spec.ts:8-10`, and every other spec's `beforeEach`

This is the most important concept on the list.

**WebdriverIO creates one browser session per *spec file*, not per `it` block.** The `beforeEach` only calls `browser.url(baseUrl)` — that navigates, but session storage (SauceDemo's cart and login token) survives between tests in the same file.

The evidence that this already bites us: `addProductsToCart.spec.ts:28` and `:45` both end with `removeAllItemsFromCart()`. That cleanup exists only to stop test 1 from polluting test 2. And it lives at the *end of the test body*, so **if the test fails anywhere above it, cleanup never runs and the next test inherits a dirty cart** — one real failure turns into two.

**Change:** make the reset unconditional and state-based, in the hook.

```ts
beforeEach(async () => {
    await loginPage.openPage();
    await browser.execute(() => window.sessionStorage.clear());
    await browser.refresh();
});
```

Then remove the in-test `removeAllItemsFromCart()` calls. Keep a dedicated test that *asserts* removal works — that is a feature under test, not cleanup.

**Rule to memorize:** cleanup belongs in `beforeEach`/`afterEach`, never at the bottom of a test. Test bodies do not run to completion when they fail.

---

### 4. Randomized test data makes failures unreproducible ✅ Fixed

> **Fixed in `2913efd`.** `addRandomItemsToCart()` was replaced by `addItemsToCartByNames(data.cartProducts)`, with the product list pinned in `placeHolderData.json`. `getRandomNumber` and `getSetFromRange` were deleted, which also removes the infinite-loop risk described below.

**Where:** `tests/pages/inventory.page.ts:89-98`, used by `completePurchase.spec.ts:22` and `addProductsToCart.spec.ts:18`

`addRandomItemsToCart()` picks a random *count* of random *items* on every run. When it fails you cannot re-run the same scenario, and you cannot tell a real bug from an unlucky combination.

There is also a latent hang in `tests/utils/utilsMethods.utils.ts:11-21`:

```ts
do {
    const value = this.getRandomNumber(intMinRange, intMaxRange);
    if (!setFromRange.has(value)) { setFromRange.add(value); }
} while (setFromRange.size !== intSetSize);
```

If `intSetSize` ever exceeds the range size — or is `0` — this **spins forever** until the 60s Mocha timeout, with no useful message. Today `getRandomNumber(1, n)` keeps it safe by luck, not by design.

**Change — pick one:**

- *Preferred:* use explicit data-driven cases, e.g. `['Sauce Labs Backpack', 'Sauce Labs Bike Light'].forEach(...)`. Deterministic, readable, and the test name tells you what broke.
- *If randomness must stay:* seed it, log the seed into Allure so a failure is replayable, and guard `getSetFromRange` with `if (intSetSize > intMaxRange - intMinRange + 1) throw new Error(...)`.

**Why:** randomness in e2e tests buys coverage you cannot act on. A test that fails 1 run in 8 with a different cause each time gets muted by the team within a month.

---

### 5. `--env dev` is broken 🕓 Deferred — future work

> **Status:** flagged for a future pass. Until it is fixed, treat `--env dev` / the `dev` dropdown option as unsupported and run everything against `qa`.

**Where:** `wdio.conf.ts:11-14`

```ts
const environments: Record<string, string> = {
    qa: 'https://www.saucedemo.com/',
    dev: 'https://www.saucedemo.com/v1/',
};
```

The `/v1/` app is the *old* SauceDemo build. It has no `data-test` attributes, so nearly every locator in `tests/pages/` fails against it. That option is exposed as a dropdown in `ci-on-demand.yml:11-13`, so anyone selecting it gets a wall of red that looks like a product bug.

**Change:** either remove the `dev` option, or point it at an environment the locators actually support. Never ship a config switch that guarantees failure.

---

## High — reliability and diagnosability

### 6. `await expect(await ...)` throws away auto-retrying assertions ✅ Fixed

> **Fixed in `2913efd`.** Added `expectText` and `expectTextsFromElements` to the factory and converted all 15 call sites. Chosen over exposing raw elements to specs so the “no `$()` outside the factory” rule and the centralized Allure logging both survive.

**Where:** 15 occurrences across the four spec files, e.g. `login.spec.ts:18`

```ts
await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
```

`expect-webdriverio` has a superpower: when you pass it an **element**, it re-queries and re-checks for up to `waitforTimeout` ms. Resolving the text to a plain string first turns the assertion into a one-shot check against a static value.

The factory's internal `waitForDisplayed` only partly compensates — it waits for *visible*, not for *the right text*. Any text that renders before it updates is a flake.

**Change:** expose elements (or locators) and assert on them.

```ts
await expect(header.pageTitle).toHaveText('Products');
```

**Rule:** `await expect(element).toHaveText(x)` retries. `expect(await element.getText()).toBe(x)` does not.

---

### 7. Allure gets 109 text attachments instead of steps ✅ Fixed

> **Fixed in `2913efd`.** Every `addAttachment` became an `addStep`. Results went from 109 `.txt` files to 0; attachments are now reserved for failure screenshots.

**Where:** `tests/utils/wdioFactory.utils.ts` — every `click`, `setValue`, `getText`, and selector resolution calls `allureReporter.addAttachment(...)`

The generated report currently holds **109 attachment files and weighs 2.7 MB** for four spec files.

Attachments are for *artifacts*: screenshots, HTML dumps, API payloads. For "what happened, in order," Allure has **steps** — they render as a collapsible timeline with pass/fail status per step, which is exactly the effect being attempted here.

**Change:** swap `addAttachment` for `addStep(description)`, or wrap actions in `allureReporter.startStep()` / `endStep()`. Reserve attachments for screenshots.

**Bonus:** add `allureReporter.addFeature()` and `addSeverity()` in the specs so the report groups by feature rather than by file.

---

### 8. `setValue` secretly clicks first ✅ Fixed

> **Fixed in `2913efd`,** as a side effect of the factory rewrite for #6 and #7. The internal `this.click()` call is gone; `setValue` now waits for enabled and types.

**Where:** `tests/utils/wdioFactory.utils.ts:37-48`

`setValue()` calls `this.click(objElement)` internally. Two problems:

1. A method named "set value" performing a click is a **surprise**. If the click fails, the error reads "not clickable" for what looked like a typing action.
2. It doubles the Allure noise and the wait time for every field.

**Change:** drop the internal click. `element.setValue()` already focuses and clears the field. If a specific field genuinely needs a click first, make that explicit at the call site.

---

### 9. `clickAllIfExists` uses a hardcoded 1s timeout in an unbounded loop ✅ Fixed

> **Partially fixed in `2913efd`, completed in `2dbff97`.** The magic `1000` became a named `CLICK_ALL_PROBE_TIMEOUT` constant, raised to 2000 ms. Round 5 bounded the loop: it counts the matching elements first, loops at most that many times, then waits for the count to reach zero. The final check is a `waitUntil` rather than an immediate count, so it does not reintroduce the race #28 fixed.
>
> Verified against the old behavior with a scratch spec driving a locator that stays clickable no matter how often it is clicked (the login button with empty credentials): **before, 59879 ms, killed by `Timeout of 60000ms exceeded`; after, 2090 ms** with a message naming the locator and the real problem. The scratch spec was deleted afterwards.

**Where:** `tests/utils/wdioFactory.utils.ts:83-98`

On a slow CI runner, 1000 ms can be shorter than a DOM re-render, so the loop exits early and leaves items in the cart. `cart.page.ts:37-41`'s `waitUntil` then fails with a confusing message that points at the wrong place.

It is also an **unbounded `while` loop**: if a click never removes the element, it spins until the Mocha timeout.

**Change:** count the elements first, loop that many times, then assert zero remain. Make the timeout a named constant rather than a magic `1000`.

---

### 10. Brittle locators ✅ Fixed

> **Fixed across `2913efd` and round 2.** The `:nth-of-type()` and trailing-space selectors went with #4. Round 2 replaced every text-matching XPath with a `data-test` selector, after dumping the live DOM to confirm the attributes exist.
>
> The DOM dump also showed `inventory_item_name` **no longer has a trailing space**, so the old `div[class='inventory_item_name ']` locator would have matched nothing today.
>
> Product lookups now key off SauceDemo's slug attributes rather than visible text: `div[data-test='inventory-item']:has(button[data-test$='-sauce-labs-onesie'])`. The `:has()` suffix match works for both the `add-to-cart-` and `remove-` states of the button. `UtilsMethods.toProductSlug()` derives the slug, so specs still pass a readable product name.

**Where:** `tests/pages/inventory.page.ts`

- **Line 28** — `div[class='inventory_item_name ']` is an exact-match attribute selector with a **trailing space**. One whitespace change in the app kills it silently. Use `[data-test='inventory-item-name']`.
- **Lines 24, 28, 32** — `:nth-of-type(${value})` is position-based, so the *same index means a different product* after sorting. Combined with finding #4, index-based selection is a flake generator.
- **Lines 12, 39-49** — `//div[text()='${value}']` breaks on leading/trailing whitespace and any copy change.

**Order of preference:** `data-test` attribute → stable `id` → CSS class → XPath. Most of these elements already expose `data-test`; use it.

---

### 11. String-template locators have no safety net ✅ Fixed

> **Fixed in round 2.** `getSelectorByValue` now throws a named error when the locator has no `${value}` placeholder, and when the value contains a quote character that would produce an invalid selector. Substitution uses `replaceAll`.
>
> Verified all three paths directly: two placeholders in one selector are both replaced; a placeholder-less locator throws; `O'Brien` throws.
>
> **Known limitation:** values containing quotes are rejected rather than escaped. Proper escaping needs XPath `concat()`, which plain string substitution cannot express. Rejecting loudly beats building a broken selector quietly.

**Where:** `tests/utils/wdioFactory.utils.ts:22-35`

`selector.replace('${value}', ...)` fails silently in three ways: if a locator has no `${value}` placeholder you get the raw template; if it has two, only the first is replaced; and a value containing a quote character produces invalid XPath.

**Change:** throw when the placeholder is missing, use `replaceAll`, and escape quotes in the substituted value.

---

## Medium — maintainability

### 12. Massive duplication in specs — no fixture layer ✅ Fixed

> **Fixed in `6d48709`.** Added `tests/support/flows.support.ts` with `loginAsStandardUser()` and `openCart()`, replacing six copies of the login block and four of the open-cart block.
>
> **Deliberately not applied everywhere:** the two `login.spec` tests whose *subject* is logging in still drive the login page directly. A fixture must never hide the thing under test — only the logout test, where login is a precondition, uses the flow.

The block "login → assert URL → assert page title" is copy-pasted into **six** tests. `addProductsToCart.spec.ts:14-29` and `completePurchase.spec.ts:18-31` share roughly 13 near-identical lines.

**Change:** add reusable flows such as `loginAsStandardUser()` to the `tests/support/` layer, which now exists — the #3 fix created it for `session.support.ts`. Specs then read as business intent instead of click sequences.

Note this is **not** the same as a page object: a page object models a *page*, a fixture models a *precondition*.

---

### 13. Test data read with `readFileSync`, untyped and cwd-dependent ✅ Fixed

> **Fixed in round 2.** Enabled `resolveJsonModule` and replaced the `readFileSync` + `JSON.parse` line in all four specs with `import data from "../data/placeHolderData.json" with { type: "json" };`.
>
> Verified both halves of the finding. **Typing:** a deliberate `data.users.vlaidUser` now fails `tsc` with `TS2551: Property 'vlaidUser' does not exist ... Did you mean 'validUser'?` instead of crashing at runtime. **Path independence:** loading the same file by module URL from an unrelated working directory succeeds, where the old `readFileSync('./tests/data/...')` fails with `ENOENT`.

**Where:** `login.spec.ts:11` and the same line in all four specs

```ts
const data = JSON.parse(readFileSync('./tests/data/placeHolderData.json', 'utf-8'));
```

Two problems:

1. `JSON.parse` returns `any`, so a typo like `data.users.vlaidUser.username` compiles fine and fails at runtime with `Cannot read properties of undefined`.
2. The path is relative to the **process working directory**, so running wdio from a subfolder breaks all four specs.

**Change:** enable `resolveJsonModule` in `tsconfig.json` and import the file:

```ts
import data from '../data/placeHolderData.json' with { type: 'json' };
```

You get compile-time checking of every field and cwd-independence for free.

---

### 14. Misleading names and typos ✅ Fixed

> **Fixed in round 4.** Every row in the table below, plus the `architechture/` → `architecture/` directory rename (and `projectArchitechture.md` → `projectArchitecture.md`). References to the old path inside the gitignored `.claude.md` files were updated too, so nothing dangles.
>
> **Prefixes:** dropped, per your call — 102 identifiers across 9 files lost their `str`/`obj`/`int`/`arr`/`num` prefixes, since the type is already in the TypeScript signature.
>
> The rename surfaced a latent shadowing bug that `tsc` caught: in `clickAllIfExists`, the parameter and a local variable both became `element`. The local is now `probe`. Worth noting as the argument for mechanical renames being compiler-verified rather than done by eye.

Small individually, but this is what a reviewer reads first.

| Location | Issue |
|----------|-------|
| `tests/data/placeHolderData.json:7` | `invalidUser` is actually a **valid but locked-out** user. Rename to `lockedOutUser` — a future real "invalid credentials" test currently has nowhere to live. |
| `tests/specs/filter.spec.ts:6` | `describe('login related scenarios')` — copy-paste; this is the sort suite. Wrong suite names make Allure unreadable. |
| `tests/pages/login.page.ts:40` | `clicklOnLoginBtn` (double `l`) |
| `tests/pages/inventory.page.ts:75`, `:119` | `AddItemToCartByIndex` / `AddItemToCartByName` — PascalCase methods; everything else is camelCase |
| `tests/pages/inventory.page.ts:100` | `getProperyValuesFromArrayOfDetails` (missing `t`) |
| `tests/utils/utilsMethods.utils.ts:23`, `:28` | `Presicion` → `Precision` |
| `tests/specs/addProductsToCart.spec.ts:6` | `'product pruchase scenarios'` |
| `tests/components/header.component.ts:15` | `shoppingCartBtn` described as `"username input field"` |
| repo root | `architechture/` → `architecture` |

There is also inconsistent Hungarian notation: `strValue`, `objElement`, `intMinRange` in some places, plain `value` / `index` in others. **Pick one convention.** In TypeScript the type is already in the signature, so dropping the prefixes is the cleaner choice — but consistency matters more than which option you pick.

---

### 15. Dead code ✅ Fixed

> **Fixed across `2913efd` and round 2.** The index-based locators and methods went with #4; round 2 removed `clickAddToCartByItemName`, `inventoryItemLabelFromName`, `addToCartButtonBasedOnItemName`, and `selectDropdownOption`. A grep confirms zero references to each.

- `tests/pages/inventory.page.ts:11-14` — `inventoryItemLabelFromName` is never used and duplicates `inventoryItemNameByName`.
- `tests/components/header.component.ts:25-28` — `selectDropdownOption` is never used.
- `tests/components/header.component.ts:40` — clicks the dropdown and then calls `selectByAttribute` on it. The click is unnecessary.

**Change:** delete. Unused locators rot, and the next person assumes they work.

---

### 16. `async` functions that do nothing asynchronous, plus two latent bugs ✅ Fixed

> **Fixed in round 3.** Verified both latent bugs directly: `sumArrAndFixPresicion([], 2)` now returns `0` where the old code threw `TypeError: Reduce of empty array with no initial value`, and `sortLowToHighValues` leaves its argument untouched. The three pure-data functions dropped `async`, and their call sites dropped the pointless `await`.

**Where:** `tests/utils/utilsMethods.utils.ts:23`, `:28`, and `tests/pages/inventory.page.ts:100`

These are pure data functions with no `await` inside, which forces every caller to write `await`. It makes `completePurchase.spec.ts:43-44` read like it performs browser work when it is just arithmetic.

Two real bugs in the same file:

- **`utilsMethods.utils.ts:24`** — `reduce` has **no initial value**, so it throws `Reduce of empty array with no initial value` on an empty cart. Add `, 0`.
- **`utilsMethods.utils.ts:3-5`** — `sortLowToHighValues` **mutates its argument**, because `Array.prototype.sort` sorts in place. Harmless today because the caller passes a fresh array, but it is a landmine. Use `[...arrValues].sort(...)`.

---

### 17. `filter.spec.ts` covers 1 of 4 sort options; architecture doc is stale ✅ Fixed

> **Fixed in `5b6ba89` (tests) and `501b953` (doc).**
>
> **Part 1 — sort coverage.** `filter.spec` now runs one case per dropdown option (`lohi`, `hilo`, `az`, `za`) from a data-driven table. Each case reads the list the page is showing, sorts it locally, then asserts the page reaches the same order — so adding or renaming a product does not break the tests, while a broken sort on the site still does. Needed three new sort helpers and an `inventoryItemName` locator with `getTextFromNames` / `expectTextFromNames`, since the page object could read prices but had no accessor for the name column at all.
>
> **Verified the tests can fail**, rather than trusting four green ticks: pairing each option with the wrong sort function (`lohi`↔`hilo`, `az`↔`za`) fails all four. Suite is now 11 tests, up from 8.
>
> **Part 2 — the doc was worse than stale, it was corrupted.** The `login.page.js` row of Layer 2's inventory table was split in half, with its tail landing inside Layer 3's table header — dragging six page rows and Layer 2's tradeoff paragraph into the UI Components section. Two layers described each other's files.
>
> Factual drift found on top of that, all checked against the code: every file referenced as `.js`; `tests/support/` absent entirely; Layer 5 listing three utility functions that do not exist (`sortArrayAlphabetically`, `getRandomNumber`, `getPriceAsNumber`); test data documented as `readFileSync`; the factory inventory missing every assertion helper and describing `clickAllIfExists` as unbounded; and a "parallel execution" gap claiming singleton exports break under multiple workers — **which is wrong**, since each spec file runs in its own worker process with its own module instances. That one was corrected rather than carried forward.
>
> Rewritten to seven layers, with Test Support added and pure utilities split from browser interaction. The rules now carry the reasoning these audit rounds produced, so the traps are documented where someone editing the code will meet them.

`tests/specs/filter.spec.ts` tests only `lohi`. The architecture doc (`architecture/projectArchitecture.md`) claims it covers "all four product sort options" — **the doc is already out of date**, and it still refers to `.js` files that were converted to `.ts` in the most recent commit.

**Change:** add `hilo`, `az`, and `za` as a data-driven loop, and update the doc. Treat doc drift as a bug — a doc that lies is worse than no doc.

---

### 28. The sort assertion does not wait for the list to re-render ✅ Fixed

> **Fixed in round 3.** The factory's retry loop was generalized into `expectEventuallyEquals(label, readValues, expected)`, which re-reads a collected value until it matches. `expectTextsFromElements` now delegates to it, and the inventory page exposes `expectTextFromPrices` for the sort check.

**Found during round 2, not in the original audit.**

**Where:** `tests/specs/filter.spec.ts:19-22`

```ts
const beforeSortingPrices = UtilsMethods.sortLowToHighValues(await inventoryPage.getTextFromPrices());
await inventoryPage.header.clickOnSortFilterDropdownOption('lohi');
const afterSortingPrices = await inventoryPage.getTextFromPrices();
expect(beforeSortingPrices).toEqual(afterSortingPrices);
```

`getTextFromPrices()` reads the DOM once, with no wait. It runs immediately after the sort is triggered, so if React has not re-rendered the list yet it reads the **pre-sort** order and the comparison fails.

This is the same class of defect as #6, which is why it survived that fix: #6 converted assertions comparing an element against a **literal**, while this one compares two **collected arrays**, so it was not part of that sweep.

**Why it is recorded here:** one run in nine failed during round 2 verification and did not reproduce across the eight runs that followed, so the failing spec was never identified. This race is the most plausible candidate, and it is a real defect on inspection regardless of whether it caused that particular failure.

**Change:** assert with a retrying comparison — `browser.waitUntil` around the price read, in the shape of the factory's `expectTextsFromElements`, so the check re-reads until the list settles.

**Related:** #21 (no `specFileRetries`) and #1 (failure screenshots, now fixed) would both have made this easier to diagnose — with #1 in place, a future occurrence leaves a screenshot behind.

---

### 29. A worker process crashes rarely during startup under parallel load ⬜ Open — root cause identified

*(Originally filed as a `filter.spec` failure. Round 6 showed any spec can be the victim — see below.)*

> **Round 5 — diagnosed, not yet fixed.** A 40-run debug loop reproduced it once (run 19 of 40) and captured the worker logs. **The worker process crashes; the test never fails.**
>
> The launcher log is unambiguous:
>
> ```
> DEBUG @wdio/local-runner: Runner 0-2 finished with exit code 3221226505
> ```
>
> `3221226505` is `0xC0000409`, Windows `STATUS_STACK_BUFFER_OVERRUN` — a fail-fast hard crash of the Node worker process, not a non-zero exit from a failed assertion.
>
> The failing worker's log stops mid-startup. Compared against a healthy worker in the same run:
>
> | Startup stage | worker 0-2 (crashed) | worker 0-3 (healthy) |
> |---|---|---|
> | `init remote session` | ✓ | ✓ |
> | `Using Chromedriver … from cache directory` | ✓ **← log ends** | ✓ |
> | `Started Chromedriver … on port` | ✗ never reached | ✓ |
> | `POST /session` | ✗ never reached | ✓ |
>
> Corroborating detail: the three surviving workers each left a `wdio-chrome-0-N-*` profile directory; worker 0-2 left none. Its `wdio-0-2-chromedriver.log` does show ChromeDriver starting successfully on port 59127, so the driver came up and the *worker* died around it, roughly 750 ms after being told to run.
>
> **What this settles:** the failure happens before any test code executes. That is the whole explanation for the missing Allure result and missing screenshot — `afterTest` cannot run in a process that no longer exists. **`filter.spec` is a victim of worker ordering, not a cause.** There is no bug in the spec, and no assertion is involved.
>
> **What is still open:** the crash *mechanism*. All four workers resolve ChromeDriver from one shared cache directory (`C:\Users\Home\AppData\Local\Temp`) and spawn their drivers within ~350 ms of each other, which is a plausible trigger, but nothing yet proves it. Treat contention as a hypothesis, not a conclusion.
>
> **The `retried 2x` anomaly reproduced** in this capture (`FAILED … (2 retries)` against a budget of 1). It now correlates with the crash path rather than appearing at random, which makes it a lead rather than the arithmetic puzzle recorded below.
>
> **Next experiments, cheapest first:** remove `@wdio/visual-service` (finding #20 — configured, entirely unused, and loaded immediately before the crash point) and re-run the 40-run loop; then `maxInstances: 2` to test the contention hypothesis directly. A run of 40 takes roughly four minutes.
>
> **Round 6 — `@wdio/visual-service` is ruled out, and the finding's title is wrong.**
>
> The service was removed (finding #20) and the same 40-run loop re-run. **It crashed again at the same rate — 1 of 40 — with the identical exit code `3221226505` and the identical truncation point,** after `Using Chromedriver … from cache directory` and before `Started Chromedriver … on port`. The `initialize service "visual"` line is absent from the new capture, confirming the removal took effect. So the visual service is not in the crash path. Removing it was still correct on its own merits; it just is not the fix.
>
> **The more important result: a different spec crashed.** Round 6's casualty was `login.spec` on worker 0-3, not `filter.spec`. Same signature, same 424-byte truncated log, same missing `wdio-chrome-0-3-*` profile directory, same `retried 2x` anomaly.
>
> **This finding is therefore misnamed.** There is nothing special about `filter.spec` — the crash takes whichever worker loses the startup race. Any spec can be the victim, and the rate is per-run, not per-spec. Do not go looking for a cause inside any individual spec file.
>
> **Next experiment:** `maxInstances: 2`. That is now the only untested item from the original list, and it targets the startup race directly.
>
> **Round 9 — a third capture, and the spec-agnostic claim is now settled.**
>
> Captured again on 2026-09-23 at **1 of 25 runs** — a higher rate than the two earlier 1-in-40 batches, though the sample is far too small to call that a trend. It also appeared on a routine verification run the same day. The third crash took **`completePurchase.spec`** on worker 0-1: same exit code `3221226505`, same 424-byte log truncated at exactly `Using Chromedriver … from cache directory`, same missing `wdio-chrome-0-1-*` profile directory, same `retried 2x`.
>
> **Three captures, three different victims — `filter.spec`, `login.spec`, `completePurchase.spec`.** Any doubt that the crash is tied to a particular spec file is gone. It takes whichever worker loses the startup race.
>
> This also means the finding's original framing was the most misleading thing about it: it was filed as a `filter.spec` problem, and anyone who took that at face value would have spent their time in the wrong file.

**Found during round 4. Not caused by the round-4 changes — a failure with the same signature occurred back in round 2, before them.**

**What was known before the round-5 capture:**

- Frequency is roughly 1 run in 10–15 of the full 4-worker suite.
- The spec produces **no Allure result file and no failure screenshot**, so the failure happens outside the test body — `afterTest` never runs. This rules out an assertion failure.
- It passes 6/6 when run alone with `--spec`, and did not reproduce across 14 consecutive full-suite runs afterwards.
- The retry also failed, so it is not purely transient within a single run.

**Most likely cause:** contention during browser session creation when four workers start simultaneously. `maxInstances: 10` against 4 spec files means all four launch at once.

**Where to look next:**

1. Run with `--logLevel debug` in a loop and keep the worker log from a failing run — the launcher log will name the session error.
2. Try `maxInstances: 2` and see whether the rate drops, which would confirm the contention theory.
3. Check whether `@wdio/visual-service` (configured but unused, finding #20) participates in session setup.

**Secondary observation:** the one captured failure logged `was retried 2x` although the retry budget is 1. With `specFileRetries: 1` the hook's arithmetic should top out at `1x`, and it did in the controlled test used to verify #21. Worth confirming whether the launcher can call `onWorkerEnd` with a negative remaining count on some path.

---

## Low — tooling and hygiene

### 18. No ESLint or Prettier config exists ✅ Fixed

> **Fixed in `02729e2` (config and lint fixes) and `69799e2` (the reformat).** Flat `eslint.config.js` with `js.configs.recommended`, typescript-eslint `recommended`, `eslint-plugin-wdio`'s `flat/recommended` on `tests/`, and `eslint-config-prettier` last. `recommendedTypeChecked` was deliberately skipped as far noisier than this codebase needs, but `projectService` is on so the type-aware rules work. `no-shadow` is enabled because #14's rename produced exactly that bug.
>
> **It found 19 real problems on the first run, one of which matters:** `afterTest` did not `await allureReporter.addAttachment`, so the hook could resolve before the screenshot was written — **finding #1's fix had a latent hole in it.** See the note on #1.
>
> The rest: 7 unawaited `addStep` calls, two `async` functions with nothing to await (`getSelectorByValue`, `getSideMenuOptionByValue` — both desynced, call sites updated, per #16's precedent), `let` that should be `const`, and an unused catch binding.
>
> **One rule is suppressed rather than obeyed.** `await-thenable` fires on `await $$(...)` in `getElements`, because WDIO types `ChainablePromiseArray` as extending `AsyncIterators` rather than `Promise`. The runtime object *is* thenable and the `await` is load-bearing — probed directly: `await $$(...)` gives a real Array whose `.length` is the number `3`, while `$$(...).length` without the await is a Promise. Dropping it would make `initialCount` a Promise and silently skip the loops in `clickAllIfExists` and `removeAllItemsFromCart`. Suppressed inline with that explanation.
>
> Prettier is scoped to code: `.prettierignore` excludes `*.md` and `.github`, since the audit and handoff carry hand-aligned tables and workflow YAML formatting is not code style.
>
> **Adjacent and still open:** #24 owns wiring `lint` and `typecheck` into CI. The scripts exist; nothing enforces them yet.



`README.md` instructs contributors to install both extensions, but there is no `eslint.config.js` or `.prettierrc`, so everyone formats differently. Add both, plus `eslint-plugin-wdio` — it catches exactly the mistakes described in finding #6.

### 19. The config object is not typed ✅ Fixed

> **Fixed in `02729e2`.** Typed as `WebdriverIO.Config`, which also removed the need for `logLevel: 'error' as const`. Verified the annotation earns its keep rather than assuming it: renaming `maxInstances` to `maxInstanses` now fails the build with *"Object literal may only specify known properties, but 'maxInstanses' does not exist in type 'Config'. Did you mean to write 'maxInstances'?"* Before the annotation, that typo compiled silently and the setting was simply ignored at runtime.



`wdio.conf.ts:35` is `export const config = {...}` with no annotation. Typing it as `WebdriverIO.Config` gives autocomplete and catches typo'd keys at compile time. It also removes the need for `'error' as const` on line 56.

### 20. Visual testing service is configured but unused ✅ Fixed

> **Fixed in `a208a0a`.** The owner confirmed visual testing is out of scope, so the capability was dropped rather than wired up. Verified before removing: no call to `checkScreen`, `checkElement`, `checkFullPageScreen`, `saveScreen` or `saveElement` anywhere; `tests/visual-testing/` did not exist on disk, so no baseline had ever been taken. Removed the service block, its orphaned `node:path` import, the tsconfig `types` entry, the devDependency, and the dead `.gitignore` line.
>
> **This did not fix #29.** The service loaded immediately before the crash point, which made it the cheapest suspect; a 40-run loop after removal crashed at the same rate with the same signature. Ruled out.

`wdio.conf.ts:62-72` loads `@wdio/visual-service`, but no test calls `checkScreen` or `checkElement`. Worse, `.gitignore:3` ignores `tests/visual-testing`, so **baselines can never be committed** and visual testing could never pass in CI regardless. Either write visual tests and un-ignore the baseline folder, or drop the dependency.

### 21. No flake handling ✅ Fixed

> **Fixed in round 3.** Added `specFileRetries: 1` with `specFileRetriesDeferred: true`, plus an `onWorkerEnd` hook that reports any spec which consumed a retry, so retries cannot silently mute a flaky test.
>
> **Worth knowing:** the hook's `retries` argument is the retry budget **remaining**, not the number used — the launcher documents it as "Number or retries remaining". A first implementation read it as retries-used and reported every spec on every green run as flaky. The correct test is `SPEC_FILE_RETRIES - retries > 0`.
>
> Verified all three paths: a green run logs nothing; a spec that fails once and then passes logs `passed on retry — FLAKY` and the build stays green; a spec that always fails logs `still failed after retrying` and the build still fails, so retries do not mask real breakage.

There is no `specFileRetries` in the config. For e2e against a live site, `specFileRetries: 1` with `specFileRetriesDeferred: true` is standard. Retries hide flakes, so pair this with tracking *which* specs retry — do not let it become a mute button.

### 22. `logLevel: 'error'` ✅ Fixed

> **Fixed in `044188a`.** Read from `WDIO_LOG_LEVEL`, validated against the allowed set, falling back to `error`. Both workflows set `info`. Verified by counting INFO/DEBUG lines from the same spec: **unset 0, `info` 187, invalid value 0** — a bad value falls back rather than breaking the run.


Fine locally, unhelpful in CI. Consider driving it from an environment variable so CI can run at `info`.

### 23. Node version mismatch ✅ Fixed

> **Fixed in `044188a`.** `.nvmrc` pins `20.17.0` and both workflows use `node-version-file`, so there is now a single source of truth and the two cannot drift apart again. `engines: { node: ">=20.17.0" }` added.


CI pins `20.17.0`; local development is on `v24.15.0`. Add `"engines": { "node": ">=20" }` to `package.json` and an `.nvmrc`, so "works on my machine" stops being a category of bug.

### 24. `package.json` scripts are thin ✅ Fixed

> **Fixed in `044188a`.** `test` and `wdio` collapse into one `test` script that takes arguments — verified with `npm test -- --suite loginAndPurchase`, which selected 2 spec files against 4 for a full run. `typecheck` and `lint` added and wired into **both** workflows as steps before the suite. Neither had ever run in CI, so a type error or a floating promise shipped.


`"test": "npx wdio"` and `"wdio": "wdio run ./wdio.conf.ts"` overlap, and one is unused. There is no `typecheck` or `lint` script, so CI never type-checks — a spec with a type error still ships. Add `"typecheck": "tsc --noEmit"` and run it as a CI step before the tests.

### 25. Credentials in a committed JSON file ✅ Fixed

> **Fixed in `044188a`.** `tests/support/credentials.support.ts` reads `SAUCE_USERNAME` / `SAUCE_PASSWORD` (and the `LOCKED_OUT_` pair) with the committed fixtures as fallback. No spec reads users out of the JSON any more. Verified the override is really wired rather than merely written: `SAUCE_USERNAME=not_a_real_user` fails exactly the two valid-user tests while the locked-out test still passes.


Fine for SauceDemo, which is public. Build the habit now anyway: read credentials from `process.env` with a fallback, so moving to a real application is a config change rather than a security incident.

### 26. Unquoted workflow inputs ✅ Fixed

> **Fixed in `044188a`.** Inputs arrive via `env:` and are quoted at the point of use, so a future switch from `choice` to free text cannot turn an input into shell.


`.github/workflows/ci-on-demand.yml:53-59` interpolates `${{ github.event.inputs.* }}` directly into `run:`. The `choice` input type constrains the values today, so it is safe *now*. The general rule: pass inputs via `env:` and reference `$VAR` in the script, so a future switch to a free-text input does not silently become shell injection.

### 27. Three near-identical Test steps in the on-demand workflow ✅ Fixed

> **Fixed in `044188a`.** Collapsed into one step that builds its argument list. Verified it reproduces all four input cases exactly (`smoke` → grep, a named suite → `--suite`, empty → neither).
>
> **`smoke` stays a grep** rather than becoming an entry in the `suites` map, which this finding offered as the alternative: `@smoke` tags individual tests across several files, so a suite entry would select whole *files* and quietly run more than was asked for. The old second step's `|| 'regression'` fallback was dead code — its own `if` already guaranteed a non-empty suite — and is dropped.


`.github/workflows/ci-on-demand.yml:51-59` has three conditional steps that differ only in arguments. Collapse them into one step that builds the argument string, or make `smoke` a real entry in the `suites` map in `wdio.conf.ts:40` so the grep special case disappears.

---

## Found by the first CI run

Both of these were invisible until round 8's CI changes actually executed. They are recorded separately from #28 and #29 because they were not found by reading code or by running the suite locally — no amount of either would have produced them.

### 30. `ci.yml` never runs on a feature branch ⬜ Open

**Where:** `.github/workflows/ci.yml:3-7`

```yaml
on:
  push:
    branches: ["main", "continous-integration"]
  pull_request:
    branches: ["main"]
```

`fix/audit-critical-findings` matches neither trigger, and there is no open pull request. The branch was pushed twice — on 2026-09-23, at `72f26af` and again at `eb2c939` — and **neither push started a workflow.** `gh run list --branch fix/audit-critical-findings` returns nothing at all; the newest run in the repository before round 10 was on `main`, dated 2026-09-02, predating every commit on this branch.

So 29 commits of work, including a rewrite of both workflow files, sat on the remote with no CI having ever looked at them. Round 10's dispatch was a manual workaround, not the trigger doing its job.

**Why this matters more than it looks.** The point of CI is to catch what a developer's machine does not. A trigger that only fires on `main` inverts that: the first real check happens *after* the merge, on the branch that has to stay green. This one is also self-concealing — nothing fails, nothing is red, there is simply no run, and a green local suite makes it easy not to notice.

**Change — pick one:**

- *Preferred:* add `pull_request:` with no branch filter, or open a PR as a matter of course. A PR to `main` already triggers the existing `pull_request` entry, so opening one is the zero-config fix and it gets the work reviewed at the same time.
- *Or:* broaden the push trigger, e.g. `branches-ignore: []` or an explicit `fix/**` pattern. Cheaper, but it spends Actions minutes on every intermediate push.

**Note the dead branch name.** The push trigger still lists `continous-integration` (sic — the typo is in the repo), a branch whose pull requests were all merged back in 2024. It is doing nothing now.

### 31. `.nvmrc` pins a Node version the dependency tree no longer supports ⬜ Open

**Where:** `.nvmrc` (`20.17.0`) and `package.json` (`engines: { node: ">=20.17.0" }`)

The CI install logged **14 `EBADENGINE` warnings**. Every one wants `^20.19.0 || ^22.13.0 || >=24`, against a current of `v20.17.0`:

`eslint@10.11.0`, `espree@11.2.0`, `eslint-scope@9.1.2`, `eslint-visitor-keys@5.0.1`, `@eslint/js@10.0.1`, `@eslint/core@1.2.1`, `@eslint/config-array@0.23.5`, `@eslint/config-helpers@0.7.0`, `@eslint/object-schema@3.0.5`, `@eslint/plugin-kit@0.7.3`, plus `yargs@18.0.0`, `yargs-parser@22.0.0`, `undici@7.25.0` and `cheerio@1.2.0`.

Most of that is the ESLint 10 tree that finding #18 introduced — so #18 and #23 landed in the same pass and quietly disagreed with each other.

**This is finding #23 half-landing.** #23 existed because CI pinned `20.17.0` while local ran `v24.15.0`, and "works on my machine" is not a debugging strategy. The `.nvmrc` fixed the *drift* — there is now one source of truth and the two cannot diverge again — but it pinned to a version the tooling itself no longer claims to support. CI currently runs ESLint on a Node version ESLint declares unsupported.

**It is warnings-only today.** `npm ci` completed, the lint step passed, all 11 tests passed. Nothing is broken. That is exactly why it is worth fixing now rather than on the day it stops being warnings-only.

**Change:** bump `.nvmrc` to `20.19.0` and `engines.node` to `>=20.19.0`. That clears all 14 warnings in a one-line change and stays on the Node 20 LTS line, so nothing else about the setup has to move.

**Verify it, do not assume it.** Re-run the CI dispatch after the bump and confirm the warning count drops from 14 to 0 — a change made to silence warnings should be checked against the warnings.

**Adjacent, not the same thing:** the run also warned that `actions/checkout@v4`, `actions/setup-node@v4` and `actions/upload-artifact@v4` target Node 20 and are being force-run on Node 24 by the runner. That is about the *actions*, not about `.nvmrc`, and the fix is bumping them to `@v5` when convenient. Separately, `ubuntu-latest` migrates to Ubuntu 26 on 2026-10-19.

---

## Suggested order of work

**✅ Done — rounds 1 to 9:**

| Round | Commit | Findings |
|-------|--------|----------|
| 1 | `2913efd` | #1, #3, #4, #6, #7, #8 |
| 2 | `e330547`, `500cb94` | #13, #11, #10, #15 |
| 3 | `2237345` | #28, #21, #16 |
| 4 | `6d48709`, `868f897` | #12, #14 |
| 5 | `2dbff97` | #9; #29 diagnosed, not fixed |
| 6 | `a208a0a` | #20; #29 narrowed — visual service ruled out |
| 7 | `02729e2`, `69799e2` | #18, #19 |
| 8 | `044188a` | #22, #23, #24, #25, #26, #27 |
| 9 | `5b6ba89`, `501b953` | #17 |
| 10 | _(no code change)_ | First CI run on the branch; #30 and #31 opened |

**Recommended next:**

1. **#31 — bump `.nvmrc` to `20.19.0`.** Do this first because it is a one-line change with a defined success condition: re-dispatch CI and watch the `EBADENGINE` count go from 14 to 0. Cheap, verifiable, done.
2. **#30 — get `ci.yml` to actually run.** Opening a pull request to `main` triggers it with no config change and gets 29 unreviewed commits in front of a reader at the same time. This is the owner's call, not a technical one.
3. **#29 — the long-standing open finding.** The root cause is identified (a worker-process crash, exit code `0xC0000409`, during ChromeDriver startup); the crash *mechanism* is not. `@wdio/visual-service` has been ruled out. The crash is not specific to any spec file — do not go hunting inside one. Two experiments remain:
   - **`maxInstances: 2`.** Targets the startup race directly. Be honest about what a result means: fewer crashes is a *mitigation* that costs wall-clock time, not a root-cause fix, and it must not land in this document as "fixed" if it lands as "papered over."
   - **A per-worker ChromeDriver cache directory.** Cheaper, and strictly more informative. The shared cache under `AppData\Local\Temp` is the stated hypothesis and nothing has yet tested it directly; giving each worker its own directory tests contention without paying the serialization cost, and unlike `maxInstances: 2` a positive result would actually *explain* the mechanism rather than just suppress the symptom.

   Remember the statistics: at a 1-in-40 base rate a clean 40-run batch is weak evidence, roughly what luck produces anyway. A crash *with* a candidate fix applied is strong evidence against that fix.

Everything else on this list is closed except the two deferred findings below.

**🕓 Deferred to a future pass:**

- **#2** — CI artifact upload on failure.
- **#5** — the broken `dev` environment.

These stay on the backlog at Critical severity. Revisit them before the framework is used by anyone outside the current team, since both of them mainly hurt people who are *not* the person who wrote the test.

---

## One meta-point worth internalizing

Findings #1, #2, and #3 are all the same failure mode: **the framework behaves well when tests pass and poorly when they fail.**

Automation earns its keep on red runs. Design for those.
