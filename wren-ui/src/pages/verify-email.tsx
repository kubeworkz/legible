import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { Button, Typography, Spin, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import useAuth from '@/hooks/useAuth';
import {
  VERIFY_EMAIL,
  RESEND_VERIFICATION_EMAIL,
} from '@/apollo/client/graphql/auth';

const { Title, Text } = Typography;

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

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  const { user, loading: authLoading, logout } = useAuth();

  const [status, setStatus] = useState<
    'idle' | 'verifying' | 'success' | 'error' | 'waiting'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [verifyEmailMutation] = useMutation(VERIFY_EMAIL);
  const [resendMutation] = useMutation(RESEND_VERIFICATION_EMAIL);

  // If there's a token in the URL, verify it
  useEffect(() => {
    if (!token || typeof token !== 'string') return;
    if (status !== 'idle') return;

    setStatus('verifying');
    verifyEmailMutation({ variables: { token } })
      .then(() => {
        setStatus('success');
        // Redirect to home after a brief success message
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err?.message || 'Failed to verify email. The link may be expired.',
        );
      });
  }, [token, status, verifyEmailMutation]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // If user is already verified and no token in URL, redirect home
  useEffect(() => {
    if (authLoading) return;
    if (user?.emailVerified && !token) {
      router.replace('/');
    }
  }, [authLoading, user?.emailVerified, token, router]);

  const handleResend = async () => {
    try {
      await resendMutation();
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend verification email.');
    }
  };

  if (authLoading) {
    return (
      <Container>
        <Spin size="large" />
      </Container>
    );
  }

  // Token-based verification flow (from email link)
  if (token) {
    if (status === 'verifying') {
      return (
        <Container>
          <Card>
            <Spin size="large" />
            <Title level={4} style={{ marginTop: 24 }}>
              Verifying your email...
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
              title="Email verified!"
              subTitle="Redirecting you to the app..."
            />
          </Card>
        </Container>
      );
    }

    if (status === 'error') {
      return (
        <Container>
          <Card>
            <Result
              status="error"
              title="Verification failed"
              subTitle={errorMessage}
              extra={[
                user && (
                  <Button
                    key="resend"
                    type="primary"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </Button>
                ),
                <Button key="login" onClick={() => router.push('/login')}>
                  Back to Login
                </Button>,
              ].filter(Boolean)}
            />
          </Card>
        </Container>
      );
    }
  }

  // Waiting state — user is logged in but not verified, no token in URL
  return (
    <Container>
      <Card>
        <MailOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        <Title level={3} style={{ marginTop: 24 }}>
          Check your email
        </Title>
        <Text style={{ display: 'block', marginBottom: 24, color: '#666' }}>
          We sent a verification link to{' '}
          <strong>{user?.email}</strong>. Click the link in the email to verify
          your account.
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button
            type="primary"
            size="large"
            onClick={handleResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend verification email'}
          </Button>
          <Button size="large" onClick={logout}>
            Sign out
          </Button>
        </div>
      </Card>
    </Container>
  );
}
