import { useMemo } from 'react';
import styled from 'styled-components';
import { Dropdown, Menu, Button } from 'antd';
import TableOutlined from '@ant-design/icons/TableOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import { useListViewsQuery } from '@/apollo/client/graphql/view.generated';

const SelectorButton = styled(Button)`
  && {
    height: 40px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    padding: 0 20px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

interface Props {
  onSelect: (sql: string, name: string) => void;
}

export default function ModelViewSelector({ onSelect }: Props) {
  const { data: modelsData } = useListModelsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: viewsData } = useListViewsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const menuItems = useMemo(() => {
    const items: any[] = [];

    const models = modelsData?.listModels || [];
    const views = viewsData?.listViews || [];

    if (models.length > 0) {
      items.push({
        key: 'models-header',
        label: (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
            Models
          </span>
        ),
        disabled: true,
      });

      models.forEach((model) => {
        items.push({
          key: `model-${model.id}`,
          icon: <TableOutlined />,
          label: model.displayName,
          onClick: () => {
            const sql = `SELECT * FROM "${model.referenceName}"`;
            onSelect(sql, model.displayName);
          },
        });
      });
    }

    if (views.length > 0) {
      if (models.length > 0) {
        items.push({ type: 'divider' });
      }

      items.push({
        key: 'views-header',
        label: (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
            Views
          </span>
        ),
        disabled: true,
      });

      views.forEach((view) => {
        items.push({
          key: `view-${view.id}`,
          icon: <EyeOutlined />,
          label: view.displayName || view.name,
          onClick: () => {
            const sql = `SELECT * FROM "${view.name}"`;
            onSelect(sql, view.displayName || view.name);
          },
        });
      });
    }

    if (items.length === 0) {
      items.push({
        key: 'empty',
        label: 'No models or views available',
        disabled: true,
      });
    }

    return items;
  }, [modelsData, viewsData, onSelect]);

  return (
    <Dropdown
      overlay={
        <Menu
          items={menuItems}
          style={{ maxHeight: 400, overflow: 'auto' }}
        />
      }
      trigger={['click']}
      placement="bottomCenter"
    >
      <SelectorButton type="primary">
        Choose from a Model / View
        <DownOutlined style={{ fontSize: 10 }} />
      </SelectorButton>
    </Dropdown>
  );
}
