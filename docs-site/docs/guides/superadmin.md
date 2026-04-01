---
sidebar_position: 11
title: Superadmin Dashboard
---

# Superadmin Dashboard

The Superadmin Dashboard provides platform-wide visibility and control for system administrators. Superadmins can manage organizations, monitor revenue, review security posture, and audit all platform activity from a single interface.

## Enabling Superadmin Access

### First Superadmin (Bootstrap)

The first superadmin must be created by directly updating the database. Run this command against your deployment:

```bash
# Docker Compose deployment
docker exec -it wrenai-legible-ui-1 sh -c \
  "sqlite3 /app/data/db.sqlite3 \"UPDATE user SET is_superadmin = 1 WHERE email = 'admin@yourcompany.com';\""
```

For PostgreSQL deployments (when `PG_URL` is configured):

```sql
UPDATE "user" SET is_superadmin = true WHERE email = 'admin@yourcompany.com';
```

### Granting Additional Superadmins

Once you have a superadmin, you can grant the role to other users through:

1. **Dashboard UI** — Navigate to **Admin Dashboard → Users**, find the user, and click **Grant Superadmin**
2. **GraphQL API** — Use the `adminSetSuperadmin` mutation:

```bash
curl -s https://your-instance.com/api/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -d '{"query":"mutation { adminSetSuperadmin(userId: 2) }"}'
```

### Revoking Superadmin Access

Superadmin access can be revoked from the Users page or via the `adminRevokeSuperadmin` mutation. A superadmin cannot revoke their own access — another superadmin must do it.

## Accessing the Dashboard

Once your account has superadmin access:

1. Go to **Settings** (gear icon in the sidebar)
2. At the bottom of the settings menu, you'll see a **Superadmin** section with a crown icon
3. Click **Admin Dashboard** to enter the superadmin area

The dashboard has six sections accessible from the sidebar:

| Section | Description |
|---------|-------------|
| **Overview** | Platform-wide stats, subscription breakdown, organization table |
| **Organizations** | Search, sort, and filter all organizations; drill into org details |
| **Revenue** | MRR, ARR, ARPU, churn rate, per-organization revenue breakdown |
| **Users** | All platform users with grant/revoke superadmin controls |
| **Security** | Threat indicators, OIDC/SSO status, session counts |
| **Audit Log** | Cross-organization audit trail with filters |

## Overview

The overview page shows high-level platform metrics:

- **Total Users** — All registered accounts
- **Active Users** — Users with `is_active = true`
- **Organizations** — Total org count
- **Paid Plans** — Count of non-free subscriptions

Below the stats, a **Subscriptions by Plan** breakdown shows how many organizations are on each plan (free, pro, enterprise), and a clickable organization table lets you quickly navigate to any org's detail page.

## Organizations

### Organization List

The organizations page provides a searchable, sortable, and filterable list of all organizations on the platform. You can:

- **Search** by organization name
- **Sort** by name, member count, or creation date
- **Filter** by plan type (free, pro, enterprise)

Click any row to view the organization's detail page.

### Organization Detail

The detail view for each organization shows:

- Organization name, slug, and metadata
- Current plan and subscription status
- Member count and project count
- **Members table** — All members with their roles (Owner, Admin, Member, Viewer), email addresses, and join dates

## Revenue

The revenue page computes financial metrics from subscription data:

| Metric | Description |
|--------|-------------|
| **MRR** | Monthly Recurring Revenue — sum of active paid subscription prices |
| **ARR** | Annual Recurring Revenue — MRR × 12 |
| **ARPU** | Average Revenue Per User — MRR ÷ paid org count |
| **Churn Rate** | Percentage of subscriptions canceled in the last 30 days |

### Plan Pricing

Revenue calculations use the following plan prices:

| Plan | Monthly Price |
|------|--------------|
| Free | $0 |
| Pro | $49 |
| Enterprise | $199 |

### Revenue by Plan

A breakdown card for each plan shows the org count and MRR contribution.

### Organization Revenue Table

A detailed table of every organization's subscription, showing plan, status, MRR contribution, billing period end date, and cancellation date if applicable. Click any row to navigate to that organization's detail page.

