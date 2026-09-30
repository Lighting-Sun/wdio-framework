---
name: automate-ticket
description: Implement the latest refine-ticket refinement of a Jira ticket as tests, open the PR, and move the ticket through the automation columns.
argument-hint: <JIRA-KEY or ticket URL>
disable-model-invocation: true
---

# Automate a refined Jira ticket

Turn the latest **refinement** on a Jira Cloud ticket (the `Test refinement (refine-ticket) vN` comment) into specs, page methods, flows and fixture data. Verify them, open a PR, and move the ticket through its **lifecycle**: Ready For Automation → In Automation → Automation Review.

This runs **unattended**. The refinement is the spec: implement what it says, and record anything you had to decide in the PR description. Stop only at the outcomes named below. Every run ends in exactly one **outcome**, reported to the owner and on the ticket:

| Outcome | PR | Ticket ends in |
|---|---|---|
| **finished**: every TC implemented, verified, CI green | ready for review | Automation Review |
| **blocked**: a TC still fails after 3 fix attempts, or CI is red | draft | In Automation |
| **not needed**: every TC is `[already covered by …]` | none | Automation Review |
| **refused**: a gate in step 1 failed | none | unchanged, no comment |

Tools: Jira through the Atlassian MCP server, the live app through the Playwright MCP server (both in `.mcp.json`), GitHub through `gh`. Operations named below that are not primary tools run through `executeRead` (discover them if the name differs).

## Steps

### 1. Gates

Check each gate in order. The first one that fails is a **refused** outcome: tell the owner which gate failed and what to do, and touch nothing.

1. **Tools:** `gh auth status` succeeds; the Atlassian and Playwright MCP tools are listed. Otherwise tell the owner to `brew install gh && gh auth login`, or to run `/mcp` and authenticate `atlassian`.
2. **Ticket:** take the key from the argument (`KAN-6`, or parse it from the URL). Get the `cloudId` with `getAccessibleAtlassianResources`, the ticket with `getJiraIssue`, and every comment with `listJiraIssueComments`.
3. **Refinement:** the comments whose first line starts with `Test refinement (refine-ticket) v`. The **refinement** is the one with the highest `vN`. None means the ticket isn't refined: tell the owner to run `/refine-ticket <KEY>`.
4. **Freshness:** read `listJiraIssueChangelogs`. If the summary, description or an acceptance-criteria field changed after the refinement comment was created, the refinement is stale: tell the owner to re-run `/refine-ticket`.
5. **Status:** one of
   - **Ready For Automation**: a fresh start.
   - **In Automation** with a `test/<KEY>-*` branch, local or on `origin`: a **resume**. Check it out, and skip whatever that branch and its PR (`gh pr view`) already finished.
   - anything else: refused, naming the current status.
6. **Clean tree:** `git status` is clean; a fresh start also needs `main` checked out and `git pull --ff-only` done.

**Done when:** every gate passed, and you hold the refinement text and its `vN`.

### 2. Start

If every TC in the refinement is `[already covered by …]`, go to **Not needed** below.

Otherwise, on a fresh start:

1. Create `test/<KEY>-<slug>` from `main`, the slug being the ticket summary in 2–5 kebab-case words.
2. Post the **started** comment (see **Jira comments**).
3. Move the ticket to In Automation (see **Moving the ticket**).

**Done when:** you are on the ticket branch and the ticket shows In Automation.

### 3. Load the framework

Run `bash .claude/skills/refine-ticket/load-context.sh` and read its whole output. It's the same list the refinement was derived from, so the rules its cases assume are the rules you implement under. Also read `architecture/.claude.md`, `tests/support/credentials.support.ts`, `tests/data/placeHolderData.json`, and the Browser Interaction modules `tests/utils/elementActions.utils.ts`, `tests/utils/elementExpectations.utils.ts` and `tests/utils/locator.utils.ts` for the functions you'll call.

**Done when:** you can name, for every TC, the files it will touch.

### 4. Implement

Work TC by TC in the refinement's order, following its **status tag**:

- `[new]`: write the `it` in the case's **Suggested home**. Create the spec if the file doesn't exist.
- `[merge into <spec>: "<title>"]`: extend or fix that test so it asserts what the case says.
- `[replaces <spec>: "<title>", …]`: write the new test, then delete the ones it names.
- `[already covered by …]`: nothing to write. It still goes in the PR's TC map.

Build every entry in the refinement's **Flows needed** in `tests/support/flows.support.ts`, each ending on a hard check that it arrived, like the existing flows.

Everything you write stays inside the rules in the files step 3 loaded. The ones a new test most often touches:

