import dynamic from 'next/dynamic';

/**
 * Dynamically imported UniverSheet component.
 * Univer uses a canvas-based rendering engine that requires browser APIs,
 * so we must disable SSR for this component.
 */
const UniverSheetDynamic = dynamic(
  () => import('@/components/spreadsheet/UniverSheet'),
  { ssr: false },
);

export default UniverSheetDynamic;
