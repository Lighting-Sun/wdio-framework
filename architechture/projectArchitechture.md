# wdio-framework Architecture

## Purpose

This document supports decisions about where new code belongs, how layers connect, and what constraints must be respected when extending the framework. The audience is any engineer adding tests, pages, components, or utilities to this project.

**After reading this document you should be able to answer:**
- Where does a new page class go, what must it extend, and how must it export?
- Where does a new reusable UI fragment go vs. a new page method?
- Why can't I call `$()` directly in a spec or page?
- What do I need to change if I add a new test environment?

**Maintenance rule:** Update this document when a new layer is added, a layer's responsibility changes, a new cross-cutting concern is introduced, or a known gap is closed.

---

## Layer Overview

Six layers. Dependencies flow in one direction — no cycles.

```
Infrastructure
  └── orchestrates ──► Test Specification  ──► Page Objects  ──► Browser Interaction ──► WebdriverIO (external)
                    │         │               └──► UI Components ──► Browser Interaction
                    │         └──► Test Support
                    └─────────────────────────► Page Objects ──► Test Support
```

**Entry point:** Test Specification (nothing in the project imports specs)  
**Foundation:** Browser Interaction and Test Support (call nothing else in the project)

---

## Layer 1 — Test Specification

**Responsibility:** Owns the test scenarios, assertions, and the ordered sequence of user actions that verify application behavior.

**Rules:**
- No raw WebdriverIO calls (`$()`, `$$()`, `browser.*`) in specs — all interactions go through page objects
- No hardcoded credentials, error messages, or user-facing strings — all loaded from `tests/data/*.json`
- Page objects are imported as singleton instances — never instantiated inside a spec
- Smoke tests must include `@smoke` in the `it()` title string — this is how the CI on-demand grep filter finds them
- Test data is loaded once at the `describe` block level via `JSON.parse(readFileSync(...))`, not inside `it` blocks

**Inventory:**

| File | What it tests |
|------|---------------|
| `tests/specs/login.spec.js` | Valid login, locked-out user error message, logout via side menu |
| `tests/specs/addProductsToCart.spec.js` | Adding multiple random items and a single specific item to the cart |
| `tests/specs/completePurchase.spec.js` | Full e2e flow: login → add items → cart → checkout form → order overview → confirmation |
| `tests/specs/filter.spec.js` | All four product sort options (A→Z, Z→A, price low→high, price high→low) |

---

## Layer 2 — Page Objects

**Responsibility:** Models each application page — owns its locators, encapsulates user-facing actions, and handles navigation to that page.

**Rules:**
- Every page class extends `Page` (`tests/pages/page.js`)
- Every page exports a singleton instance: `export default new XxxPage()`
- All locators are objects with exactly `{ selector, description }` — no bare strings
- All browser interactions go through `this.wdioFactory.*` — never `$()` or `browser.*` directly
- Pages that include the header UI declare `header = new Header()` as a class property
- Dynamic locators use `${value}` as a placeholder and are resolved via `this.wdioFactory.getSelectorByValue(locator, value)` before being passed to any other factory method

**Inventory:**

| File | What it owns |
|------|--------------|
| `tests/pages/page.js` | Base class: initializes `WdioFactoryUtils`, provides `open(path)` navigation |
| `tests/pages/login.
---

## Layer 3 — UI Components

**Responsibility:** Encapsulates reusable UI fragments that appear across multiple pages, exposing them as composable objects that pages own.

**Rules:**
- Every component class extends `BaseComponent` (`tests/components/base.component.js`)
- All browser interactions go through `this.wdioFactory.*` — never `$()` directly
- `Header` owns `SideMenu` as a class property: `sideMenu = new SideMenu()` — callers access it via `page.header.sideMenu`
- Components are never exported as singletons — they are instantiated inside page class bodies

**Inventory:**

| File | What it owns |
|------|--------------|page.js` | Username/password inputs, login button, error message locator; `login(user, pass)` action |
| `tests/pages/inventory.page.js` | Product grid, dynamic add-to-cart buttons, price extraction; owns `Header` instance |
| `tests/pages/cart.page.js` | Cart item list, item name retrieval; owns `Header` instance |
| `tests/pages/checkout.page.js` | First name, last name, postal code inputs, continue button; owns `Header` instance |
| `tests/pages/overview.page.js` | Item list, subtotal/tax/total price retrieval; owns `Header` instance |
| `tests/pages/complete.page.js` | Confirmation header text retrieval; owns `Header` instance |

