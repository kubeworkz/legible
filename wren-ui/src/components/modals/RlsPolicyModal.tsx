import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  Popover,
  Select,
  Space,
  Table,
  TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import MinusCircleOutlined from '@ant-design/icons/MinusCircleOutlined';
import CaretRightOutlined from '@ant-design/icons/CaretRightOutlined';
import styled from 'styled-components';
import { FORM_MODE } from '@/utils/enum';
import { DrawerAction } from '@/hooks/useDrawerAction';
import { RlsPolicy, SessionProperty } from '@/apollo/client/graphql/__types__';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import { useSessionPropertiesQuery } from '@/apollo/client/graphql/dataSecurity.generated';
import { usePreviewSqlMutation } from '@/apollo/client/graphql/sql.generated';
import PreviewData from '@/components/dataPreview/PreviewData';

const { Text, Title } = Typography;

const SessionPropertyPopover = styled.div`
  .sp-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    &:last-child { margin-bottom: 0; }
  }
  .sp-label {
    font-family: monospace;
    min-width: 120px;
    font-weight: 500;
  }
`;

interface PolicyPreviewProps {
  models: Array<{ id: number; displayName: string; referenceName: string }>;
  selectedModelIds: number[];
  selectedSessionProperties: SessionProperty[];
}

function PolicyPreview({
  models,
  selectedModelIds,
  selectedSessionProperties,
}: PolicyPreviewProps) {
  const [previewModelId, setPreviewModelId] = useState<number | undefined>(
    undefined,
  );
  const [spValues, setSpValues] = useState<Record<number, string>>({});
  const [popoverVisible, setPopoverVisible] = useState(false);

  const [previewSql, { data: previewResult, loading, error }] =
    usePreviewSqlMutation();

  // Models available for preview = only the ones selected in "Applied to"
  const previewModels = useMemo(
    () => models.filter((m) => selectedModelIds.includes(m.id)),
    [models, selectedModelIds],
  );

  // Reset preview model if it's removed from selection
  useEffect(() => {
    if (previewModelId && !selectedModelIds.includes(previewModelId)) {
      setPreviewModelId(undefined);
    }
  }, [selectedModelIds, previewModelId]);

  const spCount = Object.values(spValues).filter((v) => v.trim()).length;

  const handlePreview = useCallback(() => {
    if (!previewModelId) return;
    const model = models.find((m) => m.id === previewModelId);
    if (!model) return;

    const sql = `SELECT * FROM "${model.referenceName}"`;
    const sessionProperties: Record<string, string> = {};
    selectedSessionProperties.forEach((sp) => {
      const val = spValues[sp.id];
      if (val && val.trim()) {
        sessionProperties[sp.name] = val.trim();
      }
    });

    previewSql({
      variables: {
        data: {
          sql,
          limit: 50,
          sessionProperties:
            Object.keys(sessionProperties).length > 0
              ? sessionProperties
              : undefined,
        },
      },
    });
  }, [previewModelId, models, selectedSessionProperties, spValues, previewSql]);

  const previewData = useMemo(() => {
    if (!previewResult?.previewSql) return undefined;
    const result = previewResult.previewSql;
    return {
      columns: result.columns || [],
      data: result.data || [],
    };
  }, [previewResult]);

  const popoverContent = (
    <SessionPropertyPopover>
      {selectedSessionProperties.length === 0 ? (
        <Text className="gray-7">No session properties selected.</Text>
      ) : (
        selectedSessionProperties.map((sp) => (
          <div key={sp.id} className="sp-row">
            <Text className="sp-label">{sp.name}</Text>
            <Input
              size="small"
              placeholder={`Value (${sp.type})`}
              value={spValues[sp.id] || ''}
              onChange={(e) =>
                setSpValues((prev) => ({ ...prev, [sp.id]: e.target.value }))
              }
              style={{ width: 180 }}
            />
          </div>
        ))
      )}
    </SessionPropertyPopover>
  );

  return (
    <div>
      <Title level={5} className="gray-9 mb-1">
        Policy preview
      </Title>
      <Text className="gray-7 d-block mb-3">
        Preview how this policy filters data by{' '}
        <Text strong>selecting a model</Text> and{' '}
        <Text strong>setting session property values</Text>.
      </Text>

      <Space className="mb-3" size={8}>
        <Select
          placeholder="Select a model"
          value={previewModelId}
          onChange={setPreviewModelId}
          style={{ width: 200 }}
          allowClear
        >
          {previewModels.map((m) => (
            <Select.Option key={m.id} value={m.id}>
              {m.displayName}
            </Select.Option>
          ))}
        </Select>

        <Popover
          content={popoverContent}
          title="Set session properties"
          trigger="click"
          visible={popoverVisible}
          onVisibleChange={setPopoverVisible}
          placement="bottomLeft"
        >
          <Badge count={spCount} size="small" offset={[-4, 0]}>
            <Button>Set session properties</Button>
          </Badge>
        </Popover>

        <Button
          type="primary"
          ghost
          icon={<CaretRightOutlined />}
          onClick={handlePreview}
          loading={loading}
          disabled={!previewModelId}
        >
          Preview
        </Button>
      </Space>

      <PreviewData
        previewData={previewData}
        loading={loading}
        error={error}
        locale={{ emptyText: 'Run a preview to see filtered data.' }}
        copyable={false}
      />
    </div>
  );
}

