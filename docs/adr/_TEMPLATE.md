---
record: "adr"
author: "agent"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
---

# ADR: [decision]

<!-- Follow docs/workflow/record-frontmatter.md; add task/spec_revision only when bound, and superseded_by only when superseded. Preserve ADR history. -->

<!-- Copy to docs/adr/[decision-slug].md when a decision becomes permanent. An authorized owner may record it when the decision is already accepted; preserve the actual decision owner and evidence. -->

- Date: [date]
- Status: accepted | superseded by [record]
- Related task/spec revision: [reference]

## Decision

[What was decided.]

## Reason and consequences

[Evidence, tradeoff, and what this commits the project to.]

## Enforcement

[Test, schema constraint, configuration, convention, or not applicable. A written decision does not establish that enforcement exists.]
