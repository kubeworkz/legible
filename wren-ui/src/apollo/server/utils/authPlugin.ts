import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { IContext } from '@server/types';
import { PUBLIC_OPERATIONS, INTERNAL_SERVICE_OPERATIONS } from './authGuard';

const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

/**
 * Apollo Server plugin that enforces authentication on all operations
 * except those in the PUBLIC_OPERATIONS whitelist.
 *
 * Internal service operations (e.g. previewSql used by AI service) require
 * a valid INTERNAL_SERVICE_TOKEN passed via X-Service-Token header.
 *
 * This provides blanket auth protection without modifying each resolver.
 */
export function createAuthPlugin(): ApolloServerPlugin<IContext> {
  return {
    async requestDidStart(requestContext) {
      // Extract the service token from the request headers
      const serviceToken =
        requestContext.request.http?.headers?.get('x-service-token') || '';
      return {
        async didResolveOperation(requestContext) {
          const { context, operation } = requestContext;

          // Skip introspection queries
          if (operation?.operation === 'query') {
            const selectionSet = operation.selectionSet?.selections || [];
            const isIntrospection = selectionSet.every((sel: any) => {
              return (
                sel.kind === 'Field' &&
                (sel.name.value.startsWith('__') ||
                  sel.name.value === '__schema' ||
                  sel.name.value === '__type')
              );
            });
            if (isIntrospection) return;
          }

          // Check if ALL top-level fields in the operation are public
          const selections =
            operation?.selectionSet?.selections || [];
          const allPublic = selections.every((sel: any) => {
            if (sel.kind === 'Field') {
              return PUBLIC_OPERATIONS.has(sel.name.value);
            }
            return false;
          });

          if (allPublic) return;

          // Check if ALL top-level fields are internal service operations
          // and verify the service token
          const allInternal = selections.every((sel: any) => {
            if (sel.kind === 'Field') {
              return INTERNAL_SERVICE_OPERATIONS.has(sel.name.value);
            }
            return false;
          });

          if (allInternal) {
            if (
              INTERNAL_SERVICE_TOKEN &&
              serviceToken === INTERNAL_SERVICE_TOKEN
            ) {
              return; // Valid service-to-service call
            }
            // If no service token configured, reject — don't fall through to
            // allow unauthenticated access.
            // Also reject if the token doesn't match.
            throw new Error(
              'Authentication required: internal service token invalid or missing',
            );
          }

          // Require authentication for non-public operations
          // Allow either session-based auth (currentUser) or API key auth (osk-/psk- key + organizationId)
          const isApiKeyAuth =
            (context.authToken?.startsWith('osk-') || context.authToken?.startsWith('psk-')) && context.organizationId;
          if (!context.currentUser && !isApiKeyAuth) {
            throw new Error('Authentication required');
          }
        },
      };
    },
  };
}
