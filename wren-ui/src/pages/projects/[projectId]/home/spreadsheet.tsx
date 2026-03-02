import { useEffect } from 'react';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useRouter } from 'next/router';
import SiderLayout from '@/components/layouts/SiderLayout';
import useHomeSidebar from '@/hooks/useHomeSidebar';
import { useSpreadsheetsQuery } from '@/apollo/client/graphql/spreadsheet.generated';

export default function SpreadsheetIndex() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const homeSidebar = useHomeSidebar();

  // Redirect to first spreadsheet detail page when data is available
  const { data: spreadsheetsData } = useSpreadsheetsQuery({
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const sheets = spreadsheetsData?.spreadsheets || [];
    if (sheets.length > 0) {
      const firstId = sheets[0].id;
      router.replace(
        buildPath(Path.HomeSpreadsheetDetail, currentProjectId).replace(
          '[spreadsheetId]',
          String(firstId),
        ),
      );
    }
  }, [spreadsheetsData?.spreadsheets]);

  return (
    <SiderLayout loading={false} sidebar={homeSidebar}>
      <div
        className="d-flex align-center justify-center flex-column"
        style={{ height: '100%' }}
      >
        <div className="text-md text-medium gray-7">
          No spreadsheets yet. Create one from the sidebar.
        </div>
      </div>
    </SiderLayout>
  );
}
