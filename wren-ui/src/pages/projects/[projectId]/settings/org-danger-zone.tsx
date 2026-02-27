import { useRouter } from 'next/router';
import { Button, Modal, Typography } from 'antd';
import styled from 'styled-components';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization from '@/hooks/useOrganization';
import useAuth from '@/hooks/useAuth';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const DangerSection = styled.div`
  border: 1px solid var(--red-5);
  border-radius: 8px;
  overflow: hidden;
`;

const DangerRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;

  &:not(:last-child) {
    border-bottom: 1px solid var(--red-5);
  }
`;

const RowContent = styled.div`
  flex: 1;
  margin-right: 24px;
`;

const SectionHeader = styled.div`
  font-weight: 500;
  color: var(--gray-9);
  margin-bottom: 4px;
`;

const SectionDescription = styled.div`
  color: var(--gray-6);
  font-size: 13px;
`;

export default function SettingsOrgDangerZone() {
  const router = useRouter();
  const { currentOrganization, loading, isAdmin } = useOrganization();
  const { user } = useAuth();

  const onLeave = () => {
    if (!currentOrganization) return;

    Modal.confirm({
      title: 'Leave organization?',
      content:
        'Please be aware that leaving the organization will not be able to access this organization.',
      okButtonProps: { danger: true },
      okText: 'Leave organization',
      onOk: async () => {
        // TODO: Implement leave organization mutation
        router.push('/');
      },
    });
  };

  const onDelete = () => {
    if (!currentOrganization) return;

    Modal.confirm({
      title: `Delete "${currentOrganization.displayName}"?`,
      content:
        'Please be aware that deleting the organization will permanently delete all data and associations, it cannot be undone.',
      okButtonProps: { danger: true },
      okText: 'Delete organization',
      onOk: async () => {
        // TODO: Implement delete organization mutation
        router.push('/');
      },
    });
  };

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
        <Title level={4} className="gray-9 mb-5">
          Danger zone
        </Title>

        <DangerSection>
          <DangerRow>
            <RowContent>
              <SectionHeader>Leave organization</SectionHeader>
              <SectionDescription>
                Please be aware that leaving the organization will not be able
                to access this organization.
              </SectionDescription>
            </RowContent>
            <Button danger onClick={onLeave}>
              Leave organization
            </Button>
          </DangerRow>

          {isAdmin && (
            <DangerRow>
              <RowContent>
                <SectionHeader>Delete organization</SectionHeader>
                <SectionDescription>
                  Please be aware that deleting the organization will
                  permanently delete all data and associations, it cannot be
                  undone.
                </SectionDescription>
              </RowContent>
              <Button danger onClick={onDelete}>
                Delete organization
              </Button>
            </DangerRow>
          )}
        </DangerSection>
      </PageContainer>
    </SettingsLayout>
  );
}
