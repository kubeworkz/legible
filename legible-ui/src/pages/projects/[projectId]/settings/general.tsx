import { useEffect, useMemo, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  message,
  Tooltip,
} from 'antd';
import styled from 'styled-components';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useProject from '@/hooks/useProject';
import { getLanguageText } from '@/utils/language';
import { TIMEZONE_OPTIONS } from '@/utils/timezone';
import { ProjectLanguage } from '@/apollo/client/graphql/__types__';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const FieldLabel = styled.div`
  color: var(--gray-8);
  font-weight: 500;
  margin-bottom: 4px;
`;

const FieldDescription = styled.div`
  color: var(--gray-6);
  font-size: 12px;
  margin-top: 2px;
  margin-bottom: 16px;
`;

const ProjectIdContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProjectIdValue = styled.span`
  font-family: monospace;
  color: var(--gray-8);
  background: var(--gray-3);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--gray-4);
`;

export default function SettingsGeneral() {
  const { currentProject, updateProject, loading } = useProject();
  const [form] = Form.useForm();

  const languageOptions = useMemo(
    () =>
      Object.keys(ProjectLanguage).map((key) => ({
        label: getLanguageText(key as ProjectLanguage),
        value: key,
      })),
    [],
  );

  // Reset form when project data loads/changes
  useEffect(() => {
    if (currentProject) {
      form.setFieldsValue({
        displayName: currentProject.displayName,
        language: currentProject.language,
        timezone: currentProject.timezone || 'UTC',
      });
    }
  }, [currentProject, form]);

  const onCopyProjectId = useCallback(() => {
    if (currentProject?.id) {
      navigator.clipboard
        .writeText(String(currentProject.id))
        .then(() => message.success('Project ID copied'))
        .catch(() => message.error('Failed to copy'));
    }
  }, [currentProject?.id]);

  const onDiscard = useCallback(() => {
    if (currentProject) {
      form.setFieldsValue({
        displayName: currentProject.displayName,
        language: currentProject.language,
        timezone: currentProject.timezone || 'UTC',
      });
    }
  }, [currentProject, form]);

  const onSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!currentProject) return;
      await updateProject(currentProject.id, {
        displayName: values.displayName,
        language: values.language,
        timezone: values.timezone,
      });
      message.success('Project settings saved.');
    } catch (error) {
      console.error('Failed to save project settings:', error);
    }
  }, [currentProject, form, updateProject]);

  if (loading || !currentProject) {
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
          General
        </Title>
        <Text className="gray-6 d-block mb-5">
          Manage your project settings.
        </Text>

        <div className="mb-5">
          <Title level={5} className="gray-9 mb-4">
            Details
          </Title>

          {/* Project ID (read-only) */}
          <FieldLabel>Project ID</FieldLabel>
          <ProjectIdContainer>
            <ProjectIdValue>{currentProject.id}</ProjectIdValue>
            <Tooltip title="Copy project ID">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={onCopyProjectId}
              />
            </Tooltip>
          </ProjectIdContainer>
          <FieldDescription />

          {/* Project Name */}
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              displayName: currentProject.displayName,
              language: currentProject.language,
              timezone: currentProject.timezone || 'UTC',
            }}
          >
            <Form.Item
              label="Project name"
              name="displayName"
              rules={[
                {
                  required: true,
                  message: 'Please enter a project name',
                },
              ]}
            >
              <Input placeholder="Enter project name" />
            </Form.Item>

            <Form.Item
              label="Project language"
              name="language"
              extra="This setting will affect the language in which the AI responds to you."
            >
              <Select
                placeholder="Select a language"
                showSearch
                options={languageOptions}
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item
              label="Project timezone"
              name="timezone"
              extra="Used for scheduling and time-related operations."
            >
              <Select
                placeholder="Select a timezone"
                showSearch
                options={TIMEZONE_OPTIONS}
                optionFilterProp="label"
              />
            </Form.Item>
          </Form>
        </div>

        <ButtonRow>
          <Button onClick={onDiscard}>Discard changes</Button>
          <Button type="primary" onClick={onSave}>
            Save
          </Button>
        </ButtonRow>
      </PageContainer>
    </SettingsLayout>
  );
}