**Tradeoff:** Singleton exports simplify imports — specs reference `loginPage` without instantiating it. The cost is incompatibility with parallel test execution: multiple workers share the same instance, so state set in one test can bleed into another. This is acceptable while tests run serially.

| `tests/components/base.component.js` | Base class: initializes `WdioFactoryUtils` instance |
| `tests/components/header.component.js` | Cart icon, burger menu button, sort dropdown; owns `SideMenu` instance |
| `tests/components/sidemenu.component.js` | Side menu links; `clickOnSideMenuOptionByValue(option)` action |

---

## Layer 4 — Browser Interaction

**Responsibility:** Provides the only sanctioned interface to the WebdriverIO API — wraps every DOM operation with wait logic and automatic Allure step logging.

**Rules:**
- No page or component calls `$()`, `$$()`, or `browser.*` directly — all DOM work goes through this layer
- Every public method logs an Allure attachment before executing — do not call Allure APIs from outside this layer
- Dynamic selector resolution (`getSelectorByValue`) must happen before passing a locator to any other method in this layer

**Inventory:**

| Method | What it does |
|--------|--------------|
| `click(objElement)` | Waits for element to be clickable, then clicks |
| `setValue(objElement, value)` | Waits for element to be enabled, clears it, types the value |
| `getText(objElement)` | Waits for element to be displayed, returns its text |
| `getElements(objElements)` | Returns all DOM elements matching the selector |
| `getTextFromElements(webElements)` | Maps `getText` across an array of already-resolved elements |
| `selectOptionFromSelect(objElement, attr, value)` | Selects a `<select>` option by attribute match |
| `clickAllIfExists(objElement)` | Repeatedly clicks an element until it is no longer clickable (batch removal) |
| `getSelectorByValue(objElement, value)` | Replaces `${value}` placeholder in selector and description strings |

File: `tests/utils/wdioFactory.utils.js`

---

## Layer 5 — Test Support

**Responsibility:** Provides non-browser computation helpers and static fixture data to specs and pages.

**Rules:**
- All test strings (credentials, error messages, checkout personal info) live in `tests/data/*.json` — never hardcoded
- Spec files load data via `JSON.parse(readFileSync('./tests/data/...'))` at the `describe` block level
- Utility functions must be pure — no browser calls, no side effects, no WebdriverIO imports

**Inventory:**

| File | What it provides |
|------|-----------------|
| `tests/utils/utilsMethods.utils.js` | `sortArrayAlphabetically()`, `getRandomNumber()`, `getPriceAsNumber()`, price sum helpers |
| `tests/data/placeHolderData.json` | Valid credentials, locked-out credentials, login error string, checkout personal info |

**Tradeoff:** A single data file covering all test data is simple but has no mechanism for environment-specific values. QA and Dev currently share the same credentials. As the suite grows or environments diverge, this file will need to be split into `placeHolderData.qa.json` / `placeHolderData.dev.json`.

---

## Layer 6 — Infrastructure

**Responsibility:** Configures the WebdriverIO runner and defines the CI/CD pipelines that execute the test suite.

**Rules:**
- Suite definitions (`regression`, `loginAndPurchase`) live in `wdio.conf.js` — CI commands reference suite names, never ad-hoc file globs
- The `onPrepare` hook cleans the Allure results directory before each run — never remove or skip it
- The `afterTest` hook captures a screenshot on failure — never remove it
- Environment selection (`--env qa` / `--env dev`) comes from CI inputs or CLI flags, never hardcoded in workflow files
- New environments require: a new entry in the `wdio.conf.js` baseUrl map and a new option in the `ci-on-demand.yml` environment input

**Inventory:**

