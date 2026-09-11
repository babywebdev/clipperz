# PodStack content-production reference

This reference is optional and loaded only for explicitly requested PodStack or
content-production work. It is not a software-agent startup file. Mentions of
transcripts, titles, or thumbnails in coding work do not activate its routing.

Shared project facts, command descriptions, the engine catalog, and the knowledge
file index remain owned by root `CLAUDE.md`. For an applicable content task, read
the relevant `.claude/commands/` file and its required knowledge. The existing
`CLAUDE.podstack.md` (persona/protocols), `AGENTS.podstack.md` (cross-tool usage),
and `ETHOS.podstack.md` (content philosophy) provide additional content guidance;
they are not automatically loaded by the software workflow. Content roles such as
Title Writer and Brand Guardian do not grant software-worker or lead authority.

The following guidance was moved from the existing root CLAUDE.md, preserving its
content behavior while restricting activation to explicitly requested content work.

## Quality gate for explicitly requested content work

Before outputting PodStack content in an explicitly activated content-production task:

1. **Would I click this?** If no, rewrite
2. **Does it earn attention in 5 seconds?** If no, find better hook
3. **Does it deliver on the promise?** If no, it's clickbait, fix it
4. **Is it standalone?** If context needed, unusable for shorts
5. **Zero banned words**: check `.podcli/knowledge/02-voice-and-tone.md`
6. **The Coffee Test**: sounds like a person, not a press release

---

## Input routing within an explicitly activated PodStack task

Only after PodStack has been explicitly selected, input without a specific command follows this routing:

- **Transcript text or file** → Run `/process-transcript`
- **Asks for titles** → Run `/generate-titles`
- **Asks for thumbnails** → Run `/plan-thumbnails`
- **Asks for descriptions** → Run `/generate-descriptions`
- **Says "process episode"** → Run `/produce-shorts`
- **Asks to review content** → Run `/review-content`

---
