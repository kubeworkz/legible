import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Form, Alert, message, Typography } from 'antd';
import styled from 'styled-components';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import { makeIterable } from '@/utils/iteration';
import { DATA_SOURCES, FORM_MODE, Path, buildPath } from '@/utils/enum';
import { getDataSource, getTemplates } from '@/components/pages/setup/utils';
import { FlexLoading } from '@/components/PageLoading';
import ButtonItem from '@/components/pages/setup/ButtonItem';
import {
  transformFormToProperties,
  transformPropertiesToForm,
} from '@/hooks/useSetupConnectionDataSource';
import { parseGraphQLError } from '@/utils/errorHandler';
import {
  useUpdateDataSourceMutation,
} from '@/apollo/client/graphql/dataSource.generated';
import { useGetSettingsLazyQuery } from '@/apollo/client/graphql/settings.generated';
import {
  DataSourceName,
  SampleDatasetName,
} from '@/apollo/client/graphql/__types__';
import useProject from '@/hooks/useProject';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const SampleDatasetIterator = makeIterable(ButtonItem);

function SampleDatasetPanel(props: { sampleDataset: SampleDatasetName }) {
  const { sampleDataset } = props;
  const templates = getTemplates();

  return (
    <>
      <div className="mb-2">Current sample dataset</div>
      <div className="d-grid grid-columns-3 g-4">
        <SampleDatasetIterator
          data={templates.map((t) => ({ ...t, disabled: t.value !== sampleDataset }))}
          selectedTemplate={sampleDataset}
          onSelect={() => {}}
        />
      </div>
      <div className="gray-6 mt-1">
        To change your sample dataset, go to{' '}
        <Link href="/settings/danger-zone">Settings &gt; Project &gt; Danger Zone</Link>{' '}
        to reset the current connection and set up a new one.
      </div>
    </>
  );
}

function DataSourcePanel(props: {
  type: DataSourceName;
  properties: Record<string, any>;
  refetchSettings: () => void;
}) {
  const { type, properties, refetchSettings } = props;
  const current = getDataSource(type as unknown as DATA_SOURCES);
  const [form] = Form.useForm();

  const [updateDataSource, { loading, error }] = useUpdateDataSourceMutation({
    onError: (error) => console.error(error),
    onCompleted: async () => {
      refetchSettings();
      message.success('Successfully updated data source.');
    },
  });

  const updateError = useMemo(() => parseGraphQLError(error), [error]);

  useEffect(() => {
    if (properties) reset();
  }, [properties]);

  const reset = () => {
    form.setFieldsValue(transformPropertiesToForm(properties, type));
  };

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        updateDataSource({
          variables: {
            data: { properties: transformFormToProperties(values, type) },
          },
        });
      })
      .catch((error) => console.error(error));
  };

  if (!type) return <FlexLoading align="center" height={150} />;

  return (
    <>
      <div className="d-flex align-center mb-3">
        <Image
          className="mr-2"
          src={current.logo}
          alt={current.label}
          width="24"
          height="24"
        />
        {current.label}
      </div>
      <Form form={form} layout="vertical">
        <current.component mode={FORM_MODE.EDIT} />
        {updateError && (
          <Alert
            message={updateError.shortMessage}
            description={updateError.message}
            type="error"
            showIcon
            className="my-6"
          />
        )}
        <div className="py-2 text-right">
          <Button className="mr-2" style={{ width: 80 }} onClick={reset}>
            Cancel
          </Button>
          <Button
            type="primary"
            style={{ width: 80 }}
            onClick={submit}
            loading={loading}
          >
            Save
          </Button>
        </div>
      </Form>
    </>
  );
}

const SetupPromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: 64px 32px;
  text-align: center;
`;

function SetupPrompt() {
  const router = useRouter();
  const { currentProjectId } = useProject();

  const onContinueSetup = () => {
    router.push(buildPath(Path.OnboardingConnection, currentProjectId));
  };

  return (
    <SetupPromptContainer>
      <Image
        src="/images/logo.svg"
        alt="Wren AI"
        width={64}
        height={64}
        className="mb-4"
      />
      <Title level={4} className="gray-9 mb-1">
        Let&apos;s get you set up!
      </Title>
      <Text className="gray-6 d-block mb-5" style={{ maxWidth: 400 }}>
        To access your data and unlock powerful insights, please complete the
        setup by clicking the button below.
      </Text>
      <Button type="primary" size="large" onClick={onContinueSetup}>
        Continue setup
      </Button>
    </SetupPromptContainer>
  );
}

export default function SettingsDataConnection() {
  const { currentProjectId } = useProject();
  const [fetchSettings, { data, refetch }] = useGetSettingsLazyQuery({
    fetchPolicy: 'network-only',
  });

  // Re-fetch settings whenever the active project changes so we never show
  // stale data from a different project's cache.
  useEffect(() => {
    if (currentProjectId) {
      fetchSettings();
    }
  }, [currentProjectId]);

  const settings = data?.settings;
  const dataSource = settings?.dataSource;

  // When no data source is configured, show the full-page setup prompt
  // matching the WrenAI cloud layout (no header, centered content).
  if (!dataSource?.sampleDataset && !dataSource?.type) {
    return (
      <SettingsLayout>
        <SetupPrompt />
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Data connection
        </Title>
        <Text className="gray-6 d-block mb-3">
          Manage the data source connection for this project.
        </Text>

        <Alert
          type="info"
          showIcon
          className="mb-5"
          message={
            <span>
              To change your data connection, go to{' '}
              <Link href={buildPath(Path.SettingsDangerZone, currentProjectId)}>
                Settings &gt; Project &gt; Danger Zone
              </Link>{' '}
              to reset the current connection and set up a new one.
            </span>
          }
        />

        {dataSource?.sampleDataset ? (
          <SampleDatasetPanel sampleDataset={dataSource.sampleDataset} />
        ) : (
          <DataSourcePanel
            type={dataSource.type}
            properties={dataSource.properties}
            refetchSettings={() => refetch()}
          />
        )}
      </PageContainer>
    </SettingsLayout>
  );
}
