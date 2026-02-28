import { useEffect } from 'react';
import { Form, Input, Modal, Select, Switch } from 'antd';
import { FORM_MODE } from '@/utils/enum';
import { ModalAction } from '@/hooks/useModalAction';
import { SessionProperty } from '@/apollo/client/graphql/__types__';

const SESSION_PROPERTY_TYPES = [
  { label: 'String', value: 'STRING' },
  { label: 'Integer', value: 'INTEGER' },
  { label: 'Boolean', value: 'BOOLEAN' },
  { label: 'Float', value: 'FLOAT' },
];

type Props = ModalAction<SessionProperty> & {
  loading?: boolean;
};

export default function SessionPropertyModal(props: Props) {
  const { defaultValue, formMode, loading, onClose, onSubmit, visible } = props;

  const isCreateMode = formMode === FORM_MODE.CREATE;

  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        name: defaultValue?.name || '',
        type: defaultValue?.type || 'STRING',
        required: defaultValue?.required ?? true,
        defaultExpr: defaultValue?.defaultExpr || '',
      });
    }
  }, [visible, defaultValue]);

  const onSubmitButton = () => {
    form
      .validateFields()
      .then(async (values) => {
        const data = {
          name: values.name,
          type: values.type,
          required: values.required,
          defaultExpr: values.defaultExpr || null,
        };
        await onSubmit({ data, id: defaultValue?.id });
        onClose();
      })
      .catch(console.error);
  };

  return (
    <Modal
      title={`${isCreateMode ? 'Add' : 'Update'} a session property`}
      centered
      closable
      confirmLoading={loading}
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      visible={visible}
      width={560}
      cancelButtonProps={{ disabled: loading }}
      okText="Submit"
      onOk={onSubmitButton}
      afterClose={() => form.resetFields()}
    >
      <Form form={form} preserve={false} layout="vertical">
        <Form.Item
          label="Property name"
          name="name"
          rules={[
            {
              required: true,
              message: 'Please enter a property name.',
            },
            {
              pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
              message:
                'Must start with a letter or underscore, and contain only letters, numbers, or underscores.',
            },
          ]}
        >
          <Input
            autoFocus
            placeholder="e.g. user_region"
            maxLength={100}
          />
        </Form.Item>
        <Form.Item
          label="Type"
          name="type"
          rules={[
            {
              required: true,
              message: 'Please select a type.',
            },
          ]}
        >
          <Select placeholder="Select a type">
            {SESSION_PROPERTY_TYPES.map((t) => (
              <Select.Option key={t.value} value={t.value}>
                {t.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="Required"
          name="required"
          valuePropName="checked"
          extra="When required, queries will fail if this property is not provided at runtime."
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Default expression"
          name="defaultExpr"
          extra="Optional default value used when the property is not provided."
        >
          <Input placeholder="e.g. 'default_value'" maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
