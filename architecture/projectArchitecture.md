# wdio-framework Architecture

**Verified against the code:** 2026-09-23, `main` at `9f18c20` (after the audit branch merged). Layer 7 (Infrastructure) re-checked the same day for the Node 24 / dependency update (PR #25). Every rule below was checked against the source, and wherever the code breaks a rule, *Known Gaps* says so.

## Purpose

This document is for deciding where new code belongs, how the layers connect, and which constraints hold when you extend the framework. It is written for any engineer adding tests, pages, components or utilities.

**After reading it you should be able to answer:**

- Where does a new page class go, what must it extend, and how must it be exported?
- When does a reusable UI fragment get its own component, and when is it just a page method?
- Why can't I call `$()` in a spec or a page, and where *is* `browser.*` allowed?
- When does a helper belong in `tests/support/` rather than `tests/utils/`?
- What has to change if I add a test environment?

**Maintenance rule:** update this document in the same commit as any change that adds a layer, moves a responsibility, adds a cross-cutting concern, or opens or closes a known gap. Then update the *Verified against the code* line. Treat drift in this document as a bug: it has happened twice already.

---

## Layer Overview

Seven layers, with dependencies in one direction only and no cycles. That is more layers than usual, on purpose: Test Support and Infrastructure each have a boundary that people kept getting wrong while they were folded into other layers.

```
Infrastructure (wdio.conf.ts, workflows, tsc / ESLint / Prettier config)
  └── runs ──► Test Specification
                 ├──► Test Support ──────► Page Objects
                 ├──► Page Objects ──┬──► UI Components ──► Browser Interaction ──► WebdriverIO + Allure
                 │                   └──────────────────► Browser Interaction
                 └──► Pure Utilities + Data
```

Three edges the tree cannot draw, all of them real imports:

- **Page Objects → Pure Utilities.** `inventory.page.ts` imports `UtilsMethods.toProductSlug`.
- **Test Support → Data.** `credentials.support.ts` falls back to `placeHolderData.json`.
- **Test Support → WebdriverIO**, directly, for session state. This is the one sanctioned bypass of the factory (see Layer 2).

**Entry point:** Test Specification. Nothing in the project imports a spec.
**Foundation:** Browser Interaction, and Pure Utilities + Data. Neither imports anything else in the project.

Everything is TypeScript in `strict` mode, run through **tsx**. `npm run typecheck` and `npm run lint` both run in CI before the suite.

---

## Layer 1 — Test Specification

**Responsibility:** owns the scenarios: the order of user actions and what is asserted about the result.

**Rules:**

- **No `$()` or `$$()` in a spec**, ever. Interactions go through page objects or Test Support.
- **Specs never receive raw elements.** Assertions go through page methods backed by the factory's retrying helpers (`expectItemCartNames`, `expectTextFromPrices`, `expectCompletePurchaseText`, …).
- **The only `browser` reference a spec may make is a URL assertion**, `await expect(browser).toHaveUrl(expect.stringContaining('/path'))`. This is current practice (4 call sites) rather than a documented decision. See *Known Gaps*.
- Page objects are imported as singletons and never instantiated in a spec.
- Credentials come from `tests/support/credentials.support.ts`, never from the JSON. Other fixture data comes from `tests/data/placeHolderData.json` as a typed JSON module: `import data from '../data/placeHolderData.json' with { type: 'json' }`.
- **Every `beforeEach` calls `loginPage.openPage()` and then `resetBrowserState()`**, in that order. One browser session serves a whole spec file, and storage is origin-scoped.
- **Cleanup belongs in hooks, never at the bottom of a test body.** A failing test never reaches trailing cleanup.
- Smoke tests carry `@smoke` in the `it()` title. That is how CI's grep finds them.
- No randomized data. A failure has to be reproducible from the test name alone.

**Inventory:** 4 spec files, 11 tests, about 6 s for a full local run.

| File | Tests | What it covers |
|------|------:|----------------|
| `tests/specs/login.spec.ts` | 3 | Valid login `@smoke`, locked-out error message, logout through the side menu `@smoke` |
| `tests/specs/addProductsToCart.spec.ts` | 3 | Adding a fixed product list, one specific product `@smoke`, removing every item |
| `tests/specs/completePurchase.spec.ts` | 1 | End to end: login → add → cart → checkout form → overview (names, prices, subtotal) → confirmation |
| `tests/specs/filter.spec.ts` | 4 | All four sort options (`lohi`, `hilo`, `az`, `za`), data-driven from one scenario table |

**Tradeoff:** `filter.spec.ts` derives its expected order by sorting what the page is already showing, not from a hardcoded list. Adding a product doesn't break it, and a broken sort still does. The cost: if the page loaded the wrong *set* of products, this spec would not notice.

---

## Layer 2 — Test Support

**Responsibility:** reusable *preconditions* and session state. A page object models a PAGE; a flow models a STATE the test starts from.

**Rules:**

- **A fixture must never hide the thing under test.** Only tests that need to *be* logged in use `loginAsStandardUser()`. The two tests in `login.spec.ts` whose subject is logging in drive the login page directly, on purpose.
- **Every flow asserts that it arrived** (URL and page title) before returning. That way a broken precondition fails as a precondition, not three steps later as a mystery.
- This is the only layer above the factory allowed to use `browser.*`, because session state is not a page concern.
- Credentials are read from the environment, with the committed JSON as fallback. Pointing the framework at a real application then becomes a config change, not a security incident.

**Inventory:**

| File | What it provides |
|------|------------------|
| `tests/support/flows.support.ts` | `loginAsStandardUser()`, `openCart()`: preconditions that assert they arrived |
| `tests/support/session.support.ts` | `resetBrowserState()`: deletes cookies, clears session and local storage, refreshes |
| `tests/support/credentials.support.ts` | `validUser`, `lockedOutUser`: `SAUCE_USERNAME` / `SAUCE_PASSWORD` and the `SAUCE_LOCKED_OUT_` pair, with JSON fallback |

---

## Layer 3 — Page Objects

**Responsibility:** models one application page: its locators, its user-facing actions, and navigation to it.

**Rules:**

- Every page extends `Page` (`tests/pages/page.ts`), which provides `this.wdioFactory` and `open(path)`.
- Every page exports a singleton: `export default new XxxPage()`.
- Every locator is `{ selector, description }`, matching the factory's exported `Locator` interface. The `locators` objects aren't annotated with it; the factory's parameter types enforce the shape. The description appears in failure messages and Allure steps, so write it for someone reading a red build.
- All interaction goes through `this.wdioFactory.*`. **No `$()` or `$$()`** (this holds today). The only `browser.*` call a page may make is `Page.open()`. Two pages currently break this; see *Known Gaps*.
- Pages with the app header declare `header = new Header()`. Every page except `LoginPage` does.
- Dynamic locators put `${value}` in both selector and description, resolved with `this.wdioFactory.getSelectorByValue(locator, value)` before any other factory call.
- **Locators never match on visible text. Prefer SauceDemo's `data-test` attributes** for anything new. Some older locators use ids or classes (`#login-button`, `#first-name`, `.bm-burger-button`, `span.title`, `select.product_sort_container`), which are stable enough on SauceDemo but not the model to copy. `UtilsMethods.toProductSlug()` turns `"Sauce Labs Onesie"` into `sauce-labs-onesie`, and `:has(button[data-test$='-sauce-labs-onesie'])` finds that card. The `$=` suffix match is deliberate: it survives the button flipping between `add-to-cart-` and `remove-`.
- **Where a page exposes a list, it exposes a retrying `expect…` method for it**, not just a getter. An action that re-renders the list races a single read.

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/pages/page.ts` | Base class: creates `WdioFactoryUtils`, provides `open(path)` |
| `tests/pages/login.page.ts` | Username, password, login button, error message, logo; `openPage()`, `loginWithCredentials()`, `expectLoginErrorMessage()`, `expectLoginLogoText()` |
| `tests/pages/inventory.page.ts` | Product names and prices with retrying list assertions; dynamic per-product name, price and add-to-cart locators; `addItemsToCartByNames()`; owns `Header` |
| `tests/pages/cart.page.ts` | Cart names and prices with retrying assertions, `removeAllItemsFromCart()`, checkout button; owns `Header` |
| `tests/pages/checkout.page.ts` | First name, last name, postal code, continue; `fillPersonalInformationForm()`; owns `Header` |
| `tests/pages/overview.page.ts` | Item names and prices with retrying assertions, numeric prices, **subtotal** (no tax or total), finish button; owns `Header` |
| `tests/pages/complete.page.ts` | Confirmation header with a retrying assertion; owns `Header` |

**Tradeoff:** singleton exports make imports simple. They are safe because WebdriverIO runs each spec file in its **own worker process**, so each worker has its own module instances. They would become unsafe only if several spec files ever shared a process.

---

## Layer 4 — UI Components

**Responsibility:** fragments that appear on more than one page, exposed as objects the pages own.

**Rules:**

- Every component extends `BaseComponent` (`tests/components/base.component.ts`) and interacts only through `this.wdioFactoryUtils.*`. The property is named differently from the pages' `wdioFactory`; that inconsistency is historical.
- Components are never singletons. Pages instantiate them in the class body.
- `Header` owns `SideMenu` as `sideMenu = new SideMenu()`, reached as `page.header.sideMenu`.
- Side-menu options are addressed by their `data-test` slug in lowercase: `clickOnSideMenuOptionByValue('logout')`.

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/components/base.component.ts` | Base class: creates `WdioFactoryUtils` |
| `tests/components/header.component.ts` | Burger menu button, cart button, page title with `expectPageTitle()`, sort dropdown; owns `SideMenu` |
| `tests/components/sidemenu.component.ts` | Dynamic `${value}-sidebar-link` locator; `clickOnSideMenuOptionByValue()` |

**Tradeoff:** the sort dropdown lives on `Header` even though only the inventory page shows it. That keeps one header model, but `cartPage.header.clickOnSortFilterDropdownOption()` type-checks and then times out. Put new inventory-only controls on `inventory.page.ts`, not on `Header`.

---

## Layer 5 — Browser Interaction

**Responsibility:** the only sanctioned route to WebdriverIO element APIs. It wraps DOM operations with explicit waits, readable timeout messages and Allure steps.

**Rules:**

- `$()` and `$$()` appear in this file and nowhere else.
- **Every method that acts or asserts logs an Allure step**, and every step is awaited: `addStep` and `addAttachment` return promises. The pure or read-only helpers (`getSelectorByValue`, `getElements`, `getTextFromElements`) deliberately log nothing.
- Don't call Allure from pages, components or specs. If more context is needed, extend this class.
- **Assertions assert on the element, not on a resolved string**, so `expect-webdriverio` retries. `expect(await getText()).toEqual(x)` checks once and races the page.
- Waits are bounded. Nothing in this file loops without a ceiling.

**Inventory** (`tests/utils/wdioFactory.utils.ts`):

| Member | What it does |
|--------|--------------|
| `Locator` (interface) | `{ selector, description }`, the shape every locator in the project uses |
| `click(element)` | Waits for clickable, clicks, logs |
| `setValue(element, value)` | Waits for enabled, sets the value (no implicit click), logs |
| `getText(element)` | Waits for displayed, returns text, logs |
| `getElements(elements)` | All matches as an array. **Its `await` is load-bearing;** see below |
| `getTextFromElements(elements)` | Text of every match, read once |
| `expectText(element, expected)` | Retrying assertion on one element's text |
| `expectEventuallyEquals(label, readValues, expected)` | Re-reads a collected list until it matches (10 s), then asserts once more for a readable diff |
| `expectTextsFromElements(elements, expected)` | `expectEventuallyEquals` over a locator's texts |
| `selectOptionFromSelect(element, attr, value)` | Waits for displayed, selects by attribute |
| `clickAllIfExists(element)` | Clicks each match, **bounded by the initial count** (2 s probe), then waits for none to remain |
| `getSelectorByValue(element, value)` | Substitutes `${value}` into selector and description; **throws** on a missing placeholder or on quote characters |

**Two traps, both commented in the code. Read them before editing:**

- `getSelectorByValue` **rejects** quotes rather than escaping them. Correct XPath escaping needs `concat()`, which string substitution cannot express. Failing loudly beats building a broken selector silently.
- The `await` on `$$(...)` in `getElements` is **load-bearing**, even though `@typescript-eslint/await-thenable` flags it. WDIO types `ChainablePromiseArray` as not-a-Promise, but the runtime object is one. Without the await, `.length` is a Promise and every loop over it silently does nothing, so tests would pass while doing nothing. A scoped `eslint-disable-next-line` covers it.

---

## Layer 6 — Pure Utilities + Data

**Responsibility:** computation with no browser, and static fixture data.

**Rules:**

- Utilities are pure: no browser calls, no WebdriverIO imports, no side effects.
- Sort helpers return a **copy**. `Array.prototype.sort` mutates in place.
- Reductions pass an initial value. `reduce` with none throws on an empty array, and an empty cart is a real case.
- Fixture data is a typed JSON import, never `readFileSync`, which was untyped and resolved against the working directory.

**Inventory:**

| File | What it provides |
|------|------------------|
| `tests/utils/utilsMethods.utils.ts` | `sortLowToHighValues`, `sortHighToLowValues`, `sortTextAToZ`, `sortTextZToA`, `toProductSlug`, `sumArrAndFixPrecision`, `fixNumberPrecision` |
| `tests/data/placeHolderData.json` | Users (credential fallback only), locked-out error text, `cartProducts`, `singleCartProduct`, checkout `personalInfo` |

**Tradeoff:** one data file is simple, but it can't hold per-environment values. It will need splitting when environments diverge.

---

## Layer 7 — Infrastructure

**Responsibility:** configures the runner, the static checks and the CI pipelines.

**Rules:**

- The config is typed `WebdriverIO.Config`, so a mistyped key fails the typecheck instead of being ignored.
- Suites (`regression`, `loginAndPurchase`) live in `wdio.conf.ts`, and CI refers to suites by name. **`smoke` is deliberately not a suite.** `@smoke` tags individual tests across files, so it stays `--mochaOpts.grep smoke`; a suite would select whole files.
- `onPrepare` wipes `reports/allure` before each run. `afterTest` attaches a screenshot on failure; **keep its `await`**. `onComplete` generates the HTML report with a 60 s ceiling.
- `specFileRetries: 1`, deferred. `onWorkerEnd` names any spec that used a retry. Its `retries` argument is the budget **remaining**, so the test is `SPEC_FILE_RETRIES - retries > 0`. Reading it the other way flags every green spec as flaky.
- `logLevel` defaults to `error` and is raised by `WDIO_LOG_LEVEL` (CI sets `info`) without a code change.
- Environment (`--env qa|dev`) and browser (`--browser chrome|firefox`) come from CLI flags, with `qa` and `chrome` as defaults. Unknown values fall back silently to the defaults.
- A new environment needs an entry in the `environments` map in `wdio.conf.ts` and an option in `ci-on-demand.yml`'s `environment` input.
- Workflow inputs go through `env:` and are quoted where used, so a future free-text input can't become shell injection.
- `.nvmrc` is the only source of the Node version. Both workflows read it with `node-version-file`.
- **CI trigger policy (settled owner decision):** `ci.yml` runs on pull requests to `main` and on pushes to `main`, never on feature-branch pushes. To check a branch before a PR, dispatch `ci-on-demand.yml`.

**Inventory:**

| File | What it configures |
|------|--------------------|
| `wdio.conf.ts` | Runner, specs, suites, `maxInstances: 10`, env and browser maps (headless Chrome/Firefox), timeouts, `logLevel`, retries, Spec + Allure reporters, the four lifecycle hooks |
| `package.json` | Scripts (`test`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, Allure), `engines.node >=24.0.0`, ESM |
| `tsconfig.json` | `strict`, `NodeNext`, `resolveJsonModule`; Node (`@types/node` 24), WDIO and Mocha global types |
| `allure-commandline.d.ts` | Type declaration for the untyped `allure-commandline` package used by `onComplete` |
| `eslint.config.js` | Flat config: JS + TS recommended, four type-aware rules (`no-floating-promises`, `await-thenable`, `require-await`, `no-shadow`), `eslint-plugin-wdio` on `tests/`, Prettier compatibility last |
| `.prettierrc` / `.prettierignore` | Formatting for code only. `*.md` and `.github` are excluded on purpose |
| `.nvmrc` | Node 24.21.0 (LTS), read by both workflows |
| `.github/workflows/ci.yml` | PR to `main`, push to `main` (and the dead `continous-integration` branch): typecheck → lint → full suite on QA, Chrome → Allure artifact |
| `.github/workflows/ci-on-demand.yml` | Manual dispatch: env, browser, optional suite or `smoke` grep; one Test step that builds its own arguments; optional artifact |

---

## Cross-Cutting Concerns

### Allure logging

- **Where:** only in `wdioFactory.utils.ts` (steps) and `wdio.conf.ts` (failure screenshot, report generation). WDIO's own step and screenshot reporting is disabled so the factory steps are the whole story.
- **Rule:** no Allure calls anywhere else. Always await them.

### Waiting and assertions

- **Where:** the factory. Element waits use `waitforTimeout` (10 s); list assertions use `expectEventuallyEquals` (10 s); the Mocha test timeout is 60 s.
- **Rule:** assert on something that retries. If you need a new assertion shape, add a factory helper and a page method; don't read once and compare in the spec.

### Test data and credentials

- **Where:** `tests/data/placeHolderData.json` (typed import) and `tests/support/credentials.support.ts`.
- **Rule:** no user-facing strings hardcoded in `it()` bodies beyond page titles and URL fragments, and no randomness.

### Environment configuration

- **Where:** `wdio.conf.ts` reads `--env` to pick `baseUrl`. `loginPage.openPage()` opens it.
- **Rule:** pages and specs never read `process.env`. `credentials.support.ts` is the one deliberate exception, and only for credentials.

### Naming

- **Where:** team convention; `@typescript-eslint/no-shadow` catches the collisions renames create.
- **Rule:** `[name].page.ts` · `[name].component.ts` · `[name].spec.ts` · `[name].support.ts` · `[name].utils.ts` · `[name].json`. **No Hungarian prefixes**: the type signature carries the type.

### Tagging

- **Where:** `it()` titles.
- **Rule:** tag `@smoke` only for a critical happy path that must pass before a deploy. There are three today.

### Static checks

- **Where:** `npm run typecheck`, `npm run lint`, `npm run format:check`. The first two run in both workflows before the suite.
- **Rule:** both must be clean before any commit. After a bulk rename, run the typecheck, because a rename once made a parameter and a local share a name and only the compiler caught it.

---

## Execution Flow — Golden Path: Complete Purchase

```
Infrastructure: wdio.conf.ts
  ├── onPrepare: wipe reports/allure
  └── worker (own process, own singletons) runs completePurchase.spec.ts
        └── Test Specification
              ├── beforeEach
              │     ├── Page Objects: loginPage.openPage() → Page.open(baseUrl)      ← --env picked baseUrl
              │     └── Test Support: resetBrowserState()                            ← after navigation; storage is origin-scoped
              │
              ├── Test Support: loginAsStandardUser()
              │     ├── credentials.support → env var or JSON fallback
              │     ├── Page Objects: loginPage.loginWithCredentials()
              │     │     └── Browser Interaction: setValue ×2, click                ← Allure step per call
              │     └── asserts URL /inventory + header.expectPageTitle('Products')
              │
              ├── Page Objects: inventoryPage.addItemsToCartByNames(data.cartProducts)
              │     ├── Pure Utilities: toProductSlug(name)
              │     └── Browser Interaction: getSelectorByValue → getText ×2 → click   ← placeholder + quote validation
              │
              ├── Test Support: openCart() → UI Components: header → Browser Interaction: click
              │
              ├── Page Objects: cartPage.expectItemCartNames / Prices
              │     └── Browser Interaction: expectTextsFromElements                  ← retries up to 10 s
              │
              ├── Page Objects: checkoutPage.fillPersonalInformationForm → overviewPage.expect…
              │     (spec asserts each URL with expect(browser).toHaveUrl)
              │
              ├── Pure Utilities: sumArrAndFixPrecision(prices) vs fixNumberPrecision(subtotal)
              │
              └── Page Objects: completePage.expectCompletePurchaseText
                    └── Browser Interaction: expectText                             ← retrying, not a single read
  ├── afterTest: on failure, screenshot → awaited Allure attachment
  ├── onWorkerEnd: names the spec if it used a retry
  └── onComplete: allure generate → reports/allure/allure-report (60 s ceiling)
```

---

## Known Gaps

Only gaps that change how new code should be written.

| Area | Status |
|------|--------|
| Rare worker crash (**open**) | About 1 full run in 25–40, a worker process dies during ChromeDriver startup with Windows exit code `0xC0000409`, before any test runs. There's no Allure result or screenshot, and whichever spec it held is reported failed. Not spec-specific. Seen only on the Windows dev machine, never in CI. Untested experiments: a per-worker ChromeDriver cache directory, then `maxInstances: 2`. **Don't debug it inside a spec.** |
| CI artifact on a red run (deferred by owner decision) | Neither workflow's upload step has `if: always()`, so the Allure report exists only for green runs. On a red run, read the job log. |
| `--env dev` (deferred by owner decision) | Points at `saucedemo.com/v1/`, which is not a working target. Use `qa`. |
| `browser.*` outside its sanctioned places | Beyond the factory, Test Support and `Page.open()`: specs make 4 `expect(browser).toHaveUrl` calls, `login.page.ts` reads `browser.options.baseUrl`, and `cart.page.ts` calls `browser.waitUntil` after `clickAllIfExists`, which already performs that same wait. URL assertions need either a factory helper or an explicit exception; that decision is still to be made. Don't add new ones in the meantime. |
| Read-once getters with no callers | Eight public methods are never called: `getLoginErrorMessage`, `getLoginLogoText`, `getItemCartNames`, `getItemCartPrices`, `getItemOverviewNames`, overview's `getTextFromPrices`, `getCompletePurchaseText`, `Header.getPageTitleText`. Each has a retrying `expect…` sibling. Use the sibling; a getter feeding `expect(...)` reads once and races the page. |
| TypeScript 7 | Held on 6.0.x: every `typescript-eslint` release declares `typescript <6.1.0`. When one supports 7, check with `npm view typescript-eslint peerDependencies.typescript`, then `npm install -D typescript@^7 typescript-eslint@<that version>`, run `npm run typecheck` and `npm run lint`, and treat every new error as real (TS 7 is a rewrite). Check `eslint-plugin-wdio`'s peer range too, then run the suite and dispatch CI before a PR. |
| Node 26 | Not supported yet; use Node 24 (`.nvmrc`). On 26, `@puppeteer/browsers` extracts ChromeDriver's licence files but not the binary, and WDIO then refuses the half-filled cache folder, so every test fails at startup. WDIO before 9.32 also couldn't create sessions on 26. |
| Firefox | Configured and offered by `ci-on-demand.yml`, but no recorded CI run has used it. Treat it as unverified. |
| Environment-specific test data | Only `placeHolderData.json` exists, so per-environment values have nowhere to go. |
| Side-menu coverage | Only Logout is exercised. All Items, About and Reset App State have no tests. |
| Unit tests | None. The pure utilities and `getSelectorByValue`'s validation are covered only indirectly, by e2e runs. |
