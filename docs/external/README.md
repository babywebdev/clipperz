# External Project Context

Record setup facts the repository alone cannot reveal: service accounts, environment variable names, webhook endpoints, dashboard locations, fixtures, and test resources.

Use one file per useful topic, such as environment, billing, email, or domains. Include where a fact was verified, when, and which environment it applies to. A prior note is a lead to recheck when live state matters.

Store names and setup instructions, never secret values, credentials, private tokens in URLs, or test-account passwords. Keep values in the project's approved secret store or service dashboard.

These records are durable project knowledge; preserve the README's recorded storage and explicit-transfer policy. Preserve historical decisions in docs/adr; keep current external setup facts here.


## New topic record

Copy this block to each topic file, replacing quoted placeholders. Follow `docs/workflow/record-frontmatter.md`. Existing authorized owners keep facts, summary/date and applicable metadata current; historical unclassified records remain discoverable. Add task/cycle/spec_revision/snapshot only when actually bound. This README is a guide, not a shared task record.

```yaml
---
record: "external"
author: "[responsible role]"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
---
```

Then record the fact, source/date verified, environment, and limitations. No secrets.
