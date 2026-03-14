import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useMutation } from '@apollo/client';
import { Button, Typography, Spin, Result } from 'antd';
import styled from 'styled-components';
import { ACCEPT_INVITATION } from '@/apollo/client/graphql/auth';
import useAuth from '@/hooks/useAuth';

const { Title, Text } = Typography;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
`;

const Card = styled.div`
  width: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 48px 40px;
  text-align: center;
`;

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const [acceptInvitation] = useMutation(ACCEPT_INVITATION);
  const [status, setStatus] = useState<
    'loading' | 'needsAuth' | 'accepting' | 'success' | 'wrongAccount' | 'error'
  >('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Track if user explicitly signed out so we don't re-trigger accept
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (authLoading || !router.isReady) return;

    if (!token) {
      setStatus('error');
      setErrorMsg('No invitation token provided.');
      return;
    }

    if (!isAuthenticated) {
      setStatus('needsAuth');
      return;
    }

    // Don't re-attempt if user just signed out (will become needsAuth next render)
    if (signedOut) return;

    // Authenticated — accept the invitation
    setStatus('accepting');
    acceptInvitation({ variables: { token } })
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      })
      .catch((err) => {
        const msg =
          err?.graphQLErrors?.[0]?.message ||
          err?.message ||
          'Failed to accept invitation';
        if (msg.toLowerCase().includes('different email')) {
          setStatus('wrongAccount');
        } else {
          setStatus('error');
        }
        setErrorMsg(msg);
      });
  }, [authLoading, isAuthenticated, token, router.isReady, signedOut]);

  if (status === 'loading' || status === 'accepting') {
    return (
      <Container>
        <Card>
          <Spin size="large" />
          <Title level={4} style={{ marginTop: 24 }}>
            {status === 'accepting'
              ? 'Accepting invitation...'
              : 'Loading...'}
          </Title>
        </Card>
      </Container>
    );
  }

  if (status === 'needsAuth') {
    const inviteUrl = `/accept-invite?token=${encodeURIComponent(token as string)}`;
    return (
      <Container>
        <Card>
          <Title level={3}>You&apos;ve been invited!</Title>
          <Text style={{ display: 'block', marginBottom: 24 }}>
            Please log in or create an account to accept this invitation.
          </Text>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link
              href={`/login?redirect=${encodeURIComponent(inviteUrl)}`}
              passHref
            >
              <Button type="primary" size="large">
                Log In
              </Button>
            </Link>
            <Link
              href={`/signup?redirect=${encodeURIComponent(inviteUrl)}`}
              passHref
            >
              <Button size="large">Sign Up</Button>
            </Link>
          </div>
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
            title="Invitation accepted!"
            subTitle="Redirecting you to the dashboard..."
          />
        </Card>
      </Container>
    );
  }

  if (status === 'wrongAccount') {
    const handleSignOut = async () => {
      setSignedOut(true);
      await logout();
      // logout() navigates to /login by default — override by staying here
      // The effect will re-run, see !isAuthenticated, and set status=needsAuth
    };

    return (
      <Container>
        <Card>
          <Result
            status="warning"
            title="Wrong account"
            subTitle={
              <>
                You&apos;re signed in as <strong>{user?.email}</strong>, but
                this invitation was sent to a different email address. Please
                sign out and sign in or sign up with the invited email.
              </>
            }
            extra={
              <Button type="primary" size="large" onClick={handleSignOut}>
                Sign Out
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  // error
  return (
    <Container>
      <Card>
        <Result
          status="error"
          title="Could not accept invitation"
          subTitle={errorMsg}
          extra={
            <Link href="/" passHref>
              <Button type="primary">Go to Dashboard</Button>
            </Link>
          }
        />
      </Card>
    </Container>
  );
}
