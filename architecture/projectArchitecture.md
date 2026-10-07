# wdio-framework Architecture

**Verified against the code:** 2026-09-23, `main` at `9f18c20` (after the audit branch merged). Layer 7 (Infrastructure) re-checked the same day for the Node 24 / dependency update (PR #25), and again against `main` at `2c4cbc8` when agent tooling was added. Layers 3–5 re-checked on 2026-09-30 against `main` at `3343f98` plus the Browser Interaction refactor (`WdioFactoryUtils` split into `elementActions`, `elementExpectations` and `locator`) and the Allure reporting changes (`report.utils.ts`, title tags, categories). Every rule below was checked against the source, and wherever the code breaks a rule, *Known Gaps* says so.

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
- **Test Support → WebdriverIO**, directly, for session state. This is the one sanctioned bypass of Browser Interaction (see Layer 2).

**Entry point:** Test Specification. Nothing in the project imports a spec.
**Foundation:** Browser Interaction, and Pure Utilities + Data. Neither imports anything else in the project.

Everything is TypeScript in `strict` mode, run through **tsx**. `npm run typecheck` and `npm run lint` both run in CI before the suite.

---

## Layer 1 — Test Specification

**Responsibility:** owns the scenarios: the order of user actions and what is asserted about the result.

**Rules:**

- **No `$()` or `$$()` in a spec**, ever. Interactions go through page objects or Test Support.
- **Specs never receive raw elements.** Assertions go through page methods backed by the retrying helpers in `elementExpectations.utils.ts` (`expectItemCartNames`, `expectTextFromPrices`, `expectCompletePurchaseText`, …).
- **The only `browser` reference a spec may make is a URL assertion**, `await expect(browser).toHaveUrl(expect.stringContaining('/path'))`. This is current practice (4 call sites) rather than a documented decision. See *Known Gaps*.
- Page objects are imported as singletons and never instantiated in a spec.
- Credentials come from `tests/support/credentials.support.ts`, never from the JSON. Other fixture data comes from `tests/data/placeHolderData.json` as a typed JSON module: `import data from '../data/placeHolderData.json' with { type: 'json' }`.
- **Every `beforeEach` calls `loginPage.openPage()` and then `resetBrowserState()`**, in that order. One browser session serves a whole spec file, and storage is origin-scoped.
- **Cleanup belongs in hooks, never at the bottom of a test body.** A failing test never reaches trailing cleanup.
- Smoke tests carry `@smoke` in the `it()` title. That is how CI's grep finds them.
- **A test written from a Jira ticket carries its key as a title tag** (`@KAN-4`), before `@journey`/`@smoke`; a test covering two tickets carries both. `wdio.conf.ts` turns it into the report's Jira link. No Allure call is ever made from a spec.
- No randomized data. A failure has to be reproducible from the test name alone.

**Inventory:** 6 spec files, 22 tests, about 6 s for a full local run.

| File | Tests | What it covers |
|------|------:|----------------|
| `tests/specs/login.spec.ts` | 3 | Valid login `@smoke`, locked-out error message, logout through the side menu `@smoke` |
| `tests/specs/cart.spec.ts` | 5 | Adding a fixed product list and one specific product `@smoke` (cart badge count, the card's Remove button); removing one product then every product from the cart (badge updates, then disappears); removing a product from the inventory page; the cart is empty (no rows, no badge) when nothing was added |
| `tests/specs/completePurchase.spec.ts` | 1 | Purchase journey `@journey @smoke`: login → add → cart → checkout form → overview (product names carry through) → confirmation, asserting each transition (URL and title). Prices and totals are left to `overview.spec.ts` |
| `tests/specs/checkout.spec.ts` | 7 | The checkout information form, from an empty cart: the three inputs' placeholders (`checkoutPlaceholders`); a missing First Name, Last Name or Postal Code blocks Continue with that field's error (`checkoutErrors`); with several empty, only the first in form order is named; fields of only spaces count as filled and reach the overview; Checkout is reachable with an empty cart (guarded by no rows and no badge) |
| `tests/specs/overview.spec.ts` | 1 | The checkout overview, reached with `reachOverview`: each row's name, description and price equal what the inventory showed, and Item total, Tax (8%, rounded up to the cent) and Total equal the literal `expectedOverview` fixture values |
| `tests/specs/inventorySort.spec.ts` | 5 | All four sort options (`az`, `za`, `lohi`, `hilo`): the page opens A to Z (and `az` is checked after moving to `za`), both price sorts break ties by name A to Z (guarded by a shared price existing), every inventory price shows exactly 2 decimals (checked in the low-to-high test), and the sort resets to A to Z after going to the cart and back through the side menu's All Items |

**Tradeoff:** `inventorySort.spec.ts` derives its expected order by sorting what the page is already showing, not from a hardcoded list. Adding a product doesn't break it, and a broken sort still does. The cost: if the page loaded the wrong *set* of products, this spec would not notice.

---

## Layer 2 — Test Support

**Responsibility:** reusable *preconditions* and session state. A page object models a PAGE; a flow models a STATE the test starts from.

**Rules:**

- **A fixture must never hide the thing under test.** Only tests that need to *be* logged in use `loginAsStandardUser()`. The two tests in `login.spec.ts` whose subject is logging in drive the login page directly, on purpose.
- **Every flow asserts that it arrived** (URL and page title) before returning. That way a broken precondition fails as a precondition, not three steps later as a mystery.
- This is the only layer above Browser Interaction allowed to use `browser.*`, because session state is not a page concern.
- Credentials are read from the environment, with the committed JSON as fallback. Pointing the framework at a real application then becomes a config change, not a security incident.

**Inventory:**

| File | What it provides |
|------|------------------|
| `tests/support/flows.support.ts` | `loginAsStandardUser()`, `openCart()`, `openCheckoutInformation()` (cart → Checkout), `reachOverview(productNames)` (adds the products, goes through checkout to the overview, and returns each product's name, price and description as the inventory showed them): preconditions that assert they arrived. `expectOnCheckoutInformation()` and `expectOnOverview()` are those arrival checks (URL and title), also used by specs that assert where an action left them, so no new `expect(browser)` goes into a spec |
| `tests/support/session.support.ts` | `resetBrowserState()`: deletes cookies, clears session and local storage, refreshes |
| `tests/support/credentials.support.ts` | `validUser`, `lockedOutUser`: `SAUCE_USERNAME` / `SAUCE_PASSWORD` and the `SAUCE_LOCKED_OUT_` pair, with JSON fallback |

---

## Layer 3 — Page Objects

**Responsibility:** models one application page: its locators, its user-facing actions, and navigation to it.

**Rules:**

- Every page extends `Page` (`tests/pages/page.ts`), which provides `open(path)`.
- Every page exports a singleton: `export default new XxxPage()`.
- Every locator is `{ selector, description }`, matching the `Locator` interface in `tests/utils/locator.utils.ts`. The `locators` objects aren't annotated with it; the Browser Interaction functions' parameter types enforce the shape. The description appears in failure messages and Allure steps, so write it for someone reading a red build.
- All interaction goes through the Browser Interaction functions, imported as `import * as actions from '../utils/elementActions.utils.js'` and `import * as expectations from '../utils/elementExpectations.utils.js'`. **No `$()` or `$$()`**: ESLint's `no-restricted-globals` fails the build on either. The only `browser.*` call a page may make is `Page.open()`. One page currently breaks this; see *Known Gaps*.
- Pages with the app header declare `header = new Header()`. Every page except `LoginPage` does.
- Dynamic locators put `${value}` in both selector and description, resolved with `getSelectorByValue(locator, value)` from `locator.utils.ts` before the locator is passed to any action or expectation.
- **Locators never match on visible text. Prefer SauceDemo's `data-test` attributes** for anything new. Some older locators use ids or classes (`#login-button`, `#first-name`, `.bm-burger-button`, `span.title`, `select.product_sort_container`), which are stable enough on SauceDemo but not the model to copy. `UtilsMethods.toProductSlug()` turns `"Sauce Labs Onesie"` into `sauce-labs-onesie`, and `:has(button[data-test$='-sauce-labs-onesie'])` finds that card. The `$=` suffix match is deliberate: it survives the button flipping between `add-to-cart-` and `remove-`.
- **Where a page exposes a list, it exposes a retrying `expect…` method for it**, not just a getter. An action that re-renders the list races a single read.

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/pages/page.ts` | Base class: provides `open(path)` |
| `tests/pages/login.page.ts` | Username, password, login button, error message, logo; `openPage()`, `loginWithCredentials()`, `expectLoginErrorMessage()`, `expectLoginLogoText()` |
| `tests/pages/inventory.page.ts` | Product names and prices with retrying list assertions, and `getProducts()` pairing them; dynamic per-product name, price, add-to-cart and remove locators; a dynamic per-product description locator (`getInventoryItemDescriptionByNameText()`); `expectEveryPriceToMatch()` for the price format; `addItemsToCartByNames()`, `clickInventoryItemRemoveByName()`; `expectItemInCartByName()` / `expectItemNotInCartByName()` for a card's button state; owns `Header` |
| `tests/pages/cart.page.ts` | Cart names and prices with retrying assertions, `removeItemFromCartByName()`, `removeAllItemsFromCart()`, checkout button; owns `Header` |
| `tests/pages/checkout.page.ts` | First name, last name, postal code, continue, error message; `fillPersonalInformationForm()`; `expectErrorMessage()`, `expectPlaceholders()` (the three inputs' placeholders as one retrying list); owns `Header` |
| `tests/pages/overview.page.ts` | Item names, descriptions and prices with retrying assertions, numeric prices, subtotal, tax and total labels with retrying text assertions (`expectSubTotalText`, `expectTaxText`, `expectTotalText`), finish button; owns `Header` |
| `tests/pages/complete.page.ts` | Confirmation header with a retrying assertion; owns `Header` |

**Tradeoff:** singleton exports make imports simple. They are safe because WebdriverIO runs each spec file in its **own worker process**, so each worker has its own module instances. They would become unsafe only if several spec files ever shared a process.

---

## Layer 4 — UI Components

**Responsibility:** fragments that appear on more than one page, exposed as objects the pages own.

**Rules:**

- Components are plain classes with no base class. Like pages, they interact only through the `actions` and `expectations` modules.
- Components are never singletons. Pages instantiate them in the class body.
- `Header` owns `SideMenu` as `sideMenu = new SideMenu()`, reached as `page.header.sideMenu`.
- Side-menu options are addressed by their `data-test` slug in lowercase: `clickOnSideMenuOptionByValue('logout')`.

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/components/header.component.ts` | Burger menu button, cart button, cart badge with `expectCartBadgeCount()` / `expectNoCartBadge()`, page title with `expectPageTitle()`, sort dropdown; owns `SideMenu` |
| `tests/components/sidemenu.component.ts` | Dynamic `${value}-sidebar-link` locator; `clickOnSideMenuOptionByValue()` |

**Tradeoff:** the sort dropdown lives on `Header` even though only the inventory page shows it. That keeps one header model, but `cartPage.header.clickOnSortFilterDropdownOption()` type-checks and then times out. Put new inventory-only controls on `inventory.page.ts`, not on `Header`.

---

## Layer 5 — Browser Interaction

**Responsibility:** the only sanctioned route to WebdriverIO element APIs. It wraps DOM operations with explicit waits, readable timeout messages and Allure steps.

It is three modules of stateless exported functions, split by what each one is for. There is no class to instantiate:

- `elementActions.utils.ts` changes or reads the page.
- `elementExpectations.utils.ts` asserts on it, with retries.
- `locator.utils.ts` holds the locator shape and has no WebdriverIO dependency at all.
- `report.utils.ts` holds `step()`, the one wrapper around Allure that everything under `tests/` uses.

Expectations import from actions (to read texts), and both import `Locator`. Nothing imports in the other direction.

**Rules:**

- `$()` and `$$()` appear in `elementActions.utils.ts` and `elementExpectations.utils.ts` and nowhere else. ESLint's `no-restricted-globals` enforces it for every other file under `tests/`.
- **Raw WebdriverIO elements never leave these modules.** Functions take a `Locator` and return strings, numbers or nothing. `$()` is re-run on every call, so a re-rendered element is never stale.
- **Every function that acts or asserts runs inside `step()`**, so its step opens before the action, carries a duration, and is marked **failed** with the error if the action throws. Don't go back to `addStep`: it recorded a step only after success, so the step that broke a test never showed. The read-only helpers (`getAttribute`, `getTextFromElements`, `countElements`) and `getSelectorByValue` deliberately log nothing.
- **Step names are imperative and built from the locator description** (`🥾 Click …`, `⌨ Set …`, `🔎 Expect …`), because a failed step has to read correctly too. `getText` and `clickAllIfExists` rename their step once they know the text or the count.
- **A `sensitive: true` locator never shows its value**: `setValue` writes dots in the step. Mark any password or token field this way.
- **An assertion goes in `elementExpectations`, an interaction or read goes in `elementActions`.** A function that does both belongs in expectations.
- **Assertions assert on the element, not on a resolved string**, so `expect-webdriverio` retries. `expect(await getText()).toEqual(x)` checks once and races the page.
- Waits are bounded. Nothing here loops without a ceiling.

**Inventory:**

`tests/utils/locator.utils.ts`

| Member | What it does |
|--------|--------------|
| `Locator` (interface) | `{ selector, description, sensitive? }`, the shape every locator in the project uses |
| `getSelectorByValue(element, value)` | Substitutes `${value}` into selector and description, keeping `sensitive`; **throws** on a missing placeholder or on quote characters |

`tests/utils/elementActions.utils.ts`

| Member | What it does |
|--------|--------------|
| `click(element)` | Waits for clickable, clicks, logs |
| `setValue(element, value)` | Waits for enabled, sets the value (no implicit click), logs |
| `selectOptionFromSelect(element, attr, value)` | Waits for displayed, selects by attribute |
| `getText(element)` | Waits for displayed, returns text, logs |
| `getAttribute(element, attribute)` | One attribute of one element, read once (null if absent); feeds `expectEventuallyEquals` |
| `getTextFromElements(elements)` | Text of every match, read once |
| `countElements(elements)` | How many elements match right now |
| `clickAllIfExists(element)` | Clicks each match, **bounded by the initial count** (2 s probe), then waits for none to remain |

`tests/utils/elementExpectations.utils.ts`

| Member | What it does |
|--------|--------------|
| `expectText(element, expected)` | Retrying assertion on one element's text |
| `expectNotExisting(element)` | Retrying assertion that nothing matches the locator |
| `expectEventuallyEquals(label, readValues, expected)` | Re-reads a collected list until it matches (10 s), then asserts once more for a readable diff |
| `expectTextsFromElements(elements, expected)` | `expectEventuallyEquals` over a locator's texts |
| `expectEveryTextToMatch(elements, pattern)` | Re-reads a locator's texts until every one matches the pattern (10 s); fails on no matches, and the diff lists the texts that don't match |

`tests/utils/report.utils.ts`

| Member | What it does |
|--------|--------------|
| `step(name, body)` | Runs `body` as one Allure step and returns its result; the body can rename the step through its context |

**A trap, commented in the code. Read it before editing:** `getSelectorByValue` **rejects** quotes rather than escaping them. Correct XPath escaping needs `concat()`, which string substitution cannot express. Failing loudly beats building a broken selector silently.

**Tradeoff:** functions rather than a class means there is nothing to mock or subclass, and nothing to configure per page. That holds while every function is stateless. A per-page setting such as a custom timeout would have to be passed as an argument, not stored.

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
| `tests/utils/utilsMethods.utils.ts` | `sortLowToHighValues`, `sortHighToLowValues`, `sortTextAToZ`, `sortTextZToA`, `sortByPriceThenName` (price, then name A to Z for ties), `findSharedValues`, `toProductSlug`, `sumArrAndFixPrecision`, `fixNumberPrecision` |
| `tests/data/placeHolderData.json` | Users (credential fallback only), locked-out error text, `cartProducts`, `singleCartProduct`, `cartButtonLabels` (Add to cart / Remove), checkout `personalInfo`, `whitespaceInfo` (single spaces), `checkoutPlaceholders`, `checkoutErrors`, `priceFormat` (the displayed price pattern), `expectedOverview` (item total, tax and total for `cartProducts`), `orderConfirmation` |

**Tradeoff:** one data file is simple, but it can't hold per-environment values. It will need splitting when environments diverge.

---

## Layer 7 — Infrastructure

**Responsibility:** configures the runner, the static checks and the CI pipelines.

**Rules:**

- The config is typed `WebdriverIO.Config`, so a mistyped key fails the typecheck instead of being ignored.
- Suites (`regression`, `loginAndPurchase`) live in `wdio.conf.ts`, and CI refers to suites by name. **`smoke` is deliberately not a suite.** `@smoke` tags individual tests across files, so it stays `--mochaOpts.grep smoke`; a suite would select whole files.
- `onPrepare` wipes `reports/allure` before each run, then writes `categories.json` into the results (see *Allure reporting*). `before` subscribes to the browser console over BiDi. `beforeTest` turns title tags into labels. `afterTest` attaches a screenshot, the page URL and the console output on failure; **keep its `await`s**. `onComplete` generates the HTML report with a 60 s ceiling.
- `specFileRetries: 1`, deferred. `onWorkerEnd` names any spec that used a retry. Its `retries` argument is the budget **remaining**, so the test is `SPEC_FILE_RETRIES - retries > 0`. Reading it the other way flags every green spec as flaky.
- `logLevel` defaults to `error` and is raised by `WDIO_LOG_LEVEL` (CI sets `info`) without a code change.
- Browsers run headless. `HEADED=1` drops the headless flag for a local run you want to watch; it is ignored whenever `CI` is set, so it can't reach a runner with no display.
- Environment (`--env qa|dev`) and browser (`--browser chrome|firefox`) come from CLI flags, with `qa` and `chrome` as defaults. Unknown values fall back silently to the defaults.
- A new environment needs an entry in the `environments` map in `wdio.conf.ts` and an option in `ci-on-demand.yml`'s `environment` input.
- Workflow inputs go through `env:` and are quoted where used, so a future free-text input can't become shell injection.
- `.nvmrc` is the only source of the Node version. Both workflows read it with `node-version-file`.
- **CI trigger policy (settled owner decision):** `ci.yml` runs on pull requests to `main` and on pushes to `main`, never on feature-branch pushes. To check a branch before a PR, dispatch `ci-on-demand.yml`.

**Inventory:**

| File | What it configures |
|------|--------------------|
| `wdio.conf.ts` | Runner, specs, suites, `maxInstances: 10`, env and browser maps (headless Chrome/Firefox; headed on a local run with `HEADED=1`), timeouts, `logLevel`, retries, Spec + Allure reporters (Jira link template, Environment panel values), failure categories, the six lifecycle hooks |
| `package.json` | Scripts (`test`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, Allure), `engines.node >=24.0.0`, ESM |
| `tsconfig.json` | `strict`, `NodeNext`, `resolveJsonModule`; Node (`@types/node` 24), WDIO and Mocha global types |
| `allure-commandline.d.ts` | Type declaration for the untyped `allure-commandline` package used by `onComplete` |
| `eslint.config.js` | Flat config: JS + TS recommended, four type-aware rules (`no-floating-promises`, `await-thenable`, `require-await`, `no-shadow`), `eslint-plugin-wdio` on `tests/`, `no-restricted-globals` forbidding `$`/`$$` outside the two Browser Interaction modules, Prettier compatibility last |
| `.prettierrc` / `.prettierignore` | Formatting for code only. `*.md` and `.github` are excluded on purpose |
| `.nvmrc` | Node 24.21.0 (LTS), read by both workflows |
| `.github/workflows/ci.yml` | PR to `main`, push to `main` (and the dead `continous-integration` branch): typecheck → lint → full suite on QA, Chrome → Allure artifact |
| `.github/workflows/ci-on-demand.yml` | Manual dispatch: env, browser, optional suite or `smoke` grep; one Test step that builds its own arguments; optional artifact |

**Agent tooling sits outside the layers.** `.claude/skills/` (Claude Code skills, today `refine-ticket` and `automate-ticket`), `.claude/agents/` (subagents, today `code-reviewer`) and `.mcp.json` (the Atlassian and Playwright MCP servers) are used only by Claude Code sessions. Nothing in the suite imports them, and they import nothing from it. `refine-ticket` *reads* the specs, pages, flows, this document and `consulting/.claude.md` to decide what the framework can automate. `automate-ticket` implements a refinement under the same rules and updates this document's inventories as it goes. `code-reviewer` reviews a PR against this document and the latest refinement, and posts one PR comment; a few of its convention checks are written into the agent itself, so a rule change here may need the same change there. Drift here now produces wrong refinements, and code written to wrong rules.

---

## Cross-Cutting Concerns

### Allure reporting

- **Where:** `report.utils.ts` is the only file under `tests/` that imports `@wdio/allure-reporter`; ESLint's `no-restricted-imports` enforces it. `wdio.conf.ts` owns everything test-level. WDIO's own step and screenshot reporting is disabled, so these steps are the whole story.
- **Steps:** every action and expectation is a step. Flows and multi-step page methods (`loginWithCredentials`, `fillPersonalInformationForm`, `addItemsToCartByNames`, `addItemToCartByName`, the in-cart checks, `Header.clickOnSortFilterDropdownOption`) wrap theirs in a parent `step()` named after what the user is doing, so a test reads as an outline. **Don't wrap one-line page methods**; that only adds a layer of noise.
- **Labels** (`beforeTest`): a Jira-key tag in the title becomes an issue link, every other tag an Allure tag, `@smoke` sets severity critical (otherwise normal), and the `describe` title becomes the feature.
- **Environment panel:** env, base URL, browser, headed and Node version, after fallback.
- **Categories:** failures are sorted by message into a rejected dynamic locator (test defect), an element that never became ready, and a wrong value on the page (possible product defect). The rules match the messages Browser Interaction throws, so **changing a `timeoutMsg` or a `Cannot substitute` message means updating `ALLURE_CATEGORIES` too.**
- **On failure:** screenshot, page URL, and the browser console output for that test (Chrome and Firefox over BiDi).
- **Rule:** always await Allure calls.

### Waiting and assertions

- **Where:** Browser Interaction. Element waits use `waitforTimeout` (10 s); list assertions use `expectEventuallyEquals` (10 s); the Mocha test timeout is 60 s.
- **Rule:** assert on something that retries. If you need a new assertion shape, add a function to `elementExpectations.utils.ts` and a page method; don't read once and compare in the spec.

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
- **Rule:** tag `@smoke` only for a critical happy path that must pass before a deploy. There are four today. `@journey` marks a journey test. A Jira key (`@KAN-4`) names the ticket the test was written from. All of them become Allure labels.

### Static checks

- **Where:** `npm run typecheck`, `npm run lint`, `npm run format:check`. The first two run in both workflows before the suite.
- **Rule:** both must be clean before any commit. After a bulk rename, run the typecheck, because a rename once made a parameter and a local share a name and only the compiler caught it.

---

## Execution Flow — Golden Path: Complete Purchase

```
Infrastructure: wdio.conf.ts
  ├── onPrepare: wipe reports/allure, write categories.json
  ├── before: subscribe to browser console (BiDi)
  └── worker (own process, own singletons) runs completePurchase.spec.ts
        └── Test Specification
              ├── beforeTest (config): title tags → Jira link, tags, severity, feature
              ├── beforeEach
              │     ├── Page Objects: loginPage.openPage() → Page.open(baseUrl)      ← --env picked baseUrl
              │     └── Test Support: resetBrowserState()                            ← after navigation; storage is origin-scoped
              │
              ├── Test Support: loginAsStandardUser()
              │     ├── credentials.support → env var or JSON fallback
              │     ├── Page Objects: loginPage.loginWithCredentials()
              │     │     └── Browser Interaction: setValue ×2, click                ← one step each, nested under "Log in as …"
              │     └── asserts URL /inventory + header.expectPageTitle('Products')
              │
              ├── Page Objects: inventoryPage.addItemsToCartByNames(data.cartProducts)
              │     ├── Pure Utilities: toProductSlug(name)
              │     └── Browser Interaction: getSelectorByValue → getText ×2 → click   ← placeholder + quote validation
              │
              ├── Test Support: openCart() → UI Components: header → Browser Interaction: click
              │
              ├── Page Objects: cartPage.clickOnCheckoutButton → checkoutPage.fillPersonalInformationForm
              │     (spec asserts each URL with expect(browser).toHaveUrl, and each page title)
              │
              ├── Page Objects: overviewPage.expectItemOverviewNames                  ← the products carried through
              │     └── Browser Interaction: expectTextsFromElements                  ← retries up to 10 s
              │
              ├── Page Objects: overviewPage.clickOnFinishButton
              │
              └── Page Objects: completePage.expectCompletePurchaseText
                    └── Browser Interaction: expectText                             ← retrying, not a single read
  ├── afterTest: on failure, screenshot + page URL + console output → awaited Allure attachments
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
| `browser.*` outside its sanctioned places | Beyond Browser Interaction, Test Support and `Page.open()`: specs make 4 `expect(browser).toHaveUrl` calls, and `login.page.ts` reads `browser.options.baseUrl`. URL assertions need either an `elementExpectations` function or an explicit exception; that decision is still to be made. Don't add new ones in the meantime. |
| Read-once getters with no callers | Ten public methods are never called: `getLoginErrorMessage`, `getLoginLogoText`, `getItemCartNames`, `getItemCartPrices`, `getItemOverviewNames`, overview's `getTextFromPrices`, `getValuesFromPrices` and `getSubTotalValue`, `getCompletePurchaseText`, `Header.getPageTitleText`. Each has a retrying `expect…` sibling. Use the sibling; a getter feeding `expect(...)` reads once and races the page. |
| TypeScript 7 | Held on 6.0.x: every `typescript-eslint` release declares `typescript <6.1.0`. When one supports 7, check with `npm view typescript-eslint peerDependencies.typescript`, then `npm install -D typescript@^7 typescript-eslint@<that version>`, run `npm run typecheck` and `npm run lint`, and treat every new error as real (TS 7 is a rewrite). Check `eslint-plugin-wdio`'s peer range too, then run the suite and dispatch CI before a PR. |
| Node 26 | Not supported yet; use Node 24 (`.nvmrc`). On 26, `@puppeteer/browsers` extracts ChromeDriver's licence files but not the binary, and WDIO then refuses the half-filled cache folder, so every test fails at startup. WDIO before 9.32 also couldn't create sessions on 26. |
| Firefox | Configured and offered by `ci-on-demand.yml`, but no recorded CI run has used it. Treat it as unverified. |
| Environment-specific test data | Only `placeHolderData.json` exists, so per-environment values have nowhere to go. |
| Side-menu coverage | Logout and All Items are exercised. About, Reset App State and Dynamic Catalog have no tests. |
| Unit tests | None. The pure utilities and `getSelectorByValue`'s validation are covered only indirectly, by e2e runs. |