type Props = DrawerAction<RlsPolicy> & {
  loading?: boolean;
  onSubmit?: (values: any) => Promise<void>;
};

export default function RlsPolicyDrawer(props: Props) {
  const { defaultValue, formMode, loading, onClose, onSubmit, visible } = props;

  const isCreateMode = formMode === FORM_MODE.CREATE;

  const [form] = Form.useForm();
  const [selectedSPIds, setSelectedSPIds] = useState<number[]>([]);

  const { data: modelsData } = useListModelsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const models = useMemo(() => modelsData?.listModels || [], [modelsData]);

  const { data: sessionPropsData } = useSessionPropertiesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const allSessionProperties = useMemo(
    () => sessionPropsData?.sessionProperties || [],
    [sessionPropsData],
  );

  const selectedSessionProperties = useMemo(
    () => allSessionProperties.filter((sp) => selectedSPIds.includes(sp.id)),
    [allSessionProperties, selectedSPIds],
  );

  const availableSessionProperties = useMemo(
    () => allSessionProperties.filter((sp) => !selectedSPIds.includes(sp.id)),
    [allSessionProperties, selectedSPIds],
  );

  useEffect(() => {
    if (visible) {
      const ids = defaultValue?.sessionPropertyIds || [];
      form.setFieldsValue({
        name: defaultValue?.name || '',
        condition: defaultValue?.condition || '',
        modelIds: defaultValue?.modelIds || [],
      });
      setSelectedSPIds(ids);
    }
  }, [visible, defaultValue]);

  const afterVisibleChange = (vis: boolean) => {
    if (!vis) {
      form.resetFields();
      setSelectedSPIds([]);
    }
  };

  const addSessionProperty = (spId: number) => {
    setSelectedSPIds((prev) => [...prev, spId]);
  };

  const removeSessionProperty = (spId: number) => {
    setSelectedSPIds((prev) => prev.filter((id) => id !== spId));
  };

  const submit = () => {
    form
      .validateFields()
      .then(async (values) => {
        const data = {
          name: values.name,
          condition: values.condition,
          modelIds: values.modelIds,
          sessionPropertyIds: selectedSPIds,
        };
        await onSubmit({ data, id: defaultValue?.id });
        onClose();
      })
      .catch(console.error);
  };

  const spColumns: TableColumnsType<SessionProperty> = [
    {
      title: 'Property name',
      dataIndex: 'name',
      render: (name: string) => (
        <Text style={{ fontFamily: 'monospace' }}>{name}</Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Required',
      dataIndex: 'required',
      width: 90,
      align: 'center',
      render: (required: boolean) =>
        required ? (
          <CheckCircleOutlined className="green-6" />
        ) : (
          <MinusCircleOutlined className="gray-5" />
        ),
    },
    {
      key: 'action',
      width: 48,
      align: 'center',
      render: (_: any, record: SessionProperty) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeSessionProperty(record.id)}
        />
      ),
    },
  ];

  return (
    <Drawer
      visible={visible}
      title={`${isCreateMode ? 'Add' : 'Update'} a policy`}
      width={640}
      closable
      destroyOnClose
      afterVisibleChange={afterVisibleChange}
      onClose={onClose}
      footer={
        <Space className="d-flex justify-end">
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={submit}
            loading={loading}
            disabled={loading}
          >
            Submit
          </Button>
        </Space>
      }
    >
      {isCreateMode && (
        <Alert
          className="mb-6"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <>
              First time setting up a policy?{' '}
              <a
                href="https://docs.getwren.ai/cp/guide/security/rls"
                target="_blank"
                rel="noopener noreferrer"
              >
                View step-by-step guide
              </a>
            </>
          }
        />
      )}

      <Form form={form} preserve={false} layout="vertical">
        {/* Policy name */}
        <Form.Item
          label="Policy name"
          name="name"
          extra="Policy name is for display only."
          rules={[
            { required: true, message: 'Please enter a policy name.' },
          ]}
        >
          <Input placeholder="Name" maxLength={200} />
        </Form.Item>

        {/* Applied to */}
        <Form.Item
          label="Applied to"
          name="modelIds"
          extra="Choose the models to apply this policy to."
          rules={[
            { required: true, message: 'Please select at least one model.' },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select models"
            optionFilterProp="children"
            showSearch
          >
            {models.map((model) => (
              <Select.Option key={model.id} value={model.id}>
                {model.displayName}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider />

        {/* Session property section */}
        <div className="mb-6">
          <Text strong className="d-block mb-2">
            Session property
          </Text>
          <Text className="gray-7 d-block mb-3">
            Session properties are <Text strong>dynamic variables</Text> used to
            evaluate access conditions. To use them in the UI, assign values to
            users or groups on the Session Property page. When using the API,
            include them explicitly in the request.
          </Text>

          <Select
            className="mb-3"
            style={{ width: '100%' }}
            placeholder="+ Add session property"
            value={undefined}
            showSearch
            optionFilterProp="children"
            onChange={(value: number) => addSessionProperty(value)}
            suffixIcon={<PlusOutlined />}
            notFoundContent="No more session properties available."
          >
            {availableSessionProperties.map((sp) => (
              <Select.Option key={sp.id} value={sp.id}>
                {sp.name} ({sp.type})
              </Select.Option>
            ))}
          </Select>

          <Table
            size="small"
            dataSource={selectedSessionProperties}
            columns={spColumns}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'No session properties added yet.' }}
          />
        </div>

        <Divider />

        {/* Policy condition */}
        <Form.Item
          label="Policy condition"
          name="condition"
          extra="This condition will be evaluated using the provided session properties. It will be appended as a WHERE clause to queries on the applied models."
          rules={[
            { required: true, message: 'Please enter a condition expression.' },
          ]}
        >
          <Input.TextArea
            placeholder='e.g. region = @session.user_region AND status = "active"'
            maxLength={2000}
            rows={4}
          />
        </Form.Item>

        <Divider />

        {/* Policy preview */}
        <Form.Item noStyle shouldUpdate>
          {() => {
            const modelIds = form.getFieldValue('modelIds') || [];
            return (
              <PolicyPreview
                models={models as any}
                selectedModelIds={modelIds}
                selectedSessionProperties={selectedSessionProperties}
              />
            );
          }}
        </Form.Item>
      </Form>
    </Drawer>
  );
}
