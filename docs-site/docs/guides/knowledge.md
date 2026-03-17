---
sidebar_position: 7
title: Knowledge Base
---

# Knowledge Base

The Knowledge Base helps Legible's AI learn your organization's SQL patterns and business rules. It consists of two components: **Question-SQL Pairs** and **Instructions**.

## Question-SQL Pairs

Question-SQL pairs teach the AI how your organization writes SQL for specific questions. When a user asks a similar question, the AI references these pairs to generate more accurate queries.

### Saving Question-SQL Pairs

After asking a question and getting a result:

1. Click the **Save to Knowledge** button on the answer
2. Review the question and SQL
3. Optionally edit the SQL to match your preferred style
4. Click **Save**

The pair is stored in the Knowledge section and immediately available to improve future queries.

### Managing Pairs

Navigate to **Knowledge → Question-SQL Pairs** to:

- View all saved pairs
- Edit existing pairs
- Delete pairs that are no longer relevant
- Add new pairs manually

### Best Practices

- Save pairs for frequently asked questions
- Include variations of common questions
- Review and update pairs when your data model changes
- Use clear, natural language for questions

## Instructions

Instructions are free-form text directives that guide the AI's SQL generation. They help the AI understand business rules, naming conventions, and domain-specific logic.

### Examples

- *"When calculating revenue, always exclude refunded orders"*
- *"The fiscal year starts in April"*
- *"Use 'active' status when filtering current employees"*
- *"Always join orders with customers through the customer_id field"*

### Managing Instructions

Navigate to **Knowledge → Instructions** to:

- Add new instructions
- Edit existing instructions
- Remove outdated instructions

:::tip
Start with a few high-impact instructions about your most important business rules, then add more as you identify patterns where the AI needs guidance.
:::
