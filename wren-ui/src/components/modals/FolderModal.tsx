import { useEffect } from 'react';
import { Button, Form, Input, Modal } from 'antd';
import { ModalAction } from '@/hooks/useModalAction';
import { FORM_MODE } from '@/utils/enum';

interface FolderFormValues {
  name: string;
}

type Props = ModalAction<{ id?: number; name?: string }, FolderFormValues> & {
  loading?: boolean;
};

export default function FolderModal(props: Props) {
  const { visible, loading, onSubmit, onClose, formMode, defaultValue } = props;
  const [form] = Form.useForm();
  const isEdit = formMode === FORM_MODE.EDIT;

  useEffect(() => {
    if (visible && defaultValue) {
      form.setFieldsValue({ name: defaultValue.name || '' });
    }
  }, [visible, defaultValue]);

  const submit = () => {
    form
      .validateFields()
      .then(async (values) => {
        await onSubmit(values);
        onClose();
      })
      .catch(console.error);
  };

  return (
    <Modal
      title={isEdit ? 'Rename Folder' : 'New Folder'}
      centered
      closable
      destroyOnClose
      onCancel={onClose}
      maskClosable={false}
      visible={visible}
      width={400}
      afterClose={() => form.resetFields()}
      footer={
        <div className="d-flex justify-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={submit} loading={loading}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      }
    >
      <Form form={form} preserve={false} layout="vertical">
        <Form.Item
          label="Folder Name"
          name="name"
          rules={[
            { required: true, message: 'Please enter a folder name' },
            { max: 100, message: 'Folder name must be 100 characters or less' },
          ]}
        >
          <Input placeholder="Enter folder name" autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
