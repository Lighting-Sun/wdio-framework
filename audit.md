# WebdriverIO Framework Audit

**Audience:** junior QA engineers working on this repo.
**Date:** 2026-09-22
**Scope:** all source files, `wdio.conf.ts`, `tsconfig.json`, both GitHub Actions workflows, and the architecture doc.
**Status:** first round of fixes applied — see Progress below.

---

## Progress

**Branch:** `fix/audit-critical-findings` · **Commits:** `d4f9fc0` (this document), `2913efd` (fixes)

**Fixed — 6 findings:** #1, #3, #4, #6, #7, and #8 (the last was resolved as a side effect of rewriting the factory for #6/#7).

**Partially fixed — 2 findings:** #9 and #10. Details are in their sections; both still need work.

**Deferred by decision — 2 findings:** #2 and #5, at unchanged severity.

**Verification at the time of the fix commit:**

- `npx tsc --noEmit` — clean.
- Full suite — 4 spec files, 8 tests passing (was 7; a cart-removal test was added).
- A deliberately broken assertion produced 2 PNG attachments and retried before failing, confirming #1 and #6.
- Allure results went from 109 `.txt` attachment files to 0, confirming #7.

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
| 9 | `clickAllIfExists` uses a hardcoded 1s timeout in an unbounded loop | High | ⚠ Partial |
| 10 | Brittle locators | High | ⚠ Partial |
| 11 | String-template locators have no safety net | High | ⬜ Open |
| 12 | Massive duplication in specs — no fixture layer | Medium | ⬜ Open |
| 13 | Test data read with `readFileSync`, untyped and cwd-dependent | Medium | ⬜ Open |
| 14 | Misleading names and typos | Medium | ⬜ Open |
| 15 | Dead code | Medium | ⚠ Partial |
| 16 | `async` functions that do nothing asynchronous (plus two latent bugs) | Medium | ⬜ Open |
| 17 | `filter.spec.ts` covers 1 of 4 sort options; architecture doc is stale | Medium | ⬜ Open |
| 18–27 | Tooling and hygiene | Low | ⬜ Open |

🕓 **Deferred** = accepted as valid, but scheduled for future work rather than the current pass. The severity is unchanged — these are still critical findings, they are just not being fixed right now.

---

## Critical — these cause real failures or lost information

### 1. Failure screenshots are taken and thrown away ✅ Fixed

> **Fixed in `2913efd`.** `afterTest` now captures the returned base64 string and attaches it as `image/png`. Verified by forcing a failure: 2 PNGs were written and referenced in the result JSON.

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

### 9. `clickAllIfExists` uses a hardcoded 1s timeout in an unbounded loop ⚠ Partially fixed

> **Partially fixed in `2913efd`.** The magic `1000` became a named `CLICK_ALL_PROBE_TIMEOUT` constant, raised to 2000 ms. **Still open:** the `while` loop remains unbounded, so a click that never removes its element still spins until the Mocha timeout.

**Where:** `tests/utils/wdioFactory.utils.ts:83-98`

On a slow CI runner, 1000 ms can be shorter than a DOM re-render, so the loop exits early and leaves items in the cart. `cart.page.ts:37-41`'s `waitUntil` then fails with a confusing message that points at the wrong place.

It is also an **unbounded `while` loop**: if a click never removes the element, it spins until the Mocha timeout.

**Change:** count the elements first, loop that many times, then assert zero remain. Make the timeout a named constant rather than a magic `1000`.

---

### 10. Brittle locators ⚠ Partially fixed

> **Partially fixed in `2913efd`.** The `:nth-of-type()` locators and the `inventory_item_name ` exact-match-with-trailing-space selector were deleted along with the index-based methods that #4 made redundant. **Still open:** six `//div[text()='...']` XPath locators across `inventory.page.ts` and `sidemenu.component.ts`.

**Where:** `tests/pages/inventory.page.ts`

- **Line 28** — `div[class='inventory_item_name ']` is an exact-match attribute selector with a **trailing space**. One whitespace change in the app kills it silently. Use `[data-test='inventory-item-name']`.
- **Lines 24, 28, 32** — `:nth-of-type(${value})` is position-based, so the *same index means a different product* after sorting. Combined with finding #4, index-based selection is a flake generator.
- **Lines 12, 39-49** — `//div[text()='${value}']` breaks on leading/trailing whitespace and any copy change.

