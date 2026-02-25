import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Form, Modal, Alert, message, Typography } from 'antd';
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
  useStartSampleDatasetMutation,
  useUpdateDataSourceMutation,
} from '@/apollo/client/graphql/dataSource.generated';
import { useGetSettingsLazyQuery } from '@/apollo/client/graphql/settings.generated';
import {
  DataSourceName,
  SampleDatasetName,
} from '@/apollo/client/graphql/__types__';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const SampleDatasetIterator = makeIterable(ButtonItem);

function SampleDatasetPanel(props: { sampleDataset: SampleDatasetName }) {
  const router = useRouter();
  const { sampleDataset } = props;
  const templates = getTemplates();
  const [startSampleDataset] = useStartSampleDatasetMutation({
    onError: (error) => console.error(error),
    onCompleted: (data) => {
      const projectId = data?.startSampleDataset?.projectId;
      if (projectId && typeof window !== 'undefined') {
        localStorage.setItem('wren-current-project-id', String(projectId));
      }
      router.push(buildPath(Path.Home, projectId || 0));
    },
    refetchQueries: 'active',
  });

  const onSelect = (name: SampleDatasetName) => {
    const isCurrentTemplate = sampleDataset === name;
    if (!isCurrentTemplate) {
      const template = templates.find((item) => item.value === name);
      Modal.confirm({
        title: `Are you sure you want to change to "${template.label}" dataset?`,
        okButtonProps: { danger: true },
        okText: 'Change',
        onOk: async () => {
          await startSampleDataset({ variables: { data: { name } } });
        },
      });
    }
  };

  return (
    <>
      <div className="mb-2">Change sample dataset</div>
      <div className="d-grid grid-columns-3 g-4">
        <SampleDatasetIterator
          data={templates}
          selectedTemplate={sampleDataset}
          onSelect={onSelect}
        />
      </div>
      <div className="gray-6 mt-1">
        Please be aware that choosing another sample dataset will delete all
        thread records in the Home page.
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

export default function SettingsDataConnection() {
  const [fetchSettings, { data, refetch }] = useGetSettingsLazyQuery({
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const settings = data?.settings;
  const dataSource = settings?.dataSource;

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Data connection
        </Title>
        <Text className="gray-6 d-block mb-5">
          Manage the data source connection for this project.
        </Text>

        {dataSource?.sampleDataset ? (
          <SampleDatasetPanel sampleDataset={dataSource.sampleDataset} />
        ) : dataSource?.type ? (
          <DataSourcePanel
            type={dataSource.type}
            properties={dataSource.properties}
            refetchSettings={() => refetch()}
          />
        ) : (
          <FlexLoading align="center" height={150} />
        )}
      </PageContainer>
    </SettingsLayout>
  );
}
