import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';

export default function RowLevelSecurity() {
  return (
    <SiderLayout>
      <PageLayout title="Row-level Security">
        <p>Configure row-level security policies for your data models.</p>
      </PageLayout>
    </SiderLayout>
  );
}
