# External Project Context

Record setup facts the repository alone cannot reveal: service accounts, environment variable names, webhook endpoints, dashboard locations, fixtures, and test resources.

Use one file per useful topic, such as environment, billing, email, or domains. Include where a fact was verified, when, and which environment it applies to. A prior note is a lead to recheck when live state matters.

Store names and setup instructions, never secret values, credentials, private tokens in URLs, or test-account passwords. Keep values in the project's approved secret store or service dashboard.

These records are durable project knowledge and should accompany the code in version control. Preserve historical decisions in docs/adr; keep current external setup facts here.
