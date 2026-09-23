# wdio-framework Architecture

## Purpose

This document supports decisions about where new code belongs, how layers connect, and what constraints must be respected when extending the framework. The audience is any engineer adding tests, pages, components, or utilities to this project.

**After reading this document you should be able to answer:**

- Where does a new page class go, what must it extend, and how must it export?
- Where does a new reusable UI fragment go vs. a new page method?
- Why can't I call `$()` directly in a spec or page?
- When does a helper belong in `tests/support/` rather than `tests/utils/`?
- What do I need to change if I add a new test environment?

**Maintenance rule:** Update this document when a new layer is added, a layer's responsibility changes, a new cross-cutting concern is introduced, or a known gap is closed. A document that lies is worse than no document — this one drifted badly once, claiming coverage that did not exist and describing files under extensions they no longer had.

---

## Layer Overview

Seven layers. Dependencies flow in one direction — no cycles.

```
Infrastructure (wdio.conf.ts, workflows, lint/format config)
  └── orchestrates ──► Test Specification
                            ├──► Test Support ──► Page Objects
                            ├──► Page Objects ──┬──► UI Components ──► Browser Interaction ──► WebdriverIO
                            │                   └──────────────────────► Browser Interaction
                            └──► Pure Utilities + Data
```

**Entry point:** Test Specification — nothing in the project imports specs.
**Foundation:** Browser Interaction, and Pure Utilities + Data — these call nothing else in the project.

Everything is TypeScript. `strict` is on, the project type-checks with zero errors, and `npm run typecheck` runs in CI before the suite.

---

## Layer 1 — Test Specification

**Responsibility:** Owns the test scenarios, assertions, and the ordered sequence of user actions that verify application behavior.

**Rules:**

- No raw WebdriverIO calls (`$()`, `$$()`, `browser.*`) in specs — all interactions go through page objects or Test Support
- **Specs never receive raw elements.** Assertions go through the factory's retrying helpers (`expectText`, `expectTextsFromElements`, `expectEventuallyEquals`), exposed via page methods such as `expectTextFromPrices`. This keeps the no-`$()`-outside-the-factory rule intact and keeps Allure logging in one place
- Page objects are imported as singleton instances — never instantiated inside a spec
- Credentials come from `tests/support/credentials.support.ts`, never from the JSON file directly. Other fixture data (products, personal info, expected messages) is imported from `tests/data/placeHolderData.json` as a typed JSON module: `import data from '../data/placeHolderData.json' with { type: 'json' }`
- **Every `beforeEach` calls `resetBrowserState()`, after navigating.** One browser session serves a whole spec file, so without this, state leaks between `it` blocks
- **Cleanup belongs in hooks, never at the bottom of a test body.** A failing test does not run to completion, so trailing cleanup silently does not happen and the next test inherits dirty state
- Smoke tests must include `@smoke` in the `it()` title — this is how the CI on-demand grep filter finds them
- No randomized test data. A failure has to be reproducible from the test name alone

**Inventory:**

| File | What it tests |
|------|---------------|
| `tests/specs/login.spec.ts` | Valid login, locked-out user error message, logout via side menu |
| `tests/specs/addProductsToCart.spec.ts` | Adding a fixed list of items, adding one specific item, removing every item |
| `tests/specs/completePurchase.spec.ts` | Full e2e flow: login → add items → cart → checkout form → order overview → confirmation |
| `tests/specs/filter.spec.ts` | All four product sort options (`lohi`, `hilo`, `az`, `za`), data-driven |

Currently 4 spec files, 11 tests, around 6 seconds for a full run.

---

## Layer 2 — Test Support

**Responsibility:** Reusable *preconditions* and cross-cutting test state — as distinct from page objects, which model pages. A page object models a PAGE; a flow models a STATE the test needs to start from.

**Rules:**

- **A fixture must never hide the thing under test.** A test whose subject *is* logging in drives the login page directly; only tests that need to *be* logged in use `loginAsStandardUser()`. The two login tests in `login.spec.ts` are intentionally not converted
- Support functions may call page objects and `browser.*` — this is the one layer above the factory that is allowed browser access, because session state is not a page concern
- Credentials read from the environment with committed fixtures as fallback, so pointing this framework at a real application is a config change rather than a security incident

**Inventory:**

