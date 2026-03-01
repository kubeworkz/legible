import { Button, Table, TableColumnsType, Tag, Typography, message } from 'antd';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import MinusCircleOutlined from '@ant-design/icons/MinusCircleOutlined';
import { MORE_ACTION } from '@/utils/enum';
import { getCompactTime } from '@/utils/time';
import { MoreButton } from '@/components/ActionButton';
import { SessionPropertyDropdown } from '@/components/diagram/CustomDropdown';
import useModalAction from '@/hooks/useModalAction';
import SessionPropertyModal from '@/components/modals/SessionPropertyModal';
import { SessionProperty } from '@/apollo/client/graphql/__types__';
import {
  useSessionPropertiesQuery,
  useCreateSessionPropertyMutation,
  useUpdateSessionPropertyMutation,
  useDeleteSessionPropertyMutation,
} from '@/apollo/client/graphql/dataSecurity.generated';

const { Text } = Typography;

export default function SessionPropertyPage() {
  const propertyModal = useModalAction();

  const { data, loading } = useSessionPropertiesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const sessionProperties = data?.sessionProperties || [];

  const getBaseOptions = (options?: Record<string, any>) => ({
    onError: (error: any) => console.error(error),
    refetchQueries: ['SessionProperties'],
    awaitRefetchQueries: true,
    ...options,
  });

  const [createMutation, { loading: createLoading }] =
    useCreateSessionPropertyMutation(
      getBaseOptions({
        onCompleted: () =>
          message.success('Successfully created session property.'),
      }),
    );

  const [updateMutation, { loading: updateLoading }] =
    useUpdateSessionPropertyMutation(
      getBaseOptions({
        onCompleted: () =>
          message.success('Successfully updated session property.'),
      }),
    );

  const [deleteMutation] = useDeleteSessionPropertyMutation(
    getBaseOptions({
      onCompleted: () =>
        message.success('Successfully deleted session property.'),
    }),
  );

  const onMoreClick = async (payload: {
    type: MORE_ACTION;
    data: SessionProperty;
  }) => {
    const { type, data } = payload;
    if (type === MORE_ACTION.DELETE) {
      await deleteMutation({
        variables: { where: { id: data.id } },
      });
    } else if (type === MORE_ACTION.EDIT) {
      propertyModal.openModal(data);
    }
  };

  const columns: TableColumnsType<SessionProperty> = [
    {
      title: 'Name',
      dataIndex: 'name',
      width: '25%',
      render: (name: string) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: 'Required',
      dataIndex: 'required',
      width: 100,
      align: 'center',
      render: (required: boolean) =>
        required ? (
          <CheckCircleOutlined className="green-6" />
        ) : (
          <MinusCircleOutlined className="gray-5" />
        ),
    },
    {
      title: 'Default expression',
      dataIndex: 'defaultExpr',
      width: '25%',
      render: (expr: string | null) =>
        expr ? (
          <Text
            className="gray-7"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            ellipsis
            title={expr}
          >
            {expr}
          </Text>
        ) : (
          <Text className="gray-5">—</Text>
        ),
    },
    {
      title: 'Created time',
      dataIndex: 'createdAt',
      width: 130,
      render: (time: string) => (
        <Text className="gray-7">{getCompactTime(time)}</Text>
      ),
    },
    {
      key: 'action',
      width: 64,
      align: 'center',
      render: (_: any, record: SessionProperty) => (
        <SessionPropertyDropdown onMoreClick={onMoreClick} data={record}>
          <MoreButton className="gray-8" />
        </SessionPropertyDropdown>
      ),
    },
  ];

  return (
    <SiderLayout loading={false}>
      <PageLayout
        title={
          <>
            <SettingOutlined className="mr-2 gray-8" />
            Session Property
          </>
        }
        titleExtra={
          <Button type="primary" onClick={() => propertyModal.openModal()}>
            Add a property
          </Button>
        }
        description="Session properties are variables passed at query time to evaluate row-level security policies. Define properties like user_id, region, or role that your RLS conditions reference."
      >
        <Table
          className="ant-table-has-header"
          dataSource={sessionProperties}
          loading={loading}
          columns={columns}
          rowKey="id"
          pagination={{
            hideOnSinglePage: true,
            pageSize: 10,
            size: 'small',
          }}
        />
        <SessionPropertyModal
          {...propertyModal.state}
          onClose={propertyModal.closeModal}
          loading={createLoading || updateLoading}
          onSubmit={async ({ id, data }: any) => {
            if (id) {
              await updateMutation({
                variables: { where: { id }, data },
              });
            } else {
              await createMutation({ variables: { data } });
            }
          }}
        />
      </PageLayout>
    </SiderLayout>
  );
}
