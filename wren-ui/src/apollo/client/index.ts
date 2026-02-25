import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import errorHandler from '@/utils/errorHandler';
import { getStoredProjectId } from '@/hooks/useProject';
import { getAuthToken } from '@/hooks/useAuth';

const apolloErrorLink = onError((error) => errorHandler(error));

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

// Dynamically inject X-Project-Id and Authorization headers on every request
const projectIdLink = setContext((_, { headers }) => {
  const projectId = getStoredProjectId();
  const token = getAuthToken();
  return {
    headers: {
      ...headers,
      ...(projectId ? { 'x-project-id': String(projectId) } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const client = new ApolloClient({
  link: from([apolloErrorLink, projectIdLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
