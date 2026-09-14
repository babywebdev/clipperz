---
record: "ledger"
author: "coordinating-lead"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
---

# Findings Ledger

<!-- Install at docs/project/_LEDGER-TEMPLATE.md; coordinating lead copies to docs/project/findings-ledger.md on first actionable defect, including a defect fixed during implementation. Follow docs/workflow/record-frontmatter.md; shared ledger omits task/cycle. Only the lead edits; Worker/reviewer propose entries. One line per row; narrative stays in linked records. Optional style suggestions are excluded. -->

## Open

| ID | First seen | Class | Location | Occurrences | Prevention destination | Explanatory record |
|---|---|---|---|---|---|---|
| [ID] | [date] | [searchable class] | [path/location] | [count and occurrence links] | [test/check/schema/convention or pending] | [finding/report path and section] |

## Closed

| ID | First seen | Class | Location | Occurrences | Prevention destination | Explanatory record |
|---|---|---|---|---|---|---|

Read Open and search Closed by class keyword for recurrence. Once Closed exceeds 60 rows, move older rows to docs/project/findings-ledger-archive.md, retaining these columns, IDs, links and applicable ledger frontmatter. Search matching classes in both Closed and that archive for every recurrence lookup; never place it under archive-dnr. Repeated defects remain actionable and also prompt proportionate prevention.
