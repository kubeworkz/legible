import Image from 'next/image';
import Link from 'next/link';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';

export default function LogoBar() {
  const { currentProjectId } = useProject();
  const homePath = currentProjectId
    ? buildPath(Path.Home, currentProjectId)
    : '/';

  return (
    <Link href={homePath} style={{ display: 'inline-flex' }}>
      <Image
        src="/images/logo-white-with-text.svg"
        alt="Wren AI"
        width={125}
        height={30}
      />
    </Link>
  );
}