- **Locators:** before adding or changing one, snapshot the live DOM with Playwright MCP (log in with the users from `credentials.support.ts`). Rank candidates `data-test` → `id` → a stable attribute (`name`, `aria-*`) → structural CSS → XPath; visible text never. Each locator is `{ selector, description }`, with the description written for someone reading a red build.
- **Placement:** a page action goes on its page object, a fragment shared by pages on a component, a starting state in a flow. The spec holds only steps and page `expect…` calls.
- **Assertions:** retrying `expect…` page methods backed by `elementExpectations.utils.ts`. When the page has no such method, add one. Every check is hard: the framework has no soft assertions. A check marked `[soft]` comes from an older refinement; implement it as a hard assertion and list it in the PR description.
- **Data:** the case's expected literals (totals, messages) go in `tests/data/placeHolderData.json` and are imported typed. Credentials come from `credentials.support.ts`.
- **Titles and tags:** `Should …`, like the existing specs; `@smoke` or `@journey` in the title when the case says so. A journey is one `it` whose checkpoints are the case's.
- **Guards:** write each guard check the case's steps name, so the test can't pass vacuously.

When the refinement lists an **open question** against a TC's AC, implement the case's written Expected (the refinement's best reading), and carry the question into the PR description.

**Done when:** every TC has its code, or its `already covered` line, and `git diff` touches nothing the refinement didn't ask for (apart from the doc updates in step 6).

### 5. Verify

1. `npm run typecheck` and `npm run lint` are clean. Fix whatever they report.
2. `npm test` passes in Chrome. Read the `Spec Files:` line: exit code 0 alone doesn't prove the suite ran.
3. **Break each test.** For every new or changed `it`, swap the one expected value it asserts (the literal, or the fixture value) for a wrong one. Run that spec with `npm test -- --spec <file>` and confirm it goes red **on that assertion**; a timeout or a locator error doesn't count. Then revert and confirm the spec is green again. Keep each failure line for the commit message.

When a test fails, you get **3 fix attempts** on the test code: locator, wait, page method, flow. The case's Expected is fixed. When the app's real behaviour contradicts it, that's a suspected **app bug**, not a test bug. Stop fixing and carry the failure to the **blocked** outcome. The same holds for an existing test that a `merge into` or `replaces` change broke.

**Done when:** typecheck, lint and the full suite are green, and every new or changed `it` has a recorded red run. Or: a failure has used its 3 attempts and you know which TC and which assertion it is.

### 6. Update the docs

The next `/refine-ticket` run judges coverage from these files, so they change with the code:

- `architecture/projectArchitecture.md`: the inventories that list pages, flows, page methods or specs you added or removed.
- The spec and test counts in `.claude.md` and `consulting/.claude.md` ("4 spec files, 11 tests"). Count from `tests/specs/` after your change.

Leave every "last verified against" stamp alone: that stamp records a human check.

**Done when:** a search for each name you added or removed finds it in every inventory it belongs in, and nowhere it no longer exists.

### 7. Ship

1. Make one commit: `test(<KEY>): automate refinement vN`. The body gives the why (the ticket and what the TCs cover), the red-run line from step 5 for each TC, and the full-suite result.
2. `git push -u origin <branch>`.
3. `gh pr create --base main`, adding `--draft` on a blocked outcome. Title as the commit. The body holds:
   - the ticket link and refinement `vN`;
   - a **TC map**, one line per TC: `TC-n → <spec>: "<it title>"` (or `already covered by …`, or `deleted: …` for a `replaces`);
   - open questions implemented on the refinement's best reading;
   - on blocked: the failing TC, its assertion and the actual value;
   - what was left untouched: known gaps and drift noticed nearby that you didn't fix;
   - the attribution line.

**Done when:** the PR URL exists and its diff is the one you verified.

### 8. Finish

Wait on CI with `gh pr checks <number> --watch`.

- **Green, and nothing blocked:** post the **finished** comment, then move the ticket to Automation Review.
- **Red CI, or a blocked TC from step 5:** mark the PR draft if it isn't one (`gh pr ready <number> --undo`), post the **blocked** comment, and leave the ticket In Automation.

Report the outcome, the PR URL and the ticket URL to the owner.

**Done when:** the ticket status matches the outcome table and its newest comment is this run's.

### Not needed

When every TC is `[already covered by …]`: no branch, no PR. Post the **not needed** comment and move the ticket to Automation Review, where a person confirms the coverage claim.

## Moving the ticket

Get the issue's transitions with `listJiraIssueTransitions`. Pick the one whose **target status** is the one you want (a transition's name can differ from its target), and apply it with `transitionJiraIssue`. When no transition leads there, post nothing more, and report the available ones to the owner.

## Jira comments

Take every timestamp from `date +"%Y-%m-%dT%H:%M:%S%z"` at the moment you post. The first line names the skill, so the next run can find these comments.

```
Automation started (automate-ticket)
<timestamp> · refinement vN · branch test/KAN-6-purchase-products
```

```
Automation finished (automate-ticket)
<timestamp> · PR <url> · CI green
TC-1 → completePurchase.spec.ts: "Should …"
TC-2 → already covered by cart.spec.ts: "Should …"
```

```
Automation blocked (automate-ticket)
<timestamp> · draft PR <url>
TC-3: expected "<Expected>", the app shows "<actual>". Possible app bug; the test keeps the refinement's Expected.
```

```
Automation not needed (automate-ticket)
<timestamp> · refinement vN: every TC is already covered
TC-1 → login.spec.ts: "Should …"
```