| File | What it provides |
|------|------------------|
| `tests/support/flows.support.ts` | `loginAsStandardUser()`, `openCart()` — preconditions that assert they arrived |
| `tests/support/session.support.ts` | `resetBrowserState()` — clears cookies, session and local storage, then refreshes |
| `tests/support/credentials.support.ts` | `validUser`, `lockedOutUser` — `SAUCE_USERNAME` / `SAUCE_PASSWORD` (and the `LOCKED_OUT_` pair) with JSON fallback |

---

## Layer 3 — Page Objects

**Responsibility:** Models each application page — owns its locators, encapsulates user-facing actions, and handles navigation to that page.

**Rules:**

- Every page class extends `Page` (`tests/pages/page.ts`), which provides `wdioFactory` and `open(path)`
- Every page exports a singleton instance: `export default new XxxPage()`
- All locators are objects with exactly `{ selector, description }` — no bare strings. The description is what appears in failure messages and Allure steps, so write it for someone reading a red build
- All browser interactions go through `this.wdioFactory.*` — never `$()` or `browser.*` directly
- Pages that include the header UI declare `header = new Header()` as a class property
- Dynamic locators use `${value}` as a placeholder, resolved via `this.wdioFactory.getSelectorByValue(locator, value)` before being passed to any other factory method
- **Locators key off SauceDemo's `data-test` attributes, not visible text.** `UtilsMethods.toProductSlug()` turns `"Sauce Labs Onesie"` into `sauce-labs-onesie`, and `:has(button[data-test$='-sauce-labs-onesie'])` finds that product's card. The `$=` suffix match is deliberate: it survives the button flipping between `add-to-cart-` and `remove-`
- Where a page exposes a list, it should expose a **retrying** assertion for that list, not just a getter. An action that re-renders the grid races a single read

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/pages/page.ts` | Base class: initializes `WdioFactoryUtils`, provides `open(path)` navigation |
| `tests/pages/login.page.ts` | Username/password inputs, login button, error message; `openPage()`, `loginWithCredentials()` |
| `tests/pages/inventory.page.ts` | Product grid, dynamic add-to-cart buttons, name and price lists with retrying assertions; owns `Header` |
| `tests/pages/cart.page.ts` | Cart item names and prices, remove-all, checkout button; owns `Header` |
| `tests/pages/checkout.page.ts` | First name, last name, postal code inputs, continue button; owns `Header` |
| `tests/pages/overview.page.ts` | Item list, subtotal/tax/total retrieval; owns `Header` |
| `tests/pages/complete.page.ts` | Confirmation header text retrieval; owns `Header` |

**Tradeoff:** Singleton exports simplify imports — specs reference `loginPage` without instantiating it. This is safe under the current parallel setup because WebdriverIO runs each spec file in its **own worker process**, so every worker gets its own module instances and nothing is shared across them. It would become unsafe only if multiple spec files ever shared one process.

---

## Layer 4 — UI Components

**Responsibility:** Encapsulates reusable UI fragments that appear across multiple pages, exposing them as composable objects that pages own.

**Rules:**

- Every component class extends `BaseComponent` (`tests/components/base.component.ts`)
- All browser interactions go through `this.wdioFactoryUtils.*` — never `$()` directly
- `Header` owns `SideMenu` as a class property: `sideMenu = new SideMenu()` — callers access it via `page.header.sideMenu`
- Components are never exported as singletons — they are instantiated inside page class bodies

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/components/base.component.ts` | Base class: initializes `WdioFactoryUtils` instance |
| `tests/components/header.component.ts` | Cart icon, burger menu button, page title, sort dropdown; owns `SideMenu` |
| `tests/components/sidemenu.component.ts` | Side menu links; `clickOnSideMenuOptionByValue(option)` |

---

## Layer 5 — Browser Interaction

**Responsibility:** The only sanctioned interface to the WebdriverIO API — wraps every DOM operation with wait logic and Allure step logging.

**Rules:**

- No page, component or spec calls `$()`, `$$()` or `browser.*` directly. The one exception is Test Support, for session-level state
- Every public method logs an Allure **step** after executing — do not call Allure APIs from outside this layer. Allure's `addStep` and `addAttachment` return promises and **must be awaited**
- Dynamic selector resolution (`getSelectorByValue`) happens before passing a locator to any other method in this layer
- Assertions assert on the **element**, not on an already-resolved string, so `expect-webdriverio` re-queries until the condition holds. `expect(await getText())` checks once and races the page

**Inventory:**

