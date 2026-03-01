import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Table,
  TableColumnsType,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import styled from 'styled-components';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import MinusCircleOutlined from '@ant-design/icons/MinusCircleOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import { MORE_ACTION } from '@/utils/enum';
import { MoreButton } from '@/components/ActionButton';
import { SessionPropertyDropdown } from '@/components/diagram/CustomDropdown';
import useModalAction from '@/hooks/useModalAction';
import SessionPropertyModal from '@/components/modals/SessionPropertyModal';
import { SessionProperty, RlsPolicy } from '@/apollo/client/graphql/__types__';
import {
  useSessionPropertiesQuery,
  useCreateSessionPropertyMutation,
  useUpdateSessionPropertyMutation,
  useDeleteSessionPropertyMutation,
  useRlsPoliciesQuery,
  useUserSessionPropertyValuesLazyQuery,
  useAssignSessionPropertyValuesMutation,
} from '@/apollo/client/graphql/dataSecurity.generated';
import useOrganization from '@/hooks/useOrganization';
import type { MemberInfo } from '@/hooks/useOrganization';

const { Text } = Typography;
const { TabPane } = Tabs;

const StyledTag = styled(Tag)`
  &.ant-tag.ant-tag {
    display: inline-block;
    margin: 2px 4px;
    max-width: 200px;
  }
`;

// ── Manage Properties Tab ───────────────────────────────────

