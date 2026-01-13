# Key Design Principles for Your Personal CRM

This is an excellent project that aligns beautifully with your focus on structured thinking, knowledge management, and meaningful relationships. Here are the critical design considerations:

## 1. **Future-Proof Data Portability**

- **Plain text forever**: Markdown + YAML ensures your relationship data outlives any tool
- **No vendor lock-in**: If Obsidian disappears tomorrow, your CRM remains fully accessible
- **Human-readable**: Anyone (including future you) can understand the structure without special tools
- **Version control ready**: Git-compatible for tracking relationship evolution over time

## 2. **YAML Frontmatter Schema Design**

Start minimal, expand intentionally:

```yaml
---
# Core Identity
name: "Full Name"
type: person  # person, organization, contact
status: active  # active, dormant, archived
created: 2025-01-12
updated: 2025-01-12

# Contact Information
email: []
phone: []
location: "City, State"

# Relationship Context
tags: []  # professional, personal, mentor, client, etc.
priority: medium  # high, medium, low
last_contact: 2025-01-10
next_followup: 2025-02-01

# Professional
organization: ""
title: ""
industry: []

# Personal
interests: []
values_alignment: []  # bitcoin, ancestral_wisdom, photography, etc.
---
```

## 3. **Linking Strategy (The Real Power)**

- **Bidirectional links**: `[[Project Name]]`, `[[Company]]`, `[[Event]]`
- **Context preservation**: Link people to projects, conversations, shared experiences
- **Tag hierarchies**: Use nested tags like `#professional/client/active` for flexible filtering
- **Daily notes integration**: Reference people in your daily journal entries and vice versa

## 4. **Automation-Friendly Architecture**

Design for Claude Code and scripts:

- **Consistent naming**: `firstname-lastname.md` or `YYYY-MM-DD-conversation.md`
- **Template-based creation**: Standard structure for quick person creation
- **Queryable metadata**: Use Dataview or custom scripts to surface insights
  - "Who haven't I contacted in 90 days?"
  - "Which clients share my Bitcoin interest?"
  - "Map my DC homeland security network"

## 5. **Capture Workflow Design**

Make adding information frictionless:

- **Quick capture templates** for meeting notes, conversations, insights
- **Append vs. replace logic**: New interactions add to history, don't overwrite
- **Date-stamped entries**: Use `## YYYY-MM-DD` headers within files for chronological narrative

## 6. **Privacy & Security Considerations**

- **Local-first**: Keep sensitive relationship data on your machine, not cloud-synced by default
- **Sensitive field handling**: Consider encryption for truly private notes
- **Separation of concerns**: Professional vs. personal directories if needed
- **Redaction readiness**: Easy to sanitize if sharing your system as a template

## 7. **Integration Points to Plan For**

- **Email import**: Parse emails to auto-populate contact interactions
- **Calendar sync**: Link meetings to people files
- **Social media**: Optional fields for LinkedIn, Twitter, etc.
- **Clay/other CRMs**: Export/import bridges if you use external tools
- **Photo integration**: Link to portrait photos (aligns with your photography passion)

## 8. **Relationship Intelligence Fields**

Go beyond basic CRM:

- **Communication preferences**: Preferred contact method, response patterns
- **Giving/receiving balance**: Track value exchange over time
- **Shared experiences**: Memorable moments, inside jokes, stories
- **Introduction potential**: Who could they connect with in your network?
- **Energy assessment**: Do interactions energize or drain you?

## 9. **Scalability Considerations**

- **File organization**: `/people/`, `/organizations/`, `/projects/`
- **Index files**: Create MOCs (Maps of Content) for network views
- **Performance**: Keep individual files focused; use links rather than massive single files
- **Search optimization**: Rich metadata enables powerful Obsidian search

## 10. **The "Why" Layer**

This is where your system becomes transformative:

- **Intention tracking**: Why is this relationship important?
- **Values alignment**: How do they connect to your vision (Bitcoin, government innovation, Seven Generations thinking)?
- **Gratitude journal**: What are you thankful for in this relationship?
- **Growth tracking**: How has this relationship evolved over time?

------

## Starter Implementation Approach with Claude Code

1. **Phase 1**: Define YAML schema and create 5 sample person files manually
2. **Phase 2**: Build template generator and bulk import from existing contacts
3. **Phase 3**: Add automation for updates (last contact, follow-up reminders)
4. **Phase 4**: Create dashboard queries (Dataview) for relationship insights
5. **Phase 5**: Integrate with your daily note workflow

------

## A Few Provocative Questions

- **How will you measure relationship health?** Beyond "last contact," what matters?
- **What's your archival strategy?** When does someone move from active to historical?
- **How does this connect to your photography?** Could portraits be part of each file?
- **What would Seven Generations thinking mean for your network?** Who are you introducing to whom for long-term impact?

This system should feel like a **living garden of relationships**, not a database. Let me know which aspects you'd like to dive deeper into, and I can help you architect the specifics with Claude Code.