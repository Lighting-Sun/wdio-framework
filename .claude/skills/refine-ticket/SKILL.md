---
name: refine-ticket
description: Refine a Jira ticket into test cases this framework can automate, plus open questions, and post them as a ticket comment after approval.
argument-hint: <JIRA-KEY or ticket URL>
disable-model-invocation: true
---

# Refine a Jira ticket

Turn one Jira Cloud ticket into a **refinement**: the UI test cases this framework can automate, the flows they need, the open questions the ticket leaves unanswered, and a count of what falls outside the framework. The owner reviews the draft in this session; it reaches Jira only on their explicit approval.

This is phase 1: cases only. Generating specs or page objects, and exploring the live app, are out of scope here. A refinement may *propose* changes to existing tests (merges, replacements, renames); whoever implements the ticket makes them.

Jira access is the Atlassian MCP server in `.mcp.json` (tool names below are from Atlassian's docs; if one differs, use the equivalent the server lists).

## Steps

### 1. Load the ticket

1. Take the key from the argument (`PROJ-123`, or parse it from a ticket URL). With no argument, ask for one.
2. Get the `cloudId` with `getAccessibleAtlassianResources`, then the ticket with `getJiraIssue`. If the Atlassian tools are missing or unauthenticated, stop and tell the owner to run `/mcp` and authenticate `atlassian`.
3. Collect the summary, description, any acceptance-criteria field, and all comments. Attachments and linked designs are out of scope for v1; note in open questions if the ticket leans on them.
4. Find any earlier refinement: a comment whose first line starts with `Test refinement (refine-ticket)`. The highest `vN` in those comments is the previous version.

**Done when:** you hold the ticket text, its comments, and the previous refinement (or know there is none).

### 2. Load the framework's reach

Run `bash .claude/skills/refine-ticket/load-context.sh` and read its whole output. It prints `consulting/.claude.md`, `architecture/projectArchitecture.md`, `tests/support/flows.support.ts`, every page object under `tests/pages/` and every spec under `tests/specs/`, after a `SOURCES` manifest. Don't build your own file list or read a subset: the script's list is the list. If the script exits non-zero, stop and show the owner its error; never draft without a file it names.

The repo is the only coverage index: don't search other Jira tickets for overlapping cases. Once a ticket's cases are automated, the next refinement sees them here.

**Done when:** you can list every existing `it` title with its spec file and what it asserts, every flow, and every page with its public actions. The coverage check in step 5 is only as good as this list.

### 3. Number the acceptance criteria

Label each acceptance criterion `AC-1`, `AC-2`, … in ticket order. When the ticket has no explicit criteria, derive them from the description and add an open question asking the product owner to confirm them.

Mark an AC that is only a step on the way to the ticket's outcome (adding to the cart in a purchase story) as a **precondition AC**. It becomes a precondition of the outcome's cases, not a case of its own. If it seems to need its own testing, raise an open question.

### 4. Choose the layers

Every ticket gets **focused** cases. It also gets a **journey** only when it describes a user goal that spans screens (see **Layers**):

- The description or ACs say *end-to-end*, *e2e*, *journey* or *flow*: journey + focused.
- The ACs cover one screen: focused only.
- The ACs cover several screens without those words: ask the owner, with a recommendation, before deriving cases. Never infer a journey from phrasing alone.

On a re-run, keep the previous version's `Test style` unless the owner changes it.

**Done when:** you know the `Test style` line and where it came from (the ticket's words, or the owner's answer).

### 5. Derive the cases

For each AC that isn't a precondition AC, write the cases needed to cover it: the happy path, then the negative and boundary cases **the AC itself implies**. A boundary needs a limit the ticket states; running out of catalogue items is not a boundary. A case the ACs don't ask for (a validation rule, an empty state) is never added to the list: raise it as an open question instead.

Then shape the list:

1. Apply the **automatable rule** to each case; a case that fails it goes into the not-covered count, never into the list.
2. Apply the **layer split** and the **merge rule** (below), so each assertion has exactly one home.
3. Check each case against the existing tests and give it a status (see **Case shape**). A test only covers a behaviour if it would **fail when that behaviour breaks**. Selecting the sort order the page already shows proves nothing, for example. When an existing test only looks like it covers the case, propose the fix with `[merge into …]` and say what's missing.
4. **A test must not be able to pass without exercising its behaviour.** When the setup or the data could make it pass vacuously (a sort order already showing, no tied prices, an empty list), add a guard check that fails first and says why, and write it into the case's steps.
5. **Expected results of a calculation (tax, totals, discounts) are literal values from fixture data**, worked out once from the ACs and reviewed in the data file. Never recompute the app's formula in the test: a copied formula can share the app's bug. A relationship is different: an order (each item ≤ the next), a sum or a range may be derived from the page's own data, as the sort tests do. An assertion on exact text already checks its format, so don't add a separate format check for it. When a ticket's rules combine across screens, propose a decision table: one row per rule or branch plus its boundaries (pairwise when options interact), not every permutation, and flag rows that belong at API or unit level. When values can't be fixed in advance, check relationships between them (sums, ranges, allowed values) instead.
6. For every precondition that no existing flow reaches, add a line to **Flows needed**.

Collect **open questions** as you go: an AC that can be read two ways, an expected result the ticket never states (exact message text, sort order, a limit), an edge case nobody decided, a case beyond the ACs. Each question names the AC it came from, and is one the product owner can answer or act on. A known limit nobody can change (the app's data can't exercise a rule) goes in `Not covered here` with its reason, not in the questions.

**Done when:** every AC has at least one case, a precondition role, or an open question explaining why it has none, and no two cases assert the same thing.

### 6. Show the draft and wait

Present the full comment exactly as it will be posted (format below). Below it, outside the comment, show a `Sources read` line copied from the script's `SOURCES` manifest (each path with its line count), so the owner can spot a missing source before approving. On a re-run, also show what changed since the previous version: cases added, removed, merged, or reworded; questions answered or new.

Then stop and ask the owner to approve, edit, or cancel. Apply edits and show the draft again. **Post only on an explicit approval in this session.**

### 7. Post

Post with `addOrEditJiraIssueComment` as a **new** comment; earlier refinement comments stay untouched as history. If the body format is unclear, call `getContentFormatGuide` first. Report the ticket URL back to the owner. Take any counts in that report (cases per status, open questions) from the posted body, by counting its status tags and `Q` lines, never from memory of an earlier draft.

## Layers

Both layers are built from the same flows (`tests/support/flows.support.ts`) and page-object actions. **A test never depends on another test**: no ordering and no shared state between `it`s. What separates the layers is where the assertions are, not how long the route is.

- **Focused**: one action under test, or one variation of it. Assert its outcome wherever that outcome shows: the element acted on, the header badge, the page the outcome lands on. The steps that set the action up assert nothing (the flows already confirm they arrived), except a guard check against a vacuous pass (step 5).
- **Journey**: one user goal from start to finish, one `it`. It asserts only what no focused test does: each screen transition (URL and title), that the chosen items carry across screens, and the final screen. It never re-checks a screen's details (calculations, formats, messages). A negative path ends somewhere else, so it is a separate journey or a focused case, never part of the happy one.

**Merge rule (focused):** cases with the same setup that assert on the same screen become one test. Keep them separate only when their setup differs, or when one failure would hide a result the reader needs separately.

**Assertions are hard in both layers**, through page methods like the rest of the framework. A journey's checks are transitions, so a failed one makes the rest meaningless anyway. Soft assertions (`expect.soft`) would need factory support and `SoftAssertionService` in `wdio.conf.ts`; propose them only if a journey ever has several independent checks on one screen.

**Flows** end with a hard check that they arrived (the target page's title), so a setup failure reads as a setup failure.

**Homes:** a focused case goes in a spec named after its screen (`cart.spec.ts`, `overview.spec.ts`); a journey goes in a spec named after its goal (`completePurchase.spec.ts`) and is tagged `@journey`. When an existing spec breaks this convention, propose the rename in `Suggested home`.

## Automatable rule

A case belongs in the list only when all four hold:

- **UI-observable**: the action and the outcome are visible in the browser UI of the target app.
- **Deterministic**: it runs with fixed data from `tests/data/` or `credentials.support.ts`; the framework uses no randomized inputs.
- **Functional**: it asserts behaviour and content. Visual checks (layout, pixels, styling) are out of scope for this framework.
- **UI-reachable setup**: every precondition can be reached through the app's own UI. No seeding storage or navigating around it.

Everything else is counted by kind in the `Not covered here` line (API-level, visual, manual, needs backend setup, …).

## Case shape

Focused case:

```
TC-3  Locked-out user sees error on login           [already covered by login.spec.ts: "Should show an error when logging in with a locked out user"]
  Covers: AC-2
  Precondition: none (drives login page directly)
  Steps: enter locked_out_user creds → submit
  Expected: error banner "Epic sadface: Sorry, this user has been locked out."
  Suggested home: login.spec.ts   @smoke: no
```

Journey case:

```
TC-1  Purchase journey                              [replaces completePurchase.spec.ts: "Should do a successful purchase"]
  Precondition: loginAsStandardUser
  Checkpoints:
    1. add data.cartProducts → openCart   → (openCart confirms "Your Cart")            (AC-1, AC-2)
    2. Checkout                           → "Checkout: Your Information"               (AC-3)
    3. fill data.personalInfo → Continue  → "Checkout: Overview"; the added names      (AC-4)
    4. Finish                             → "Thank you for your order!"                (AC-6)
  Suggested home: completePurchase.spec.ts   @journey   @smoke: yes
```

- **Status**, one of:
  - `[new]`
  - `[already covered by <spec>: "<it title>"]`: the existing test fails when this behaviour breaks.
  - `[merge into <spec>: "<it title>"]`: extend that test with this case's assertions, or fix it so it really covers them.
  - `[replaces <spec>: "<it title>", …]`: this case absorbs those tests, which are deleted when it is implemented.
- **Covers**: one or more AC labels (focused). A journey names the AC on each checkpoint instead. This is what lets a reviewer spot an AC with no case.
- **Precondition**: name an existing flow (`loginAsStandardUser`, `openCart`) or one from **Flows needed**. When the case's subject *is* the precondition (logging in), it drives the page directly, as the framework's fixture rule requires.
- **Expected** / checkpoint result: a concrete, assertable outcome. When the ticket doesn't state it, write the best reading and raise an open question.
- **Suggested home**: see **Homes** above.
- **@smoke**: `yes` only for a case that guards a core path (login, add to cart, checkout). A journey or a focused case can carry it.

## Comment format

```
Test refinement (refine-ticket) v1
Drafted with Claude from this ticket and the wdio-framework repo; reviewed before posting.
Test style: focused only (owner's choice)

Acceptance criteria as read
AC-1 … (precondition)
AC-2 …

Test cases (automatable UI)
<cases, in the case shape>

Flows needed
reachOverview(products): login → add products → openCart → Checkout → fill personal info → Continue; used by TC-2

Open questions
Q1 (AC-2) …

Not covered here: 2 API-level, 1 visual.
```

`Test style` reads `focused only` or `journey + focused`, followed by where it came from: `(from description: "<quoted words>")`, `(the ACs cover one screen: <screen>)` or `(owner's choice)`.

A re-run posts `v2`, `v3`, … and adds a `Changes since vN` section after the header. Every section stays in every comment; an empty one reads `none` (`Flows needed: none`, `Open questions: none`), so a reader can tell "nothing found" from "not checked".
