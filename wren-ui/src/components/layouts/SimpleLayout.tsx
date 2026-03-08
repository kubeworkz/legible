import { Layout } from 'antd';
import HeaderBar from '@/components/HeaderBar';
import PageLoading from '@/components/PageLoading';
import { useWithOnboarding } from '@/hooks/useCheckOnboarding';
import useRouteGuard from '@/hooks/useRouteGuard';
import clsx from 'clsx';

const { Content } = Layout;

interface Props {
  children: React.ReactNode;
  loading?: boolean;
}

export default function SimpleLayout(props: Props) {
  const { loading: fetching } = useWithOnboarding();
  useRouteGuard();
  const { children, loading } = props;
  const pageLoading = fetching || loading;
  return (
    <Layout
      className={clsx('adm-main bg-gray-3', {
        'overflow-hidden': pageLoading,
      })}
    >
      <HeaderBar />
      <Content className="adm-content">{children}</Content>
      <PageLoading visible={pageLoading} />
    </Layout>
  );
}
