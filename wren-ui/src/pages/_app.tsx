import { AppProps } from 'next/app';
import Head from 'next/head';
import { Spin, ConfigProvider } from 'antd';
import posthog from 'posthog-js';
import apolloClient from '@/apollo/client';
import { GlobalConfigProvider } from '@/hooks/useGlobalConfig';
import { ProjectProvider } from '@/hooks/useProject';
import { AuthProvider } from '@/hooks/useAuth';
import { OrganizationProvider } from '@/hooks/useOrganization';
import { PostHogProvider } from 'posthog-js/react';
import { ApolloProvider } from '@apollo/client';
import { defaultIndicator } from '@/components/PageLoading';
import { admTheme } from '@/styles/theme';

import '../styles/globals.css';

Spin.setDefaultIndicator(defaultIndicator);

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Wren AI</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ConfigProvider theme={admTheme}>
        <GlobalConfigProvider>
          <ApolloProvider client={apolloClient}>
            <AuthProvider>
              <OrganizationProvider>
                <ProjectProvider>
                  <PostHogProvider client={posthog}>
                    <main className="app">
                      <Component {...pageProps} />
                    </main>
                  </PostHogProvider>
                </ProjectProvider>
              </OrganizationProvider>
            </AuthProvider>
          </ApolloProvider>
        </GlobalConfigProvider>
      </ConfigProvider>
    </>
  );
}

export default App;
