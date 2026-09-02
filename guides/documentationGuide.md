# Architecture Documentation Guide

A deterministic process for documenting the architecture of a codebase. Follow the steps in order. Each step has a concrete deliverable — skip nothing, add nothing.

---

## Step 1 — Identify the Layers

Read the codebase top-down. Your goal is to find the distinct responsibilities that different parts of the code own.

**Do this:**
1. List every top-level directory and every file that is not a config or dependency
2. For each directory, write one sentence: "Code in here is responsible for ___"
3. Group directories that share the same responsibility into a single layer
4. Name each layer by its responsibility, not its folder name

**Deliverable:** A flat list of named layers (3–6 is normal; fewer means you missed something, more means you over-split)

**Signs you got it right:**
- Each layer has exactly one responsibility
- You can explain the boundary between any two adjacent layers in one sentence
- No file belongs to two layers

---

## Step 2 — Map the Dependencies

Find out which layers call which. Read import statements, not documentation.

**Do this:**
1. For each layer, list what it imports from other layers
2. Draw the dependency direction: A → B means A calls B
3. Check for cycles — if A → B → A, that is a design problem, not a documentation problem. Flag it.
4. Identify the entry point (the layer nothing else calls) and the foundation (the layer that calls nothing else)

**Deliverable:** A dependency diagram. Text is fine:

```
entry point  →  middle layers  →  foundation layer  →  external system
```

**Signs you got it right:**
- Dependencies flow in one direction (no cycles)
- The diagram matches what the import statements actually say, not what you expect

---

## Step 3 — Document Each Layer

For each layer identified in Step 1, write a section with four parts:

**Part A — Responsibility (1 sentence)**
What this layer owns. Not what it does — what it is *responsible for*.

**Part B — Rules (bullet list)**
The invariants that must hold. These are constraints that, if violated, break the system or the team's ability to maintain it. Each rule must be falsifiable — you must be able to point to code that violates it.

Examples of good rules:
- "No layer above this one calls WebdriverIO directly"
- "Every class in this layer exports a singleton instance"
- "All locator objects have both a `selector` and a `description` field"

Examples of bad rules (too vague to enforce):
- "Keep things clean"
- "Follow best practices"
- "Be consistent"

**Part C — Current inventory (table)**
Every file in the layer, one row per file, with a one-line description of what it does. This table goes stale — that is expected. Its value is in making gaps and duplicates visible.

**Part D — Tradeoffs (optional, only if non-obvious)**
If a design decision in this layer has a meaningful cost, document the cost. Example: "Singleton exports simplify imports but are incompatible with parallel test execution." Skip this if the design is straightforward.

---

## Step 4 — Document Cross-Cutting Concerns

Some things affect every layer. Document these separately rather than repeating them per layer.

**Common cross-cutting concerns:**
- Error handling strategy
- Logging / observability (how and where it happens)
- Configuration (how it flows from environment into code)
- Test data (where it lives, how it's loaded)
- Naming conventions
- Tagging or categorization schemes (e.g., test tags, suite names)

For each, write:
1. What the concern is
2. Where it is handled (single place or distributed)
3. The rule for new code to follow

---

## Step 5 — Document the Execution Flow

Pick the most complex end-to-end path through the system and trace it layer by layer. This makes the dependency diagram concrete.

**Do this:**
1. Choose one representative scenario (the "golden path" — the most complete flow, not the simplest)
2. Trace every function call from entry point to foundation
3. Show which layer handles each step
4. Note where cross-cutting concerns activate (e.g., where logging fires, where config is read)

**Format:** A nested list or code-block tree. Not prose.

```
entry point
  └── layer A: action X
        └── layer B: action Y     ← cross-cutting concern fires here
              └── layer C: action Z
```

**Signs you got it right:**
- Every layer from the dependency diagram appears at least once
- A new engineer could follow the trace without reading source code

---

## Step 6 — Document Known Gaps

An architecture document that only describes what works is incomplete. Gaps are load-bearing information — they prevent new engineers from building on top of broken foundations.

**What to include:**
- Incomplete implementations (files that exist but are not integrated)
- Known design limitations (e.g., "does not support parallel execution")
- Missing capabilities that are assumed to exist (e.g., "no retry logic")
- Technical debt with architectural impact (e.g., "all test data in a single file")

**Format:** A table.

| Area | Status |
|------|--------|
| [component or capability] | [what is missing or broken] |

**Rule:** Only include gaps that affect how new code should be written. Do not document cosmetic issues or style debt here.

---

## Step 7 — Write the Document Header

After completing Steps 1–6, write a short header for the document:

1. **Purpose statement (2 sentences):** What decisions this document is meant to support. Who the audience is.
2. **How to use it (3–4 bullets):** The specific questions a reader should be able to answer after reading this document.
3. **How to keep it current (1 rule):** The trigger for updating the document. Example: "Update this document when a new layer is added, a layer's responsibility changes, or a known gap is closed."

---

## Output Structure

The final document should follow this order:

```
1. Header (purpose, how to use, maintenance rule)
2. Layer overview (dependency diagram)
3. One section per layer (responsibility, rules, inventory, tradeoffs)
4. Cross-cutting concerns
5. Execution flow
6. Known gaps
```

Total length: long enough to answer the questions in the header, short enough to read in 15 minutes. If it takes longer than 15 minutes, you over-documented a layer — cut the tradeoffs section first, then trim the inventory descriptions.

---

## Quality Checklist

Before publishing, verify:

- [ ] Every rule in Part B is falsifiable — you can point to code that violates it
- [ ] The dependency diagram matches actual import statements
- [ ] Every file in the codebase appears in exactly one layer inventory
- [ ] The execution flow touches every layer in the dependency diagram
- [ ] Known gaps include only items that affect new development decisions
- [ ] The document can be read in under 15 minutes
- [ ] No rule says "be consistent" or "follow best practices" without specifying what that means in this codebase
