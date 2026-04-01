# Univer.ai Integration Plan

## 1. Feasibility Assessment

### Verdict: **YES — Feasible and Already Prototyped**

Univer.ai can be integrated into our WrenAI application as a replacement for the Ant Design Table-based `SpreadsheetGrid` component. A working prototype has been built and verified.

### Key Findings

| Dimension | Status | Notes |
|-----------|--------|-------|
| **React Compatibility** | ✅ | Officially supports React 18 (our version). Uses `useEffect` + `useRef` pattern. |
| **Next.js Compatibility** | ✅ | Official Next.js example exists. Requires `dynamic()` with `{ ssr: false }` since Univer uses canvas rendering. |
| **License** | ✅ | Apache-2.0 for core. Some advanced features (charts, collaboration, XLSX import/export) have separate non-OSS licenses (free for commercial use, paid upgrade available). |
| **Data Loading** | ✅ | `IWorkbookData` snapshot format maps directly to our `PreviewDataResponse` (`{ columns, data }` → `{ cellData: { row: { col: { v } } } }`). |
| **Bundle Size** | ⚠️ | `@univerjs/presets` + `@univerjs/preset-sheets-core` add ~162MB to node_modules (7.9MB unpacked per package). Dynamic import ensures it's only loaded when needed. |
| **Build System** | ✅ | Works with Next.js 16 + webpack. Packages use `exports` field (supported by webpack 5). |
| **Peer Dependencies** | ✅ | Requires `rxjs` (already installed). React 18 is supported. |
| **Ant Design Coexistence** | ✅ | Univer renders inside its own canvas/container. CSS is scoped via its own prefix (`univer-*`). No conflicts observed. |
| **styled-components Coexistence** | ✅ | Univer uses its own CSS files. No interference. |

---

## 2. Architecture Overview

### How Univer Works

```
createUniver({
  locale, locales, presets: [UniverSheetsCorePreset({ container })]
})
  → returns { univer, univerAPI (FUniver Facade API) }
    → univerAPI.createWorkbook(IWorkbookData)
      → Canvas renders spreadsheet inside container div
```

### Our Integration Pattern

```
SQL Query Result (GraphQL)
  → PreviewDataResponse { columns: ColumnMeta[], data: any[][] }
    → buildCellData() transforms to IWorkbookData.sheets.sheet1.cellData
      → Univer renders in canvas
```

### Component Hierarchy

```
SpreadsheetDetail page
  ├── SpreadsheetSqlEditor (Ace editor — unchanged)
  └── GridArea
      └── UniverSheetDynamic (next/dynamic, ssr: false)
            └── UniverSheet
                  ├── Error state → Alert
                  ├── Empty state → Empty
                  ├── Loading state → Spin
                  └── Data state → createUniver() + canvas rendering
```

---

## 3. What Has Been Built (Foundation)

### New Files

| File | Purpose |
|------|---------|
| `src/components/spreadsheet/UniverSheet.tsx` | Core Univer integration component. Converts `PreviewDataResponse` to `IWorkbookData`, manages Univer lifecycle. |
| `src/components/spreadsheet/UniverSheetDynamic.tsx` | Dynamic import wrapper with `{ ssr: false }` for Next.js compatibility. |

### Modified Files

| File | Change |
|------|--------|
| `[spreadsheetId].tsx` | Swapped `SpreadsheetGrid` → `UniverSheetDynamic` |
| `package.json` | Added `@univerjs/presets`, `@univerjs/preset-sheets-core`, `rxjs` |

### Key Design Decisions

1. **Preset Mode** (not Plugin Mode): Uses `@univerjs/preset-sheets-core` for simpler setup. Includes formulas, filtering, sorting, number formatting out of the box.
2. **Dynamic Import**: `next/dynamic` with `{ ssr: false }` because Univer's canvas engine requires browser APIs.
3. **Full Re-creation on Data Change**: When data changes, the Univer instance is disposed and re-created. This is the simplest correct approach for read-only query results.
4. **Header Row in Data**: Column headers are rendered as row 0 with bold styling, frozen so they stay visible during scroll.

---

## 4. What Remains (Implementation Roadmap)

### Phase 1: UI Polish (Current Sprint)

