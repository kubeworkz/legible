import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Form, Input, Typography, message } from 'antd';
import styled from 'styled-components';
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

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: {
    email: string;
    password: string;
    displayName?: string;
  }) => {
    setSubmitting(true);
    try {
      await signup(values.email, values.password, values.displayName);
      router.push('/');
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        'Signup failed';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
        <StyledTitle level={3}>Create your account</StyledTitle>
        <Subtitle>Get started with Wren AI</Subtitle>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="displayName"
            label="Name"
          >
            <Input placeholder="Your name (optional)" autoComplete="name" />
          </Form.Item>

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
              { required: true, message: 'Please enter a password' },
              {
                min: 8,
                message: 'Password must be at least 8 characters',
              },
            ]}
          >
            <Input.Password
              placeholder="Create a password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('Passwords do not match'),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
            >
              Create account
            </Button>
          </Form.Item>
        </Form>

        <Footer>
          <Text type="secondary">
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </Text>
        </Footer>
      </Card>
    </Container>
  );
}