## Users

The users page lists all platform users with:

- Email, display name, active status
- Email verification status
- Last login date
- Organization memberships and roles
- **Superadmin badge** for users with superadmin access

### Managing Superadmins

- Click **Grant Superadmin** to elevate a user (requires confirmation)
- Click **Revoke Superadmin** to remove the role (requires confirmation)
- You cannot revoke your own superadmin access

All grant/revoke actions are recorded in the audit log.

## Security

The security overview provides a real-time view of platform security:

### Threat Indicators (24h)

- **Failed Logins** — Password authentication failures (color-coded: green = 0, yellow = 1–10, red = 10+)
- **Failed OIDC Logins** — SSO authentication failures
- **Total Events** — All audit events in the last 24 hours
- **Superadmin Actions (7d)** — Admin operations in the last 7 days

### Authentication & SSO

- **OIDC Providers** — Number of configured providers (and how many are enabled)
- **SSO Enforced** — Providers with mandatory SSO enabled
- **Active Sessions** — Currently valid sessions vs total session count
- **Superadmin Users** — Count of superadmin users vs total users (green if ≤ 3, yellow if more)

### Recent Security Events

A table showing the 10 most recent security-related events from the last 7 days, with a link to the full audit log.

## Audit Log

The audit log provides a cross-organization view of **all** platform events — unlike the org-scoped audit log available to organization admins.

### Filters

- **Category** — Auth, Profile, Organization, Org Member, Project, Project Member, Permissions, API Key, Deploy, Superadmin
- **Result** — Success or Failure
- **Date Range** — Filter by start and end timestamps

### Event Details

Each audit entry includes:

| Field | Description |
|-------|-------------|
| **Time** | Timestamp of the event |
| **User** | Email of the user who performed the action |
| **Category** | Event category (auth, org, project, etc.) |
| **Action** | Specific action (login, org_created, member_invited, etc.) |
| **Result** | Success or failure |
| **Target** | The resource type and ID affected |
| **IP** | Client IP address |
| **Detail** | Additional JSON context |

The audit log is paginated (25 events per page) and can be refreshed with the reload button.

## GraphQL API Reference

All superadmin operations are available via GraphQL. Every query requires a valid superadmin authentication token.

### Queries

```graphql
# List all organizations
query { adminListOrganizations { id displayName slug memberCount plan subscriptionStatus createdAt } }

# Get organization detail
query { adminGetOrganization(organizationId: 1) { id displayName members { role user { email } } plan projectCount } }

# List all users
query { adminListUsers { id email displayName isSuperadmin organizations { organizationName role } } }

# Platform stats
query { adminPlatformStats { totalUsers activeUsers totalOrganizations subscriptionsByPlan { plan count } } }

# Revenue stats
query { adminRevenueStats { mrr arr arpu churnRate totalPaidOrgs planBreakdown { plan count mrr } orgRevenue { organizationName plan status mrr } } }

# Cross-org audit logs (paginated, filterable)
query { adminAuditLogs(filter: { category: "auth" }, pagination: { limit: 50, offset: 0 }) { total data { id timestamp userEmail category action result } } }

# Security overview
query { adminSecurityOverview { failedLogins24h superadminActions7d oidcProviderCount activeSessions superadminCount } }
```

### Mutations

```graphql
# Grant superadmin
mutation { adminSetSuperadmin(userId: 2) }

# Revoke superadmin
mutation { adminRevokeSuperadmin(userId: 2) }
```

## Security Considerations

- **Access control**: All superadmin queries and mutations check the `is_superadmin` flag on the authenticated user. Non-superadmin users receive a "Superadmin access required" error.
- **Audit trail**: Every superadmin action is logged to the audit log with category `superadmin`, including the admin's user ID, email, and client IP.
- **Self-protection**: Superadmins cannot revoke their own access, preventing accidental lockout.
- **Minimize superadmins**: Keep the number of superadmin users small. The security dashboard flags when there are more than 3 superadmins.
- **UI gating**: The Admin Dashboard link only appears in the Settings sidebar for superadmin users. Non-superadmin users who navigate directly to `/superadmin/*` are redirected to the home page.
