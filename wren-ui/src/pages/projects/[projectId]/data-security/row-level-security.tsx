import { useMemo } from 'react';
import { Button, Table, TableColumnsType, Tag, Typography, message } from 'antd';
import styled from 'styled-components';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import LockOutlined from '@ant-design/icons/LockOutlined';
import { MORE_ACTION } from '@/utils/enum';
import { MoreButton } from '@/components/ActionButton';
import { RlsPolicyDropdown } from '@/components/diagram/CustomDropdown';
import useDrawerAction from '@/hooks/useDrawerAction';
import RlsPolicyDrawer from '@/components/modals/RlsPolicyModal';
import { RlsPolicy } from '@/apollo/client/graphql/__types__';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import {
  useRlsPoliciesQuery,
  useSessionPropertiesQuery,
  useCreateRlsPolicyMutation,
  useUpdateRlsPolicyMutation,
  useDeleteRlsPolicyMutation,
} from '@/apollo/client/graphql/dataSecurity.generated';

const { Text } = Typography;

const StyledTagBlock = styled.div`
  margin: -2px -4px;
`;

const StyledTag = styled(Tag)`
  &.ant-tag.ant-tag {
    display: inline-block;
    margin: 2px 4px;
    max-width: 200px;
  }
`;

export default function RowLevelSecurity() {
  const policyDrawer = useDrawerAction();

  const { data, loading } = useRlsPoliciesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const policies = data?.rlsPolicies || [];

  const { data: modelsData } = useListModelsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const modelMap = useMemo(() => {
    const map: Record<number, string> = {};
    (modelsData?.listModels || []).forEach((m) => {
      map[m.id] = m.displayName;
    });
    return map;
  }, [modelsData]);

  const { data: sessionPropsData } = useSessionPropertiesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const spMap = useMemo(() => {
    const map: Record<number, string> = {};
    (sessionPropsData?.sessionProperties || []).forEach((sp) => {
      map[sp.id] = sp.name;
    });
    return map;
  }, [sessionPropsData]);

  const getBaseOptions = (options?: Record<string, any>) => ({
    onError: (error: any) => console.error(error),
    refetchQueries: ['RlsPolicies'],
    awaitRefetchQueries: true,
    ...options,
  });

  const [createRlsPolicyMutation, { loading: createLoading }] =
    useCreateRlsPolicyMutation(
      getBaseOptions({
        onCompleted: () => message.success('Successfully created RLS policy.'),
      }),
    );

  const [updateRlsPolicyMutation, { loading: updateLoading }] =
    useUpdateRlsPolicyMutation(
      getBaseOptions({
        onCompleted: () => message.success('Successfully updated RLS policy.'),
      }),
    );

  const [deleteRlsPolicyMutation] = useDeleteRlsPolicyMutation(
    getBaseOptions({
      onCompleted: () => message.success('Successfully deleted RLS policy.'),
    }),
  );

  const onMoreClick = async (payload: {
    type: MORE_ACTION;
    data: RlsPolicy;
  }) => {
    const { type, data } = payload;
    if (type === MORE_ACTION.DELETE) {
      await deleteRlsPolicyMutation({
        variables: { where: { id: data.id } },
      });
    } else if (type === MORE_ACTION.EDIT) {
      policyDrawer.openDrawer(data);
    }
  };

  const renderTags = (
    ids: number[],
    lookup: Record<number, string>,
    fallbackPrefix: string,
  ) => {
    const display = ids.slice(0, 3);
    const moreCount = ids.length - 3;
    return (
      <StyledTagBlock>
        {display.map((id) => (
          <StyledTag
            key={id}
            className="bg-gray-1 border-gray-5 text-truncate"
          >
            <Text className="gray-9" title={lookup[id]}>
              {lookup[id] || `${fallbackPrefix} #${id}`}
            </Text>
          </StyledTag>
        ))}
        {moreCount > 0 && (
          <span className="text-sm gray-7 pl-1">+{moreCount} more</span>
        )}
      </StyledTagBlock>
    );
  };

  const columns: TableColumnsType<RlsPolicy> = [
    {
      title: 'Policy name',
      dataIndex: 'name',
      width: '30%',
      render: (name: string) => (
        <Text strong title={name} ellipsis>
          {name}
        </Text>
      ),
    },
    {
      title: 'Applied to',
      dataIndex: 'modelIds',
      width: '35%',
      render: (modelIds: number[]) => renderTags(modelIds, modelMap, 'Model'),
    },
    {
      title: 'Session properties',
      dataIndex: 'sessionPropertyIds',
      width: '30%',
      render: (spIds: number[]) =>
        spIds.length > 0 ? (
          renderTags(spIds, spMap, 'Property')
        ) : (
          <Text className="gray-5">—</Text>
        ),
    },
    {
      key: 'action',
      width: 64,
      align: 'center',
      fixed: 'right',
      render: (_: any, record: RlsPolicy) => (
        <RlsPolicyDropdown onMoreClick={onMoreClick} data={record}>
          <MoreButton className="gray-8" />
        </RlsPolicyDropdown>
      ),
    },
  ];

  return (
    <SiderLayout loading={false}>
      <PageLayout
        title={
          <>
            <LockOutlined className="mr-2 gray-8" />
            Row-level security
          </>
        }
        titleExtra={
          <Button type="primary" onClick={() => policyDrawer.openDrawer()}>
            Add a policy
          </Button>
        }
        description="Row-level security lets you filter data and enables access to specific rows in a table based on conditions you define."
      >
        <Table
          className="ant-table-has-header"
          dataSource={policies}
          loading={loading}
          columns={columns}
          rowKey="id"
          pagination={{
            hideOnSinglePage: true,
            pageSize: 10,
            size: 'small',
          }}
          scroll={{ x: 800 }}
        />
        <RlsPolicyDrawer
          {...policyDrawer.state}
          onClose={policyDrawer.closeDrawer}
          loading={createLoading || updateLoading}
          onSubmit={async ({ id, data }: any) => {
            if (id) {
              await updateRlsPolicyMutation({
                variables: { where: { id }, data },
              });
            } else {
              await createRlsPolicyMutation({ variables: { data } });
            }
          }}
        />
      </PageLayout>
    </SiderLayout>
  );
}
