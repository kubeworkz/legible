import { useRouter } from 'next/router';
import { Button, Modal, Typography, Input, Form } from 'antd';
import styled from 'styled-components';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useAuth from '@/hooks/useAuth';
import { useMutation } from '@apollo/client';
import { DELETE_ACCOUNT } from '@/apollo/client/graphql/user';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const DangerSection = styled.div`
  border: 1px solid var(--red-5);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
`;

const SectionHeader = styled.div`
  font-weight: 500;
  color: var(--gray-9);
  margin-bottom: 4px;
`;

const SectionDescription = styled.div`
  color: var(--gray-6);
  font-size: 13px;
  margin-bottom: 12px;
`;

export default function SettingsUserDangerZone() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);

  const onDeleteAccount = () => {
    if (!user) return;

    let confirmEmail = '';

    Modal.confirm({
      title: 'Delete your account?',
      icon: null,
      content: (
        <div>
          <Text className="d-block mb-3">
            This will permanently deactivate your account. You will be logged
            out and will no longer be able to sign in. This action cannot be
            easily undone.
          </Text>
          <Text className="d-block mb-2" strong>
            Type your email ({user.email}) to confirm:
          </Text>
          <Input
            placeholder={user.email}
            onChange={(e) => {
              confirmEmail = e.target.value;
            }}
          />
        </div>
      ),
      okButtonProps: { danger: true },
      okText: 'Delete my account',
      onOk: async () => {
        if (confirmEmail !== user.email) {
          Modal.error({
            title: 'Email does not match',
            content: 'Please type your email correctly to confirm deletion.',
          });
          return Promise.reject();
        }
        await deleteAccount();
        await logout();
      },
    });
  };

  if (authLoading || !user) {
    return (
      <SettingsLayout loading={authLoading}>
        <div />
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Danger zone
        </Title>
        <Text className="gray-6 d-block mb-5">
          Irreversible and destructive actions for your account.
        </Text>

        <DangerSection>
          <SectionHeader>Delete account</SectionHeader>
          <SectionDescription>
            Permanently deactivate your account. You will be logged out and will
            no longer be able to sign in with this account. Your data in any
            organizations or projects will remain, but you will lose access.
          </SectionDescription>
          <Button danger type="primary" onClick={onDeleteAccount}>
            Delete my account
          </Button>
        </DangerSection>
      </PageContainer>
    </SettingsLayout>
  );
}
