import { useEffect, useMemo } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import { FORM_MODE } from '@/utils/enum';
import { ERROR_TEXTS } from '@/utils/error';
import { ModalAction } from '@/hooks/useModalAction';
import { RlsPolicy } from '@/apollo/client/graphql/__types__';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import { useSessionPropertiesQuery } from '@/apollo/client/graphql/dataSecurity.generated';

type Props = ModalAction<RlsPolicy> & {
  loading?: boolean;
};

export default function RlsPolicyModal(props: Props) {
  const { defaultValue, formMode, loading, onClose, onSubmit, visible } = props;

  const isCreateMode = formMode === FORM_MODE.CREATE;

  const [form] = Form.useForm();

  const { data: modelsData } = useListModelsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const models = useMemo(() => modelsData?.listModels || [], [modelsData]);

  const { data: sessionPropsData } = useSessionPropertiesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const sessionProperties = useMemo(
    () => sessionPropsData?.sessionProperties || [],
    [sessionPropsData],
  );

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        name: defaultValue?.name || '',
        condition: defaultValue?.condition || '',
        modelIds: defaultValue?.modelIds || [],
        sessionPropertyIds: defaultValue?.sessionPropertyIds || [],
      });
    }
  }, [visible, defaultValue]);

  const onSubmitButton = () => {
    form
      .validateFields()
      .then(async (values) => {
        const data = {
          name: values.name,
          condition: values.condition,
          modelIds: values.modelIds,
          sessionPropertyIds: values.sessionPropertyIds,
        };
        await onSubmit({ data, id: defaultValue?.id });
        onClose();
      })
      .catch(console.error);
  };

  return (
    <Modal
      title={`${isCreateMode ? 'Add' : 'Update'} an RLS policy`}
      centered
      closable
      confirmLoading={loading}
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      visible={visible}
      width={640}
      cancelButtonProps={{ disabled: loading }}
      okText="Submit"
      onOk={onSubmitButton}
      afterClose={() => form.resetFields()}
    >
      <Form form={form} preserve={false} layout="vertical">
        <Form.Item
          label="Policy name"
          name="name"
          rules={[
            {
              required: true,
              message: 'Please enter a policy name.',
            },
          ]}
        >
          <Input
            autoFocus
            placeholder="e.g. Region-based access"
            maxLength={200}
          />
        </Form.Item>
        <Form.Item
          label="Condition"
          name="condition"
          rules={[
            {
              required: true,
              message: 'Please enter a condition expression.',
            },
          ]}
          extra="SQL-like condition expression, e.g. region = @session.region"
        >
          <Input.TextArea
            placeholder='e.g. region = @session.region AND status = "active"'
            maxLength={2000}
            rows={3}
            showCount
          />
        </Form.Item>
        <Form.Item
          label="Applied models"
          name="modelIds"
          rules={[
            {
              required: true,
              message: 'Please select at least one model.',
            },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select models to apply this policy"
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
        <Form.Item
          label="Session properties"
          name="sessionPropertyIds"
          extra="Select session properties referenced in the condition."
        >
          <Select
            mode="multiple"
            placeholder="Select session properties"
            optionFilterProp="children"
            showSearch
          >
            {sessionProperties.map((sp) => (
              <Select.Option key={sp.id} value={sp.id}>
                {sp.name} ({sp.type})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
