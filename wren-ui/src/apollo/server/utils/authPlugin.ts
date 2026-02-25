import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { IContext } from '@server/types';
import { PUBLIC_OPERATIONS } from './authGuard';

/**
 * Apollo Server plugin that enforces authentication on all operations
 * except those in the PUBLIC_OPERATIONS whitelist.
 *
 * This provides blanket auth protection without modifying each resolver.
 */
export function createAuthPlugin(): ApolloServerPlugin<IContext> {
  return {
    async requestDidStart() {
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

          // Require authentication for non-public operations
          if (!context.currentUser) {
            throw new Error('Authentication required');
          }
        },
      };
    },
  };
}