**Order of preference:** `data-test` attribute → stable `id` → CSS class → XPath. Most of these elements already expose `data-test`; use it.

---

### 11. String-template locators have no safety net

**Where:** `tests/utils/wdioFactory.utils.ts:22-35`

`selector.replace('${value}', ...)` fails silently in three ways: if a locator has no `${value}` placeholder you get the raw template; if it has two, only the first is replaced; and a value containing a quote character produces invalid XPath.

**Change:** throw when the placeholder is missing, use `replaceAll`, and escape quotes in the substituted value.

---

## Medium — maintainability

### 12. Massive duplication in specs — no fixture layer

The block "login → assert URL → assert page title" is copy-pasted into **six** tests. `addProductsToCart.spec.ts:14-29` and `completePurchase.spec.ts:18-31` share roughly 13 near-identical lines.

**Change:** add reusable flows such as `loginAsStandardUser()` to the `tests/support/` layer, which now exists — the #3 fix created it for `session.support.ts`. Specs then read as business intent instead of click sequences.

Note this is **not** the same as a page object: a page object models a *page*, a fixture models a *precondition*.

---

### 13. Test data read with `readFileSync`, untyped and cwd-dependent

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

### 14. Misleading names and typos

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

### 15. Dead code ⚠ Partially fixed

> **Partially fixed in `2913efd`.** The index-based locators and methods went with #4. **Still open:** `clickAddToCartByItemName`, `inventoryItemLabelFromName`, and `selectDropdownOption` are each still referenced only by their own definition.

- `tests/pages/inventory.page.ts:11-14` — `inventoryItemLabelFromName` is never used and duplicates `inventoryItemNameByName`.
- `tests/components/header.component.ts:25-28` — `selectDropdownOption` is never used.
- `tests/components/header.component.ts:40` — clicks the dropdown and then calls `selectByAttribute` on it. The click is unnecessary.

**Change:** delete. Unused locators rot, and the next person assumes they work.

---

### 16. `async` functions that do nothing asynchronous, plus two latent bugs

**Where:** `tests/utils/utilsMethods.utils.ts:23`, `:28`, and `tests/pages/inventory.page.ts:100`

These are pure data functions with no `await` inside, which forces every caller to write `await`. It makes `completePurchase.spec.ts:43-44` read like it performs browser work when it is just arithmetic.

Two real bugs in the same file:

- **`utilsMethods.utils.ts:24`** — `reduce` has **no initial value**, so it throws `Reduce of empty array with no initial value` on an empty cart. Add `, 0`.
- **`utilsMethods.utils.ts:3-5`** — `sortLowToHighValues` **mutates its argument**, because `Array.prototype.sort` sorts in place. Harmless today because the caller passes a fresh array, but it is a landmine. Use `[...arrValues].sort(...)`.

---

### 17. `filter.spec.ts` covers 1 of 4 sort options; architecture doc is stale

`tests/specs/filter.spec.ts` tests only `lohi`. The architecture doc (`architechture/projectArchitechture.md`) claims it covers "all four product sort options" — **the doc is already out of date**, and it still refers to `.js` files that were converted to `.ts` in the most recent commit.

**Change:** add `hilo`, `az`, and `za` as a data-driven loop, and update the doc. Treat doc drift as a bug — a doc that lies is worse than no doc.

---

## Low — tooling and hygiene

### 18. No ESLint or Prettier config exists

`README.md` instructs contributors to install both extensions, but there is no `eslint.config.js` or `.prettierrc`, so everyone formats differently. Add both, plus `eslint-plugin-wdio` — it catches exactly the mistakes described in finding #6.

### 19. The config object is not typed

`wdio.conf.ts:35` is `export const config = {...}` with no annotation. Typing it as `WebdriverIO.Config` gives autocomplete and catches typo'd keys at compile time. It also removes the need for `'error' as const` on line 56.

### 20. Visual testing service is configured but unused

