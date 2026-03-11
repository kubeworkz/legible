import { gql } from '@apollo/client';

export const SUBSCRIPTION = gql`
  query Subscription {
    subscription {
      plan
      status
      stripeCustomerId
      stripeSubscriptionId
      currentPeriodStart
      currentPeriodEnd
      canceledAt
      paymentMethodBrand
      paymentMethodLast4
      trialStart
      trialEnd
      trialDaysRemaining
    }
  }
`;

export const STRIPE_ENABLED = gql`
  query StripeEnabled {
    stripeEnabled
  }
`;

export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession($data: CreateCheckoutSessionInput!) {
    createCheckoutSession(data: $data) {
      sessionId
      url
    }
  }
`;

export const CREATE_PORTAL_SESSION = gql`
  mutation CreatePortalSession {
    createPortalSession {
      url
    }
  }
`;

export const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription {
    cancelSubscription {
      plan
      status
      canceledAt
    }
  }
`;

export const RESUME_SUBSCRIPTION = gql`
  mutation ResumeSubscription {
    resumeSubscription {
      plan
      status
      canceledAt
    }
  }
`;

export const ADMIN_SUBSCRIPTIONS = gql`
  query AdminSubscriptions {
    adminSubscriptions {
      id
      organizationId
      organizationName
      plan
      status
      stripeCustomerId
      stripeSubscriptionId
      currentPeriodStart
      currentPeriodEnd
      canceledAt
      trialStart
      trialEnd
      paymentMethodBrand
      paymentMethodLast4
      createdAt
      updatedAt
    }
  }
`;

export const ADMIN_UPDATE_SUBSCRIPTION = gql`
  mutation AdminUpdateSubscription($id: Int!, $data: AdminUpdateSubscriptionInput!) {
    adminUpdateSubscription(id: $id, data: $data) {
      id
      plan
      status
      updatedAt
    }
  }
`;

export const INVOICES = gql`
  query Invoices {
    invoices {
      id
      status
      total
      subtotal
      amountDue
      amountPaid
      currency
      periodStart
      periodEnd
      created
      hostedInvoiceUrl
      invoicePdfUrl
      lineItems {
        id
        description
        quantity
        unitAmount
        amount
        currency
        periodStart
        periodEnd
        priceId
        type
      }
    }
  }
`;

export const UPCOMING_INVOICE = gql`
  query UpcomingInvoice {
    upcomingInvoice {
      id
      status
      total
      subtotal
      amountDue
      currency
      periodStart
      periodEnd
      lineItems {
        id
        description
        quantity
        unitAmount
        amount
        currency
        periodStart
        periodEnd
        type
      }
    }
  }
`;

export const OVERAGE_BREAKDOWN = gql`
  query OverageBreakdown {
    overageBreakdown {
      periodStart
      periodEnd
      totalPaidQueries
      totalCost
      freeTierLimit
      costPerQuery
      dailyBreakdown {
        date
        paidQueries
        costPerQuery
        cost
      }
    }
  }
`;
