import { useEffect, useCallback } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import styled from 'styled-components';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization from '@/hooks/useOrganization';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--gray-4);
`;

export default function SettingsOrganization() {
  const {
    currentOrganization,
    loading,
    isAdmin,
    updateOrganization,
  } = useOrganization();
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentOrganization) {
      form.setFieldsValue({
        displayName: currentOrganization.displayName,
        slug: currentOrganization.slug,
        logoUrl: currentOrganization.logoUrl || '',
      });
    }
  }, [currentOrganization, form]);

  const onDiscard = useCallback(() => {
    if (currentOrganization) {
      form.setFieldsValue({
        displayName: currentOrganization.displayName,
        slug: currentOrganization.slug,
        logoUrl: currentOrganization.logoUrl || '',
      });
    }
  }, [currentOrganization, form]);

  const onSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      await updateOrganization({
        displayName: values.displayName,
        slug: values.slug,
        logoUrl: values.logoUrl || undefined,
      });
      message.success('Organization settings saved.');
    } catch (error) {
      console.error('Failed to save organization settings:', error);
      message.error('Failed to save organization settings.');
    }
  }, [form, updateOrganization]);

  if (loading || !currentOrganization) {
    return (
      <SettingsLayout loading={loading}>
        <div />
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Organization
        </Title>
        <Text className="gray-6 d-block mb-5">
          Manage your organization settings.
        </Text>

        <div className="mb-5">
          <Title level={5} className="gray-9 mb-4">
            Details
          </Title>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              displayName: currentOrganization.displayName,
              slug: currentOrganization.slug,
              logoUrl: currentOrganization.logoUrl || '',
            }}
          >
            <Form.Item
              label="Organization name"
              name="displayName"
              rules={[
                {
                  required: true,
                  message: 'Please enter an organization name',
                },
              ]}
            >
              <Input
                placeholder="Enter organization name"
                disabled={!isAdmin}
              />
            </Form.Item>

            <Form.Item
              label="Slug"
              name="slug"
              extra="A unique URL-friendly identifier for your organization."
              rules={[
                { required: true, message: 'Please enter a slug' },
                {
                  pattern: /^[a-z0-9-]+$/,
                  message:
                    'Slug can only contain lowercase letters, numbers, and dashes',
                },
              ]}
            >
              <Input placeholder="my-organization" disabled={!isAdmin} />
            </Form.Item>

            <Form.Item
              label="Logo URL"
              name="logoUrl"
              extra="An optional URL for your organization's logo."
            >
              <Input
                placeholder="https://example.com/logo.png"
                disabled={!isAdmin}
              />
            </Form.Item>
          </Form>
        </div>

        {isAdmin && (
          <ButtonRow>
            <Button onClick={onDiscard}>Discard changes</Button>
            <Button type="primary" onClick={onSave}>
              Save
            </Button>
          </ButtonRow>
        )}
      </PageContainer>
    </SettingsLayout>
  );
}