`wdio.conf.ts:62-72` loads `@wdio/visual-service`, but no test calls `checkScreen` or `checkElement`. Worse, `.gitignore:3` ignores `tests/visual-testing`, so **baselines can never be committed** and visual testing could never pass in CI regardless. Either write visual tests and un-ignore the baseline folder, or drop the dependency.

### 21. No flake handling

There is no `specFileRetries` in the config. For e2e against a live site, `specFileRetries: 1` with `specFileRetriesDeferred: true` is standard. Retries hide flakes, so pair this with tracking *which* specs retry — do not let it become a mute button.

### 22. `logLevel: 'error'`

Fine locally, unhelpful in CI. Consider driving it from an environment variable so CI can run at `info`.

### 23. Node version mismatch

CI pins `20.17.0`; local development is on `v24.15.0`. Add `"engines": { "node": ">=20" }` to `package.json` and an `.nvmrc`, so "works on my machine" stops being a category of bug.

### 24. `package.json` scripts are thin

`"test": "npx wdio"` and `"wdio": "wdio run ./wdio.conf.ts"` overlap, and one is unused. There is no `typecheck` or `lint` script, so CI never type-checks — a spec with a type error still ships. Add `"typecheck": "tsc --noEmit"` and run it as a CI step before the tests.

### 25. Credentials in a committed JSON file

Fine for SauceDemo, which is public. Build the habit now anyway: read credentials from `process.env` with a fallback, so moving to a real application is a config change rather than a security incident.

### 26. Unquoted workflow inputs

`.github/workflows/ci-on-demand.yml:53-59` interpolates `${{ github.event.inputs.* }}` directly into `run:`. The `choice` input type constrains the values today, so it is safe *now*. The general rule: pass inputs via `env:` and reference `$VAR` in the script, so a future switch to a free-text input does not silently become shell injection.

### 27. Three near-identical Test steps in the on-demand workflow

`.github/workflows/ci-on-demand.yml:51-59` has three conditional steps that differ only in arguments. Collapse them into one step that builds the argument string, or make `smoke` a real entry in the `suites` map in `wdio.conf.ts:40` so the grep special case disappears.

---

## Suggested order of work

**✅ Round 1 — done (`2913efd`):** #1, #3, #4, #6, #7, #8.

**Round 2 — recommended next, in this order:**

1. **#13 — typed test data.** Do this first because it is the cheapest safety net left: `resolveJsonModule` plus an `import` turns every `data.*` typo into a compile error instead of a runtime crash, and removes the cwd dependency. It also has to happen before #14, since renaming `invalidUser` without type checking means finding the missed call sites by running the suite.
2. **#11 — placeholder guard in `getSelectorByValue`.** Small, contained, and it protects the six XPath template locators that #10 left in place. Pairs naturally with #9's unbounded loop — both are "the helper fails in a way that misreports where the problem is."
3. **#10 (remainder) + #15 (remainder).** Replace the `//div[text()='...']` locators with `data-test` equivalents and delete the three dead members. Grouped because they touch the same two files and the dead code *is* locator code.
4. **#16 — the two latent bugs.** `reduce` without an initial value throws on an empty cart, and `sortLowToHighValues` mutates its argument. Both are real defects, not style; the `async`-without-`await` cleanup rides along.
5. **#12 + #14 — fixtures and naming.** Largest diff, lowest risk, and best done last so it lands on top of settled code. `tests/support/` already exists from the #3 fix, so #12 is an extension rather than a new layer.
6. **#17 — sort coverage and the stale architecture doc.** New coverage, so it belongs after the refactors it would otherwise conflict with.
7. **#18–27 — tooling.** ESLint/Prettier (#18) is worth pulling forward if more than one person is about to touch this repo; the rest can trickle in.

**🕓 Deferred to a future pass:**

- **#2** — CI artifact upload on failure.
- **#5** — the broken `dev` environment.

These stay on the backlog at Critical severity. Revisit them before the framework is used by anyone outside the current team, since both of them mainly hurt people who are *not* the person who wrote the test.

---

## One meta-point worth internalizing

Findings #1, #2, and #3 are all the same failure mode: **the framework behaves well when tests pass and poorly when they fail.**

Automation earns its keep on red runs. Design for those.
