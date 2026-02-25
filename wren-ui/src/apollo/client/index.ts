import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import errorHandler from '@/utils/errorHandler';
import { getStoredProjectId } from '@/hooks/useProject';

const apolloErrorLink = onError((error) => errorHandler(error));

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

// Dynamically inject X-Project-Id header on every request
const projectIdLink = setContext((_, { headers }) => {
  const projectId = getStoredProjectId();
  return {
    headers: {
      ...headers,
      ...(projectId ? { 'x-project-id': String(projectId) } : {}),
    },
  };
});

const client = new ApolloClient({
  link: from([apolloErrorLink, projectIdLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
