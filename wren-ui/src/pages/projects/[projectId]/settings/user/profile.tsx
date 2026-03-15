import { useCallback, useState } from 'react';
import {
  Button,
  Typography,
  Form,
  Input,
  message,
  Modal,
  Divider,
  Card,
  List,
  Popconfirm,
  Tag,
  Empty,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useAuth from '@/hooks/useAuth';
import { useMutation, useQuery } from '@apollo/client';
import {
  UPDATE_PROFILE,
  CHANGE_PASSWORD,
} from '@/apollo/client/graphql/user';
import { ME } from '@/apollo/client/graphql/auth';
import { LINKED_IDENTITIES, UNLINK_IDENTITY } from '@/apollo/client/graphql/oidc';

const { Title, Text, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 720px;
  padding: 24px 32px;
`;

const StyledCard = styled(Card)`
  margin-bottom: 24px;
`;

export default function SettingsUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [updateProfile] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: ME }],
  });
  const [changePassword] = useMutation(CHANGE_PASSWORD);
  const { data: identitiesData, loading: identitiesLoading } = useQuery(
    LINKED_IDENTITIES,
    { fetchPolicy: 'cache-and-network' },
  );
  const [unlinkIdentity] = useMutation(UNLINK_IDENTITY, {
    refetchQueries: [{ query: LINKED_IDENTITIES }],
  });

  const handleSaveProfile = useCallback(async () => {
    try {
      const values = await profileForm.validateFields();
      setSavingProfile(true);
      await updateProfile({
        variables: {
          data: {
            displayName: values.displayName || null,
          },
        },
      });
      message.success('Profile updated successfully.');
    } catch (error) {
      if ((error as any)?.errorFields) return;
      console.error('Failed to update profile:', error);
      message.error('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }, [profileForm, updateProfile]);

  const handleDiscardChanges = useCallback(() => {
    if (user) {
      profileForm.setFieldsValue({
        displayName: user.displayName || '',
      });
    }
  }, [profileForm, user]);

  const handleChangePassword = useCallback(async () => {
    try {
      const values = await passwordForm.validateFields();
      setChangingPassword(true);
      await changePassword({
        variables: {
          data: {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          },
        },
      });
      message.success('Password changed successfully.');
      passwordForm.resetFields();
      setPasswordModalVisible(false);
    } catch (error) {
      if ((error as any)?.errorFields) return;
      const msg =
        (error as any)?.message || 'Failed to change password.';
      message.error(msg);
    } finally {
      setChangingPassword(false);
    }
  }, [passwordForm, changePassword]);

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
          Profile information
        </Title>
        <Paragraph className="gray-7 mb-4">
          Manage your personal account details.
        </Paragraph>

        <StyledCard title="Details">
          <Form
            form={profileForm}
            layout="horizontal"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 14 }}
            initialValues={{
              displayName: user.displayName || '',
            }}
          >
            <Form.Item
              label="Display name"
              name="displayName"
              rules={[
                {
                  max: 100,
                  message: 'Display name must be 100 characters or fewer',
                },
              ]}
            >
              <Input placeholder="Your display name" />
            </Form.Item>
            <Form.Item label="Email">
              <Text className="gray-7">{user.email}</Text>
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 6, span: 14 }}>
              <Button
                className="mr-2"
                onClick={handleDiscardChanges}
              >
                Discard changes
              </Button>
              <Button
                type="primary"
                loading={savingProfile}
                onClick={handleSaveProfile}
              >
                Save
              </Button>
            </Form.Item>
          </Form>
        </StyledCard>

        <StyledCard title="Change password">
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 14 }}>
            <Form.Item label="Password">
              <Button onClick={() => setPasswordModalVisible(true)}>
                Change password
              </Button>
            </Form.Item>
          </Form>
        </StyledCard>

        <Modal
          title="Change Password"
          open={passwordModalVisible}
          onOk={handleChangePassword}
          onCancel={() => {
            passwordForm.resetFields();
            setPasswordModalVisible(false);
          }}
          confirmLoading={changingPassword}
          okText="Change password"
          destroyOnClose
        >
          <Form form={passwordForm} layout="vertical">
            <Form.Item
              label="Current password"
              name="currentPassword"
              rules={[
                { required: true, message: 'Please enter your current password' },
              ]}
            >
              <Input.Password placeholder="Current password" />
            </Form.Item>
            <Form.Item
              label="New password"
              name="newPassword"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password placeholder="New password" />
            </Form.Item>
            <Form.Item
              label="Confirm new password"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Passwords do not match'),
                    );
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm new password" />
            </Form.Item>
          </Form>
        </Modal>

        <StyledCard title="Linked accounts" loading={identitiesLoading}>
          {identitiesData?.linkedIdentities?.length > 0 ? (
            <List
              dataSource={identitiesData.linkedIdentities}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="unlink"
                      title="Unlink this account?"
                      description="You can always re-link it by signing in with this provider again."
                      onConfirm={async () => {
                        try {
                          await unlinkIdentity({
                            variables: { identityId: item.id },
                          });
                          message.success('Account unlinked.');
                        } catch (err: any) {
                          message.error(
                            err?.graphQLErrors?.[0]?.message ||
                              err?.message ||
                              'Failed to unlink account.',
                          );
                        }
                      }}
                      okText="Unlink"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        Unlink
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <>
                        <Tag color="blue">{item.providerSlug}</Tag>
                        {item.displayName || item.email}
                      </>
                    }
                    description={item.email}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty
              description="No linked SSO accounts"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </StyledCard>
      </PageContainer>
    </SettingsLayout>
  );
}
