import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';

export default function SettingsIndex() {
  const router = useRouter();
  const { currentProjectId } = useProject();

  useEffect(() => {
    if (currentProjectId) {
      router.replace(buildPath(Path.SettingsGeneral, currentProjectId));
    }
  }, [router, currentProjectId]);

  return null;
}
