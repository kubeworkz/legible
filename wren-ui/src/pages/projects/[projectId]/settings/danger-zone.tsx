import { useRouter } from 'next/router';
import { Button, Modal, Typography } from 'antd';
import styled from 'styled-components';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useProject from '@/hooks/useProject';
import { Path, buildPath } from '@/utils/enum';
import { useResetCurrentProjectMutation } from '@/apollo/client/graphql/settings.generated';

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

export default function SettingsDangerZone() {
  const router = useRouter();
  const { currentProject, currentProjectId, deleteProject, projects } =
    useProject();
  const [resetCurrentProject, { client }] = useResetCurrentProjectMutation({
    onError: (error) => console.error(error),
  });

  const onReset = () => {
    Modal.confirm({
      title: 'Are you sure you want to reset this project?',
      content:
        'This will delete all current settings and records, including those in the Modeling Page and Home Page threads.',
      okButtonProps: { danger: true },
      okText: 'Reset',
      onOk: async () => {
        await resetCurrentProject();
        client.clearStore();
        router.push(buildPath(Path.OnboardingConnection, currentProjectId));
      },
    });
  };

  const onDelete = () => {
    if (!currentProject) return;

    if (projects.length <= 1) {
      Modal.warning({
        title: 'Cannot delete the only project',
        content:
          'You must have at least one project. Create another project before deleting this one.',
      });
      return;
    }

    Modal.confirm({
      title: `Are you sure you want to delete "${currentProject.displayName}"?`,
      content:
        'This will permanently delete the project and all its data including models, threads, and settings. This action cannot be undone.',
      okButtonProps: { danger: true },
      okText: 'Delete',
      onOk: async () => {
        // Navigate to first remaining project's home
        const remaining = projects.filter((p) => p.id !== currentProject.id);
        const targetId = remaining.length > 0 ? remaining[0].id : 0;
        await deleteProject(currentProject.id);
        router.push(buildPath(Path.Home, targetId));
      },
    });
  };

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Danger zone
        </Title>
        <Text className="gray-6 d-block mb-5">
          Irreversible and destructive actions.
        </Text>

        <DangerSection>
          <SectionHeader>Reset project</SectionHeader>
          <SectionDescription>
            Resetting will delete all current settings and records, including
            models, relationships, and Home Page threads. The data source
            connection will need to be reconfigured.
          </SectionDescription>
          <Button danger onClick={onReset}>
            Reset project
          </Button>
        </DangerSection>

        <DangerSection>
          <SectionHeader>Delete project</SectionHeader>
          <SectionDescription>
            Permanently delete this project and all of its data. This action
            cannot be undone.
          </SectionDescription>
          <Button danger type="primary" onClick={onDelete}>
            Delete project
          </Button>
        </DangerSection>
      </PageContainer>
    </SettingsLayout>
  );
}
