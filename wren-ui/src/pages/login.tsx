import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Form, Input, Typography, message, Divider } from 'antd';
import { useMutation } from '@apollo/client';
import styled from 'styled-components';
import useAuth from '@/hooks/useAuth';
import { REQUEST_MAGIC_LINK } from '@/apollo/client/graphql/auth';

const { Title, Text } = Typography;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
`;

const Card = styled.div`
  width: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 48px 40px;
`;

const LogoWrapper = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const StyledTitle = styled(Title)`
  && {
    text-align: center;
    margin-bottom: 4px;
    font-size: 24px;
  }
`;

const Subtitle = styled(Text)`
  display: block;
  text-align: center;
  margin-bottom: 32px;
  color: var(--gray-7, #8c8c8c);
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 24px;
`;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const [magicForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  const [requestMagicLink] = useMutation(REQUEST_MAGIC_LINK);

  const onFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirect = router.query.redirect as string;
      router.push(redirect || '/');
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        'Login failed';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onMagicLinkSubmit = async (values: { email: string }) => {
    setSubmitting(true);
    try {
      await requestMagicLink({ variables: { email: values.email } });
      setMagicLinkSent(true);
      setMagicLinkEmail(values.email);
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        'Failed to send magic link';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Magic link sent confirmation
  if (magicLinkSent) {
    return (
      <Container>
        <Card>
          <LogoWrapper>
            <Image
              src="/images/logo.svg"
              alt="Wren AI"
              width={48}
              height={48}
            />
          </LogoWrapper>
          <StyledTitle level={3}>Check your email</StyledTitle>
          <Subtitle>
            We sent a sign-in link to <strong>{magicLinkEmail}</strong>.
            Click the link in the email to sign in.
          </Subtitle>
          <Button
            block
            size="large"
            onClick={() => {
              setMagicLinkSent(false);
              setMagicLinkMode(false);
            }}
          >
            Back to login
          </Button>
        </Card>
      </Container>
    );
  }

  // Magic link form
  if (magicLinkMode) {
    return (
      <Container>
        <Card>
          <LogoWrapper>
            <Image
              src="/images/logo.svg"
              alt="Wren AI"
              width={48}
              height={48}
            />
          </LogoWrapper>
          <StyledTitle level={3}>Sign in with email</StyledTitle>
          <Subtitle>
            We&apos;ll send a magic link to your email — no password needed.
          </Subtitle>

          <Form
            form={magicForm}
            layout="vertical"
            onFinish={onMagicLinkSubmit}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="you@example.com" autoComplete="email" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={submitting}
              >
                Send magic link
              </Button>
            </Form.Item>
          </Form>

          <Footer>
            <Button type="link" onClick={() => setMagicLinkMode(false)}>
              Sign in with password instead
            </Button>
          </Footer>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <LogoWrapper>
          <Image
            src="/images/logo.svg"
            alt="Wren AI"
            width={48}
            height={48}
          />
        </LogoWrapper>
        <StyledTitle level={3}>Welcome back</StyledTitle>
        <Subtitle>Sign in to your Wren AI account</Subtitle>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="you@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
            ]}
          >
            <Input.Password
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>or</Divider>

        <Button
          block
          size="large"
          onClick={() => setMagicLinkMode(true)}
        >
          Sign in with magic link
        </Button>

        <Footer>
          <Text type="secondary">
            Don&apos;t have an account?{' '}
            <Link href="/signup">Sign up</Link>
          </Text>
        </Footer>
      </Card>
    </Container>
  );
}