| Method | What it does |
|--------|--------------|
| `click(element)` | Waits for clickable, clicks |
| `setValue(element, value)` | Waits for enabled, sets the value |
| `getText(element)` | Waits for displayed, returns text |
| `getElements(elements)` | Returns all DOM elements matching the selector |
| `getTextFromElements(elements)` | Returns the text of every match |
| `expectText(element, expected)` | Retrying assertion on one element's text |
| `expectEventuallyEquals(label, readValues, expected)` | Re-reads a collected list until it matches, then asserts for a readable diff |
| `expectTextsFromElements(elements, expected)` | Retrying comparison of a group's text |
| `selectOptionFromSelect(element, attr, value)` | Selects a `<select>` option by attribute match |
| `clickAllIfExists(element)` | Clicks every match, **bounded by the initial count**, then waits for zero to remain |
| `getSelectorByValue(element, value)` | Substitutes `${value}` into selector and description; throws on a missing placeholder or on quote characters |

File: `tests/utils/wdioFactory.utils.ts`

**Two traps documented in the code — read them before editing this file:**

- `getSelectorByValue` **rejects** quote characters rather than escaping them. Correct XPath escaping needs `concat()`, which string substitution cannot express. Failing loudly beats building a broken selector silently
- The `await` on `$$(...)` in `getElements` is **load-bearing**, even though `@typescript-eslint/await-thenable` flags it. WDIO types `ChainablePromiseArray` as not-a-Promise; the runtime object is one. Without the await, `.length` is a Promise and every loop over the result silently does nothing. There is a scoped `eslint-disable-next-line` on it

---

## Layer 6 — Pure Utilities + Data

**Responsibility:** Non-browser computation and static fixture data.

**Rules:**

- Utility functions must be pure — no browser calls, no side effects, no WebdriverIO imports
- Sort helpers return a **copy**. `Array.prototype.sort` mutates in place, which would silently reorder the caller's array
- Reductions pass an initial value. `reduce` with none throws on an empty array — an empty cart is a real case
- Fixture data is imported as a typed JSON module, not read with `readFileSync`. The old form was untyped and resolved relative to the working directory

**Inventory:**

| File | What it provides |
|------|------------------|
| `tests/utils/utilsMethods.utils.ts` | `sortLowToHighValues`, `sortHighToLowValues`, `sortTextAToZ`, `sortTextZToA`, `toProductSlug`, `sumArrAndFixPrecision`, `fixNumberPrecision` |
| `tests/data/placeHolderData.json` | Fixture users (fallback only), login error string, cart product lists, checkout personal info |

**Tradeoff:** A single data file covering all test data is simple but has no mechanism for environment-specific values. As the suite grows or environments diverge, this file will need splitting per environment.

---

## Layer 7 — Infrastructure

**Responsibility:** Configures the WebdriverIO runner, the static checks, and the CI pipelines.

**Rules:**

- The config object is typed as `WebdriverIO.Config`, so a typo'd key fails the build instead of being silently ignored
- Suite definitions (`regression`, `loginAndPurchase`) live in `wdio.conf.ts` — CI references suite names, never ad-hoc file globs. **`smoke` is deliberately not a suite:** `@smoke` tags individual tests across several files, so it stays a `--mochaOpts.grep`. A suite entry would select whole files and quietly run more than was asked for
- The `onPrepare` hook cleans the Allure results directory before each run — never remove it
- The `afterTest` hook attaches a screenshot on failure — never remove it, and **keep the `await`**
- `onWorkerEnd` reports any spec that consumed a retry. Its `retries` argument is the budget **remaining**, not the number used; the correct test is `SPEC_FILE_RETRIES - retries > 0`. Reading it the other way reports every spec on a green run as flaky
- Environment selection (`--env qa` / `--env dev`) comes from CI inputs or CLI flags, never hardcoded
- New environments require a new entry in the `wdio.conf.ts` baseUrl map and a new option in the `ci-on-demand.yml` environment input
- Workflow inputs are passed through `env:` and quoted at the point of use, so a future free-text input cannot become shell injection
- Node version lives in `.nvmrc` and both workflows read it with `node-version-file` — one source of truth

**Inventory:**

| File | What it configures |
|------|--------------------|
| `wdio.conf.ts` | Runner, suites, browsers (Chrome/Firefox headless), timeouts, env-driven `logLevel`, `specFileRetries`, Allure + Spec reporters, lifecycle hooks |
| `eslint.config.js` | Flat config: recommended JS + TypeScript rules, `eslint-plugin-wdio` on `tests/`, three type-aware rules, Prettier compatibility last |
| `.prettierrc` / `.prettierignore` | Formatting. Scoped to code — `*.md` and `.github` are deliberately excluded |
| `.nvmrc` | Node 20.17.0, read by both workflows |
| `.github/workflows/ci.yml` | Push/PR to main: typecheck → lint → full regression on QA → Allure artifact |
| `.github/workflows/ci-on-demand.yml` | Manual dispatch: configurable env, browser, suite; one Test step that builds its own arguments |

