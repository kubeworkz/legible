import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { Typography, Spin, Result, Button } from 'antd';
import styled from 'styled-components';
import { OIDC_CALLBACK } from '@/apollo/client/graphql/oidc';
import { setAuthToken } from '@/hooks/useAuth';

const OIDC_STATE_KEY = 'oidc-state';
const OIDC_NONCE_KEY = 'oidc-nonce';
const OIDC_PROVIDER_KEY = 'oidc-provider';

const { Title } = Typography;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 48px;
  max-width: 480px;
  width: 100%;
  text-align: center;
`;

/**
 * Stores OIDC flow parameters in sessionStorage before redirecting to the IdP.
 * Called from login/signup pages before window.location redirect.
 */
export function storeOidcParams(provider: string, state: string, nonce: string) {
  sessionStorage.setItem(OIDC_PROVIDER_KEY, provider);
  sessionStorage.setItem(OIDC_STATE_KEY, state);
  sessionStorage.setItem(OIDC_NONCE_KEY, nonce);
}

function getAndClearOidcParams() {
  const provider = sessionStorage.getItem(OIDC_PROVIDER_KEY);
  const state = sessionStorage.getItem(OIDC_STATE_KEY);
  const nonce = sessionStorage.getItem(OIDC_NONCE_KEY);
  sessionStorage.removeItem(OIDC_PROVIDER_KEY);
  sessionStorage.removeItem(OIDC_STATE_KEY);
  sessionStorage.removeItem(OIDC_NONCE_KEY);
  return { provider, state, nonce };
}

export default function OidcCallbackPage() {
  const router = useRouter();
  const { code, state: urlState } = router.query;

  const [status, setStatus] = useState<
    'idle' | 'authenticating' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [oidcCallback] = useMutation(OIDC_CALLBACK);

  useEffect(() => {
    if (!code || typeof code !== 'string') return;
    if (!urlState || typeof urlState !== 'string') return;
    if (status !== 'idle') return;

    const { provider, state: storedState, nonce } = getAndClearOidcParams();

    if (!provider || !storedState || !nonce) {
      setStatus('error');
      setErrorMessage('Missing OIDC session data. Please try signing in again.');
      return;
    }

    if (urlState !== storedState) {
      setStatus('error');
      setErrorMessage('State mismatch. This may be a CSRF attempt. Please try again.');
      return;
    }

    const callbackUrl = `${window.location.origin}/oidc/callback`;

    setStatus('authenticating');
    oidcCallback({
      variables: {
        providerSlug: provider,
        code,
        state: urlState,
        nonce,
        callbackUrl,
      },
    })
      .then(({ data }) => {
        const { token } = data.oidcCallback;
        setAuthToken(token);
        localStorage.removeItem('wren-current-project-id');
        localStorage.removeItem('wren-current-org-id');
        setStatus('success');
        // Hard redirect so AuthProvider picks up new session
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err?.graphQLErrors?.[0]?.message ||
            err?.message ||
            'SSO sign-in failed. Please try again.',
        );
      });
  }, [code, urlState, status, oidcCallback]);

  if (!code || !urlState) {
    return (
      <Container>
        <Card>
          <Result
            status="warning"
            title="Missing authorization code"
            subTitle="This page handles the SSO callback. Please start the sign-in flow from the login page."
            extra={
              <Button type="primary" onClick={() => router.push('/login')}>
                Back to Login
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  if (status === 'authenticating' || status === 'idle') {
    return (
      <Container>
        <Card>
          <Spin size="large" />
          <Title level={4} style={{ marginTop: 24 }}>
            Signing you in...
          </Title>
        </Card>
      </Container>
    );
  }

  if (status === 'success') {
    return (
      <Container>
        <Card>
          <Result
            status="success"
            title="Signed in!"
            subTitle="Redirecting you to the app..."
          />
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Result
          status="error"
          title="Sign-in failed"
          subTitle={errorMessage}
          extra={
            <Button type="primary" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          }
        />
      </Card>
    </Container>
  );
}
