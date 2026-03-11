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