function ManagePropertiesTab({
  sessionProperties,
  loading,
  policies,
  userValueCounts,
  onMoreClick,
}: {
  sessionProperties: SessionProperty[];
  loading: boolean;
  policies: RlsPolicy[];
  userValueCounts: Record<number, number>; // sessionPropertyId → count of users
  onMoreClick: (payload: { type: MORE_ACTION; data: SessionProperty }) => void;
}) {
  // Build a map: sessionPropertyId → policy names using it
  const spPolicyMap = useMemo(() => {
    const map: Record<number, { name: string; required: boolean }[]> = {};
    policies.forEach((policy) => {
      (policy.sessionPropertyIds || []).forEach((spId) => {
        if (!map[spId]) map[spId] = [];
        map[spId].push({ name: policy.name, required: true });
      });
    });
    return map;
  }, [policies]);

  const columns: TableColumnsType<SessionProperty> = [
    {
      title: 'Property name',
      dataIndex: 'name',
      width: '20%',
      render: (name: string) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'Used in policies',
      key: 'usedInPolicies',
      width: '30%',
      render: (_: any, record: SessionProperty) => {
        const policyRefs = spPolicyMap[record.id];
        if (!policyRefs || policyRefs.length === 0) {
          return <Text className="gray-5">Not used</Text>;
        }
        return (
          <div style={{ margin: '-2px -4px' }}>
            {policyRefs.map((ref, i) => (
              <span key={i}>
                <StyledTag>{ref.name}</StyledTag>
                {ref.required && (
                  <Text className="gray-5" style={{ fontSize: 12 }}>
                    · required
                  </Text>
                )}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Assigned to users',
      key: 'assignedToUsers',
      width: '15%',
      render: (_: any, record: SessionProperty) => {
        const count = userValueCounts[record.id] || 0;
        return count > 0 ? (
          <Text>{count} users</Text>
        ) : (
          <Text className="gray-5">Not assigned</Text>
        );
      },
    },
    {
      title: 'Assigned to groups',
      key: 'assignedToGroups',
      width: '15%',
      render: () => <Text className="gray-5">Not assigned</Text>,
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
    <Table
      className="ant-table-has-header"
      dataSource={sessionProperties}
      loading={loading}
      columns={columns}
      rowKey="id"
      pagination={{ hideOnSinglePage: true, pageSize: 10, size: 'small' }}
    />
  );
}

// ── Assign to Users Tab ─────────────────────────────────────

function AssignToUsersTab({
  sessionProperties,
  members,
}: {
  sessionProperties: SessionProperty[];
  members: MemberInfo[];
}) {
  const [editedValues, setEditedValues] = useState<
    Record<string, string> // key: `${userId}-${spId}` → value
  >({});
  const [loadedValues, setLoadedValues] = useState<Record<string, string>>({});
  const [loadedUserIds, setLoadedUserIds] = useState<Set<number>>(new Set());

  const [fetchValues] = useUserSessionPropertyValuesLazyQuery();
  const [assignValues, { loading: saving }] =
    useAssignSessionPropertyValuesMutation({
      onCompleted: () => message.success('Session property values saved.'),
      onError: (err) => message.error(err.message),
    });

  // Load values for all members on mount
  useEffect(() => {
    const loadAll = async () => {
      const newLoaded: Record<string, string> = {};
      const newLoadedIds = new Set<number>();
      for (const member of members) {
        try {
          const result = await fetchValues({
            variables: { userId: member.userId },
          });
          const values = result.data?.userSessionPropertyValues || [];
          values.forEach((v) => {
            newLoaded[`${v.userId}-${v.sessionPropertyId}`] = v.value;
          });
          newLoadedIds.add(member.userId);
        } catch (e) {
          // skip
        }
      }
      setLoadedValues(newLoaded);
      setEditedValues(newLoaded);
      setLoadedUserIds(newLoadedIds);
    };
    if (members.length > 0) loadAll();
  }, [members, fetchValues]);

  const handleChange = useCallback(
    (userId: number, spId: number, value: string) => {
      setEditedValues((prev) => ({
        ...prev,
        [`${userId}-${spId}`]: value,
      }));
    },
    [],
  );

  const hasChanges = useMemo(() => {
    return Object.keys(editedValues).some(
      (key) => editedValues[key] !== (loadedValues[key] || ''),
    );
  }, [editedValues, loadedValues]);

  const handleSave = useCallback(async () => {
    const assignments: Array<{
      userId: number;
      sessionPropertyId: number;
      value: string;
    }> = [];
    Object.entries(editedValues).forEach(([key, value]) => {
      if (value && value.trim()) {
        const [userIdStr, spIdStr] = key.split('-');
        assignments.push({
          userId: parseInt(userIdStr),
          sessionPropertyId: parseInt(spIdStr),
          value: value.trim(),
        });
      }
    });
    if (assignments.length === 0) return;
    await assignValues({ variables: { data: assignments } });
    setLoadedValues({ ...editedValues });
  }, [editedValues, assignValues]);

  // Build table: rows = users, columns = session properties
  const columns: TableColumnsType<MemberInfo> = [
    {
      title: 'User',
      key: 'user',
      width: 220,
      fixed: 'left',
      render: (_: any, record: MemberInfo) => (
        <div>
          <Text strong>{record.user.displayName || record.user.email}</Text>
          {record.user.displayName && (
            <Text className="gray-7 d-block" style={{ fontSize: 12 }}>
              {record.user.email}
            </Text>
          )}
        </div>
      ),
    },
    ...sessionProperties.map((sp) => ({
      title: sp.name,
      key: `sp-${sp.id}`,
      width: 200,
      render: (_: any, record: MemberInfo) => {
        const key = `${record.userId}-${sp.id}`;
        return (
          <Input
            size="small"
            placeholder={sp.defaultExpr || `Enter ${sp.type} value`}
            value={editedValues[key] || ''}
            onChange={(e) => handleChange(record.userId, sp.id, e.target.value)}
          />
        );
      },
    })),
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-center mb-3">
        <Text className="gray-7">
          Assign session property values to individual users. These values will
          be used when evaluating RLS policies.
        </Text>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
        >
          Save changes
        </Button>
      </div>
      <Table
        className="ant-table-has-header"
        dataSource={members}
        columns={columns}
        rowKey={(m) => m.userId}
        pagination={{ hideOnSinglePage: true, pageSize: 10, size: 'small' }}
        scroll={
          sessionProperties.length > 3
            ? { x: 220 + sessionProperties.length * 200 }
            : undefined
        }
        loading={members.length > 0 && loadedUserIds.size === 0}
      />
    </div>
  );
}

// ── Assign to Groups Tab (placeholder) ──────────────────────

function AssignToGroupsTab() {
  return (
    <div className="text-center py-6">
      <Text className="gray-5">
        Group assignment is not yet available. Create groups in Access Control
        settings first.
      </Text>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function SessionPropertyPage() {
  const propertyModal = useModalAction();
  const { members } = useOrganization();

  const { data, loading } = useSessionPropertiesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const sessionProperties = data?.sessionProperties || [];

  const { data: policiesData } = useRlsPoliciesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const policies = policiesData?.rlsPolicies || [];

  // Compute user value counts per session property
  const [fetchValues] = useUserSessionPropertyValuesLazyQuery();
  const [userValueCounts, setUserValueCounts] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<number, Set<number>> = {}; // spId → set of userIds
      for (const member of members) {
        try {
          const result = await fetchValues({
            variables: { userId: member.userId },
          });
          (result.data?.userSessionPropertyValues || []).forEach((v) => {
            if (!counts[v.sessionPropertyId]) {
              counts[v.sessionPropertyId] = new Set();
            }
            counts[v.sessionPropertyId].add(v.userId);
          });
        } catch {
          // skip
        }
      }
      const result: Record<number, number> = {};
      Object.entries(counts).forEach(([spId, users]) => {
        result[parseInt(spId)] = users.size;
      });
      setUserValueCounts(result);
    };
    if (members.length > 0) loadCounts();
  }, [members, fetchValues]);

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

  return (
    <SiderLayout loading={false}>
      <PageLayout
        title={
          <>
            <SettingOutlined className="mr-2 gray-8" />
            Session property
          </>
        }
        titleExtra={
          <Button type="primary" onClick={() => propertyModal.openModal()}>
            Add a property
          </Button>
        }
        description={
          <>
            Session properties are dynamic variables used in policies to
            evaluate access conditions. Assign them to users or groups in the
            UI, or include them in API requests to apply policies correctly.{' '}
            <a
              href="https://docs.getwren.ai/cp/guide/security/rls"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more.
            </a>
          </>
        }
      >
        <Tabs defaultActiveKey="manage">
          <TabPane tab="Manage properties" key="manage">
            <ManagePropertiesTab
              sessionProperties={sessionProperties}
              loading={loading}
              policies={policies}
              userValueCounts={userValueCounts}
              onMoreClick={onMoreClick}
            />
          </TabPane>
          <TabPane tab="Assign to users" key="users">
            <AssignToUsersTab
              sessionProperties={sessionProperties}
              members={members}
            />
          </TabPane>
          <TabPane tab="Assign to groups" key="groups">
            <AssignToGroupsTab />
          </TabPane>
        </Tabs>

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