- [ ] **Hide unwanted Univer UI elements**: Toolbar, formula bar, sheet tabs. Currently using CSS overrides — may need `UniverSheetsCorePreset` config options instead.
- [ ] **Column width auto-sizing**: Currently using character-count heuristic. Univer supports auto-fit.
- [ ] **Read-only mode**: Set cells/worksheet to read-only since this is just a preview.
- [ ] **Theme integration**: Match Univer's colors to our app's design tokens (gray-2, geekblue-1, etc.).
- [ ] **Testing**: Verify on different data sizes (0 rows, 1 row, 500 rows, wide tables with 50+ columns).

### Phase 2: Enhanced Features

- [ ] **Cell formatting by type**: Apply number formats based on column metadata (`type` field from `ColumnMetadata`).
- [ ] **Copy/paste support**: Univer supports clipboard natively — verify it works.
- [ ] **Context menu customization**: Add custom right-click options (copy cell, copy column, etc.).
- [ ] **Keyboard navigation**: Verify arrow keys, Tab, etc. work within the spreadsheet.
- [ ] **Performance optimization**: For large datasets, consider virtual scrolling (Univer supports this natively via canvas).

### Phase 3: Advanced Capabilities

- [ ] **Editable mode**: Allow users to edit cells and save changes back.
- [ ] **Formula support**: Let users add calculated columns with formulas.
- [ ] **Conditional formatting**: Highlight cells based on rules.
- [ ] **Export**: CSV/XLSX export using Univer's export features (may need Pro license for XLSX).
- [ ] **Filter/Sort UI**: Leverage Univer's built-in filter and sort overlays.

### Phase 4: State Persistence

- [ ] **Save workbook state**: Persist `IWorkbookData` snapshots (column widths, formatting, filters) to the database alongside the spreadsheet record.
- [ ] **Column mapping**: Store column-to-Univer mapping so formatting is preserved across sessions.

---

## 5. Configuration Reference

### Preset Mode Setup (what we use)

```typescript
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import '@univerjs/preset-sheets-core/lib/index.css';

const { univerAPI } = createUniver({
  locale: LocaleType.EN_US,
  locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
  presets: [UniverSheetsCorePreset({ container: domElement })],
});

univerAPI.createWorkbook(workbookData);
```

### IWorkbookData Format (how our data maps)

```typescript
// Our data:  { columns: [{ name, type }], data: [[val, val], ...] }
// Mapped to:
{
  id: 'spreadsheet-preview',
  sheetOrder: ['sheet1'],
  sheets: {
    sheet1: {
      cellData: {
        0: { 0: { v: 'col_name', s: { bl: 1 } }, ... }, // header row
        1: { 0: { v: 'data_val' }, ... },                // data rows
      },
      columnData: { 0: { w: 120 }, ... }, // column widths
      freeze: { startRow: 1, ySplit: 1 }, // freeze header
    }
  }
}
```

### Lifecycle Management

```typescript
// In useEffect:
const { univerAPI } = createUniver({ ... });
univerAPI.createWorkbook(data);

// Cleanup:
return () => univerAPI.dispose();
```

---

## 6. Bundle Size Considerations

| Package | Unpacked Size |
|---------|--------------|
| `@univerjs/presets` | 7.9 MB |
| `@univerjs/preset-sheets-core` | 7.9 MB |
| `rxjs` | 4.2 MB |
| **Total node_modules addition** | ~162 MB (compressed) |

**Mitigation**: The `next/dynamic` import with `ssr: false` ensures Univer is code-split into a separate chunk. It's only loaded when a user navigates to a spreadsheet detail page. Users who don't use spreadsheets never download it.

For further optimization, consider tree-shaking by switching to Plugin Mode (importing only needed plugins instead of the full preset).

---

## 7. Known Limitations & Risks

1. **No XLSX export in OSS**: XLSX import/export requires non-OSS version (free for commercial, paid upgrade).
2. **Canvas rendering**: Cannot be server-side rendered. Content is not accessible to search engines or screen readers without additional work.
3. **Large datasets**: While Univer handles large datasets well via canvas virtualization, converting 10K+ rows in `buildCellData()` may need optimization.
4. **Version churn**: Univer is actively developed (v0.16.0). API may change between minor versions.
5. **React version**: Univer's view layer is built on React 18.3.1. We're on 18.2.0 — close enough, but worth monitoring.

---

## 8. Files Reference

```
src/components/spreadsheet/
├── SpreadsheetGrid.tsx           # Original Ant Design Table (kept as fallback)
├── SpreadsheetSqlEditor.tsx      # SQL editor (unchanged)
├── UniverSheet.tsx               # NEW: Core Univer integration
└── UniverSheetDynamic.tsx        # NEW: Dynamic import wrapper (ssr: false)
```
