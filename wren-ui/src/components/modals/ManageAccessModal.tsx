import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Modal, Select } from 'antd';
import GlobalOutlined from '@ant-design/icons/GlobalOutlined';
import LockOutlined from '@ant-design/icons/LockOutlined';
import { FolderVisibility } from '@/apollo/client/graphql/__types__';

const { Option } = Select;

const AccessOption = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;

  .access-icon {
    flex-shrink: 0;
    font-size: 16px;
    color: var(--gray-7);
    margin-top: 2px;
  }

  .access-text {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .access-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--gray-9);
      line-height: 20px;
    }

    .access-description {
      font-size: 12px;
      color: var(--gray-7);
      line-height: 18px;
    }
  }
`;

const StyledSelect = styled(Select)`
  width: 100%;

  &.ant-select-single .ant-select-selector {
    height: auto !important;
    padding: 8px 12px;
  }

  .ant-select-selection-item {
    line-height: normal !important;
  }
`;

const FieldLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-8);
  margin-bottom: 8px;
`;

interface AccessModeConfig {
  value: FolderVisibility;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const ACCESS_MODES: AccessModeConfig[] = [
  {
    value: FolderVisibility.shared,
    icon: <GlobalOutlined className="access-icon" />,
    label: 'Anyone in the project',
    description: 'Anyone in your project can view this folder',
  },
  {
    value: FolderVisibility.private,
    icon: <LockOutlined className="access-icon" />,
    label: 'Private',
    description: 'Only you can view and manage this folder',
  },
];

function AccessOptionContent({ mode }: { mode: AccessModeConfig }) {
  return (
    <AccessOption>
      {mode.icon}
      <div className="access-text">
        <span className="access-label">{mode.label}</span>
        <span className="access-description">{mode.description}</span>
      </div>
    </AccessOption>
  );
}

interface Props {
  visible: boolean;
  folderId: number | null;
  currentVisibility: FolderVisibility | null;
  onSubmit: (folderId: number, visibility: FolderVisibility) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export default function ManageAccessModal(props: Props) {
  const { visible, folderId, currentVisibility, onSubmit, onClose, loading } =
    props;
  const [selectedMode, setSelectedMode] = useState<FolderVisibility>(
    FolderVisibility.shared,
  );

  useEffect(() => {
    if (visible && currentVisibility) {
      setSelectedMode(currentVisibility);
    }
  }, [visible, currentVisibility]);

  const handleSubmit = async () => {
    if (folderId !== null) {
      await onSubmit(folderId, selectedMode);
      onClose();
    }
  };

  return (
    <Modal
      title="Manage access"
      centered
      closable
      destroyOnClose
      onCancel={onClose}
      maskClosable={false}
      visible={visible}
      width={480}
      afterClose={() => setSelectedMode(FolderVisibility.shared)}
      footer={
        <div className="d-flex justify-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Save
          </Button>
        </div>
      }
    >
      <FieldLabel>Access mode</FieldLabel>
      <StyledSelect
        value={selectedMode}
        onChange={(value) => setSelectedMode(value as FolderVisibility)}
        optionLabelProp="label"
        dropdownStyle={{ padding: 4 }}
      >
        {ACCESS_MODES.map((mode) => (
          <Option
            key={mode.value}
            value={mode.value}
            label={mode.label}
          >
            <AccessOptionContent mode={mode} />
          </Option>
        ))}
      </StyledSelect>
    </Modal>
  );
}