---

## Cross-Cutting Concerns

### Allure Logging

- **Where:** Centralized in `wdioFactory.utils.ts` — every method attaches a step
- **Rule:** Do not call `addStep` or `addAttachment` from pages, components or specs. If richer context is needed, extend `WdioFactoryUtils`. Always `await` them — they return promises, and an unawaited attachment can be lost during teardown

### Test Data

- **Where:** `tests/data/placeHolderData.json`, imported as a typed JSON module; credentials via `tests/support/credentials.support.ts`
- **Rule:** No hardcoded user-facing strings in `it()` bodies, and no randomized data

### Naming Conventions

- **Where:** Enforced by team convention plus ESLint
- **Rule:** `[name].page.ts` · `[name].component.ts` · `[name].spec.ts` · `[name].support.ts` · `[name].utils.ts`
- **No Hungarian prefixes.** The TypeScript signature carries the type; `strObjElement` says nothing `element: Locator` does not

### Test Tagging

- **Where:** Embedded in `it()` titles (`@smoke`)
- **Rule:** Tag `@smoke` only for a critical happy path that must pass before deployment

### Environment Configuration

- **Where:** `wdio.conf.ts` reads the `--env` CLI flag to select the base URL
- **Rule:** Environment is injected at the runner level — pages and specs never read `process.env` for URLs. `tests/support/credentials.support.ts` is the single deliberate exception, and only for credentials

### Static Checks

- **Where:** `npm run typecheck`, `npm run lint`, `npm run format:check`; the first two run in CI before the suite
- **Rule:** Both must be clean before a commit. After any bulk rename, run the typecheck — a rename once made a parameter and a local share a name, and only the compiler caught it

---

## Execution Flow — Golden Path: Complete Purchase

The most complete flow across all layers.

```
Infrastructure (wdio.conf.ts)
  └── Mocha runner loads completePurchase.spec.ts
        └── Test Specification
              ├── Pure Utilities + Data: placeHolderData.json via typed JSON import
              │
              ├── Test Support: resetBrowserState() in beforeEach   ← after navigation; storage is origin-scoped
              │
              ├── Test Support: loginAsStandardUser()
              │     ├── credentials.support.ts                      ← env var, or JSON fallback
              │     └── Page Objects (loginPage.loginWithCredentials)
              │           └── Browser Interaction: setValue, click   ← Allure step per call
              │                 └── WebdriverIO
              │
              ├── Page Objects (inventoryPage.addItemsToCartByNames)
              │     ├── Browser Interaction: getSelectorByValue      ← ${value} resolved, input validated
              │     └── Browser Interaction: click
              │
              ├── Test Support: openCart()
              │     └── UI Components (header.component)
              │           └── Browser Interaction: click
              │
              ├── Page Objects (cartPage → checkoutPage → overviewPage)
              │     └── Browser Interaction at each step
              │
              ├── Pure Utilities (sumArrAndFixPrecision)             ← pure computation, no browser
              │
              └── Test Specification: assert the confirmation message
                    └── Page Objects (completePage)
                          └── Browser Interaction: expectText        ← retrying assertion, not a single read
```

---

## Known Gaps

| Area | Status |
|------|--------|
| Rare worker crash under parallel load | Roughly 1 full run in 40, a worker process dies during ChromeDriver startup with Windows exit code `0xC0000409`, before any test runs — so there is no Allure result and no screenshot, and whichever spec that worker held is reported as failed. Not specific to any spec file. `@wdio/visual-service` has been ruled out; `maxInstances: 2` is the next untested experiment |
| CI artifact on a red run | The Allure upload step has no `if: always()`, so it is skipped when tests fail — a report you only get on green runs. Deferred by decision; read the Actions job log instead |
| `--env dev` | Points at `saucedemo.com/v1/`, which is not a working target. Treat `dev` as unsupported and run against `qa`. Deferred by decision |
| Environment-specific test data | Single `placeHolderData.json` — no mechanism for per-environment values |
| Side menu coverage | `clickOnSideMenuOptionByValue()` is only exercised for logout. About and Reset App State have no coverage |
| Unit test layer | There is none. The pure functions in `utilsMethods.utils.ts` and the input validation in `getSelectorByValue` are only covered transitively through e2e runs |
