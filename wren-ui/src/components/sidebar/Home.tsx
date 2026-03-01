import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import { Path, buildPath } from '@/utils/enum';
import { useSidebarTreeState } from './SidebarTree';
import ThreadTree, { ThreadData } from './home/ThreadTree';
import DashboardTree, { DashboardData } from './home/DashboardTree';
import useProject from '@/hooks/useProject';

export interface Props {
  data: {
    threads: ThreadData[];
    dashboards: DashboardData[];
  };
  onSelect: (selectKeys) => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onDashboardSelect: (selectKeys: string[]) => void;
  onDashboardRename: (id: string, newName: string) => Promise<void>;
  onDashboardDelete: (id: string) => Promise<void>;
  onDashboardCreate: () => Promise<void>;
}

export default function Home(props: Props) {
  const {
    data,
    onSelect,
    onRename,
    onDelete,
    onDashboardSelect,
    onDashboardRename,
    onDashboardDelete,
    onDashboardCreate,
  } = props;
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { currentProjectId } = useProject();
  const { threads } = data;
  const { dashboards } = data;
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const { treeSelectedKeys, setTreeSelectedKeys } = useSidebarTreeState();
  const {
    treeSelectedKeys: dashboardSelectedKeys,
    setTreeSelectedKeys: setDashboardSelectedKeys,
  } = useSidebarTreeState();

  useEffect(() => {
    params?.id && setTreeSelectedKeys([params.id] as string[]);
  }, [params?.id]);

  useEffect(() => {
    const dashboardId = router.query?.dashboardId as string;
    if (dashboardId) {
      setDashboardSelectedKeys([`dashboard-${dashboardId}`]);
      // deselect threads when dashboard is selected
      setTreeSelectedKeys([]);
    }
  }, [router.query?.dashboardId]);

  const onDeleteThread = async (threadId: string) => {
    try {
      await onDelete(threadId);
      if (params?.id == threadId) {
        router.push(bp(Path.Home));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onTreeSelect = (selectedKeys: React.Key[], _info: any) => {
    // prevent deselected
    if (selectedKeys.length === 0) return;

    setTreeSelectedKeys(selectedKeys);
    setDashboardSelectedKeys([]);
    onSelect(selectedKeys);
  };

  const onDashboardTreeSelect = (selectedKeys: React.Key[], _info: any) => {
    if (selectedKeys.length === 0) return;

    setDashboardSelectedKeys(selectedKeys);
    setTreeSelectedKeys([]);
    // Extract the actual dashboard id from the key (format: "dashboard-{id}")
    const dashboardIds = selectedKeys.map((key) =>
      String(key).replace('dashboard-', ''),
    );
    onDashboardSelect(dashboardIds as string[]);
  };

  return (
    <>
      <DashboardTree
        dashboards={dashboards}
        selectedKeys={dashboardSelectedKeys}
        onSelect={onDashboardTreeSelect}
        onRename={onDashboardRename}
        onDeleteDashboard={onDashboardDelete}
        onCreateDashboard={onDashboardCreate}
      />
      <ThreadTree
        threads={threads}
        selectedKeys={treeSelectedKeys}
        onSelect={onTreeSelect}
        onRename={onRename}
        onDeleteThread={onDeleteThread}
      />
    </>
  );
}
