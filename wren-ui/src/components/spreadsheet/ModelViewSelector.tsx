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

    // Models submenu with cascading children
    const modelChildren = models.map((model) => ({
      key: `model-${model.id}`,
      label: model.displayName,
      onClick: () => {
        const sql = `SELECT * FROM "${model.referenceName}"`;
        onSelect(sql, model.displayName);
      },
    }));

    items.push({
      key: 'models',
      icon: <TableOutlined />,
      label: 'Models',
      children:
        modelChildren.length > 0
          ? modelChildren
          : [{ key: 'no-models', label: 'No models available', disabled: true }],
    });

    // Views submenu with cascading children
    const viewChildren = views.map((view) => ({
      key: `view-${view.id}`,
      label: view.displayName || view.name,
      onClick: () => {
        const sql = `SELECT * FROM "${view.name}"`;
        onSelect(sql, view.displayName || view.name);
      },
    }));

    items.push({
      key: 'views',
      icon: <EyeOutlined />,
      label: 'Views',
      children:
        viewChildren.length > 0
          ? viewChildren
          : [{ key: 'no-views', label: 'No views available', disabled: true }],
    });

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
