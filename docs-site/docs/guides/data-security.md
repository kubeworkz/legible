---
sidebar_position: 9
title: Data Security
---

# Data Security

Legible supports **Row-Level Security (RLS)** to control which rows users can access in your data models. This is managed through policies and session properties.

## Row-Level Security Policies

RLS policies filter query results based on the current user's attributes. Each policy defines a condition that is automatically applied to queries.

### Creating a Policy

1. Go to **Data Security → Policies**
2. Click **Add Policy**
3. Select the model to apply the policy to
4. Define the filter condition using session properties
5. Save the policy

### Example

A policy like `region = {{session.user_region}}` ensures that users only see data for their assigned region.

## Session Properties

Session properties are dynamic variables used in RLS policies. They represent attributes of the current user or request context.

### Defining Properties

1. Go to **Data Security → Session Properties**
2. Click **Add a Property**
3. Define the property name and type
4. Assign values to users or groups

### Using in API Requests

When making API calls, include session properties in the request headers or body to apply the correct RLS filters:

```json
{
  "question": "Show me all orders",
  "sessionProperties": {
    "user_region": "US-West",
    "user_role": "analyst"
  }
}
```

## Best Practices

- Start with broad policies and refine as needed
- Test policies with different session property values
- Document which properties are required for each policy
- Use descriptive property names that reflect their business meaning
