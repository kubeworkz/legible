import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { Typography, Spin, Result, Button } from 'antd';
import styled from 'styled-components';
import { LOGIN_WITH_MAGIC_LINK } from '@/apollo/client/graphql/auth';
import { setAuthToken } from '@/hooks/useAuth';

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

export default function MagicLinkPage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState<
    'idle' | 'authenticating' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [loginWithMagicLink] = useMutation(LOGIN_WITH_MAGIC_LINK);

  useEffect(() => {
    if (!token || typeof token !== 'string') return;
    if (status !== 'idle') return;

    setStatus('authenticating');
    loginWithMagicLink({ variables: { token } })
      .then(({ data }) => {
        const { token: sessionToken } = data.loginWithMagicLink;
        setAuthToken(sessionToken);
        setStatus('success');
        // Hard redirect so AuthProvider picks up new session
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err?.message || 'Failed to sign in. The link may be expired or already used.',
        );
      });
  }, [token, status, loginWithMagicLink]);

  if (!token) {
    return (
      <Container>
        <Card>
          <Result
            status="warning"
            title="Missing token"
            subTitle="This page requires a magic link token. Check your email for the sign-in link."
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
