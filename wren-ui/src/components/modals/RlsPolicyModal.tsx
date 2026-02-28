import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Drawer,
  Form,
  Input,
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
import { FORM_MODE } from '@/utils/enum';
import { DrawerAction } from '@/hooks/useDrawerAction';
import { RlsPolicy, SessionProperty } from '@/apollo/client/graphql/__types__';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import { useSessionPropertiesQuery } from '@/apollo/client/graphql/dataSecurity.generated';

const { Text } = Typography;

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
            showCount
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