| File | What it configures |
|------|--------------------|
| `wdio.conf.js` | Runner, suites, browsers (Chrome/Firefox headless), timeouts, Allure + Spec reporters, `@wdio/visual-service`, lifecycle hooks |
| `.github/workflows/ci.yml` | Auto-trigger on push/PR to main; runs full regression on QA; uploads Allure artifact |
| `.github/workflows/ci-on-demand.yml` | Manual dispatch; configurable env, browser, suite (regression / loginAndPurchase / smoke), optional artifact upload |

---

## Cross-Cutting Concerns

### Allure Logging
- **Where:** Centralized in `wdioFactory.utils.js` — every method auto-attaches a step before execution
- **Rule:** Do not add `addStep` or `addAttachment` calls in pages, components, or specs. If richer context is needed for a specific operation, extend `WdioFactoryUtils` with a new method.

### Test Data
- **Where:** `tests/data/placeHolderData.json` — loaded at describe-block level in every spec
- **Rule:** No hardcoded user-facing strings in spec `it()` bodies. All test strings come from the JSON file.

### Naming Conventions
- **Where:** Enforced by team convention, not tooling
- **Rule:** `[name].page.js` · `[name].component.js` · `[name].spec.js` · `[name].utils.js` · `[name].json` — deviating from this makes the file invisible to anyone scanning for its type

### Test Tagging
- **Where:** Embedded in `it()` title strings (`@smoke`)
- **Rule:** Tag a test `@smoke` only if it covers a critical happy path that must pass before any deployment. The CI on-demand workflow runs smoke tests via `--mochaOpts.grep smoke`.

### Environment Configuration
- **Where:** `wdio.conf.js` reads the `--env` CLI flag to select the base URL
- **Rule:** Environment is always injected at the runner level — pages and specs never read `process.env` directly or hardcode URLs

---

## Execution Flow — Golden Path: Complete Purchase

The most complete flow across all layers.

```
Infrastructure (wdio.conf.js)
  └── Mocha runner loads completePurchase.spec.js
        └── Test Specification
              ├── Test Support: placeHolderData.json loaded via readFileSync  ← data loaded once at describe level
              │
              ├── Page Objects (loginPage.open('/'))
              │     └── Browser Interaction: wdioFactory.click, setValue       ← Allure step logged per call
              │           └── WebdriverIO: browser.$(...).click / .setValue
              │
              ├── Page Objects (inventoryPage.addItemToCartByName(item))
              │     ├── Browser Interaction: getSelectorByValue(locator, item) ← dynamic selector resolved
              │     └── Browser Interaction: wdioFactory.click
              │           └── WebdriverIO
              │
              ├── Page Objects (inventoryPage.header.clickOnCart())
              │     └── UI Components (header.component)
              │           └── Browser Interaction: wdioFactory.click           ← Allure step logged
              │                 └── WebdriverIO
              │
              ├── Page Objects (cartPage → checkoutPage → overviewPage)
              │     └── Browser Interaction at each step                        ← Allure steps throughout
              │           └── WebdriverIO
              │
              ├── Test Support (utilsMethods.getPriceAsNumber, sum)             ← pure computation, no browser
              │
              └── Test Specification: assert completePage header === expected
                    └── Page Objects (completePage.getHeader())
                          └── Browser Interaction: wdioFactory.getText
                                └── WebdriverIO
```

---

## Known Gaps

| Area | Status |
|------|--------|
| Parallel execution | Singleton page object exports are incompatible with multiple WDIO workers — shared instance state bleeds across tests. `maxInstances: 10` is configured but safe only when each spec runs in isolation without shared mutable state. |
| Visual testing | `@wdio/visual-service` is installed and configured with a baseline path (`tests/visual-testing/baseline`) but the directory does not exist and no visual assertions are written in any spec. |
| Environment-specific test data | Single `placeHolderData.json` — no mechanism for QA vs Dev credentials or environment-specific strings. New environments must reuse or manually override the same values. |
| Retry / resilience | No WDIO `bail` or per-test `retry` configured. A single flaky selector failure fails the entire spec file immediately. |
| Side menu coverage | `SideMenu.clickOnSideMenuOptionByValue()` is only exercised for logout. The About and Reset App State options have no test coverage, so regressions there would go undetected. |
