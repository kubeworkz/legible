import { AppProps } from 'next/app';
import Head from 'next/head';
import { Spin } from 'antd';
import posthog from 'posthog-js';
import apolloClient from '@/apollo/client';
import { GlobalConfigProvider } from '@/hooks/useGlobalConfig';
import { ProjectProvider } from '@/hooks/useProject';
import { PostHogProvider } from 'posthog-js/react';
import { ApolloProvider } from '@apollo/client';
import { defaultIndicator } from '@/components/PageLoading';

require('../styles/index.less');

Spin.setDefaultIndicator(defaultIndicator);

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Wren AI</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <GlobalConfigProvider>
        <ApolloProvider client={apolloClient}>
          <ProjectProvider>
            <PostHogProvider client={posthog}>
              <main className="app">
                <Component {...pageProps} />
              </main>
            </PostHogProvider>
          </ProjectProvider>
        </ApolloProvider>
      </GlobalConfigProvider>
    </>
  );
}

export default App;
