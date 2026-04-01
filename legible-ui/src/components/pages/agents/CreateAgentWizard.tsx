import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';
import styled from 'styled-components';
import { BlueprintData } from '@/apollo/client/graphql/blueprints.generated';

const AceEditor = dynamic(() => import('@/components/editor/AceEditor'), {
  ssr: false,
});

const { Text } = Typography;

const StepContent = styled.div`
  margin-top: 24px;
  min-height: 240px;
`;

const BlueprintCard = styled(Card)`
  margin-top: 12px;
  .ant-descriptions-item-label {
    font-weight: 500;
  }
`;

export interface CreateAgentWizardValues {
  name: string;
  sandboxName: string;
  blueprintId?: number;
  inferenceProfile?: string;
  image?: string;
  policyYaml?: string;
}

interface Props {
  open: boolean;
  loading: boolean;
  blueprints: BlueprintData[];
  onCancel: () => void;
  onCreate: (values: CreateAgentWizardValues) => Promise<void>;
}

const STEPS = [
  { title: 'Basics' },
  { title: 'Blueprint' },
  { title: 'Review & Create' },
];

export default function CreateAgentWizard({
  open,
  loading,
  blueprints,
  onCancel,
  onCreate,
}: Props) {
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [policyYaml, setPolicyYaml] = useState('');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<
    number | undefined
  >();

  const selectedBlueprint = useMemo(
    () => blueprints.find((bp) => bp.id === selectedBlueprintId),
    [blueprints, selectedBlueprintId],
  );

  const inferenceProfileOptions = useMemo(() => {
    if (!selectedBlueprint?.inferenceProfiles) return [];
    return Object.keys(selectedBlueprint.inferenceProfiles).map((name) => ({
      label: name,
      value: name,
    }));
  }, [selectedBlueprint]);

  // Auto-fill from blueprint when selected
  useEffect(() => {
    if (!selectedBlueprint) return;
    if (selectedBlueprint.sandboxImage) {
      form.setFieldValue('image', selectedBlueprint.sandboxImage);
    }
    setPolicyYaml(selectedBlueprint.policyYaml || '');
  }, [selectedBlueprint, form]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setSelectedBlueprintId(undefined);
      setPolicyYaml('');
      form.resetFields();
    }
  }, [open, form]);

  const handleNext = async () => {
    if (step === 0) {
      await form.validateFields(['name', 'sandboxName']);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleCreate = async () => {
    const values = form.getFieldsValue(true);
    await onCreate({
      name: values.name,
      sandboxName: values.sandboxName,
      blueprintId: selectedBlueprintId,
      inferenceProfile: values.inferenceProfile || undefined,
      image: values.image || undefined,
      policyYaml: policyYaml || undefined,
    });
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <Modal
      title="Create Agent"
      open={open}
      width={640}
      onCancel={onCancel}
      okText={isLastStep ? 'Create' : 'Next'}
      cancelText={step > 0 ? 'Back' : 'Cancel'}
      confirmLoading={loading}
      onOk={isLastStep ? handleCreate : handleNext}
      cancelButtonProps={{
        onClick: step > 0 ? handleBack : onCancel,
      }}
    >
      <Steps current={step} items={STEPS} size="small" />

      <StepContent>
        <Form form={form} layout="vertical">
          {/* ── Step 0: Basics ─────────────────────────── */}
          <div style={{ display: step === 0 ? 'block' : 'none' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[
                { required: true, message: 'Agent name is required' },
              ]}
            >
              <Input placeholder="e.g. analytics-agent" />
            </Form.Item>
            <Form.Item
              label="Sandbox Name"
              name="sandboxName"
              rules={[
                { required: true, message: 'Sandbox name is required' },
                {
                  pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                  message:
                    'Lowercase alphanumeric and hyphens only (min 2 chars)',
                },
              ]}
            >
              <Input placeholder="e.g. analytics-sandbox-1" />
            </Form.Item>
          </div>

          {/* ── Step 1: Blueprint & Config ─────────────── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <Form.Item label="Blueprint" name="blueprintId">
              <Select
                allowClear
                placeholder="Select a blueprint template"
                onChange={(value) => {
                  setSelectedBlueprintId(value);
                  form.setFieldValue('inferenceProfile', undefined);
                }}
                options={blueprints.map((bp) => ({
                  label: `${bp.name} (v${bp.version})`,
                  value: bp.id,
                }))}
              />
            </Form.Item>

            {selectedBlueprint && (
              <BlueprintCard size="small" title="Blueprint Details">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Description">
                    {selectedBlueprint.description || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Default Image">
                    <Text code>
                      {selectedBlueprint.sandboxImage || '—'}
                    </Text>
                  </Descriptions.Item>
                  {selectedBlueprint.category && (
                    <Descriptions.Item label="Category">
                      <Tag>{selectedBlueprint.category}</Tag>
                    </Descriptions.Item>
                  )}
                  {selectedBlueprint.tags?.length ? (
                    <Descriptions.Item label="Tags">
                      <Space size={4}>
                        {selectedBlueprint.tags.map((t) => (
                          <Tag key={t} color="geekblue">
                            {t}
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  ) : null}
                  {selectedBlueprint.policyYaml && (
                    <Descriptions.Item label="Default Policy">
                      <Tag color="orange">Included</Tag>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </BlueprintCard>
            )}

            {inferenceProfileOptions.length > 0 && (
              <Form.Item
                label="Inference Profile"
                name="inferenceProfile"
                style={{ marginTop: 16 }}
              >
                <Select
                  allowClear
                  placeholder="Select inference profile"
                  options={inferenceProfileOptions}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Image"
              name="image"
              style={{ marginTop: inferenceProfileOptions.length ? 0 : 16 }}
              extra={
                selectedBlueprint?.sandboxImage
                  ? 'Pre-filled from blueprint. Override if needed.'
                  : undefined
              }
            >
              <Input placeholder="e.g. legible-sandbox:latest" />
            </Form.Item>

            {policyYaml && (
              <>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Network Policy (from blueprint)
                </Text>
                <AceEditor
                  mode="yaml"
                  theme="tomorrow"
                  name="wizard-policy-editor"
                  value={policyYaml}
                  onChange={setPolicyYaml}
                  width="100%"
                  height="160px"
                  fontSize={13}
                  showPrintMargin={false}
                  editorProps={{ $blockScrolling: true }}
                />
              </>
            )}
          </div>

          {/* ── Step 2: Review & Create ────────────────── */}
          {step === 2 && (
            <div>
              <Alert
                type="info"
                showIcon
                message="Review your agent configuration before creating."
                style={{ marginBottom: 16 }}
              />
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Name">
                  {form.getFieldValue('name')}
                </Descriptions.Item>
                <Descriptions.Item label="Sandbox">
                  <Text code>{form.getFieldValue('sandboxName')}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Blueprint">
                  {selectedBlueprint
                    ? `${selectedBlueprint.name} (v${selectedBlueprint.version})`
                    : '—'}
                </Descriptions.Item>
                {form.getFieldValue('inferenceProfile') && (
                  <Descriptions.Item label="Inference Profile">
                    {form.getFieldValue('inferenceProfile')}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Image">
                  <Text code>
                    {form.getFieldValue('image') || '(default)'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Network Policy">
                  {policyYaml ? (
                    <Tag color="orange">Custom</Tag>
                  ) : (
                    <Text type="secondary">None</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Form>
      </StepContent>
    </Modal>
  );
}
