import type { ThemeConfig } from 'antd';

/**
 * Antd v5 theme configuration.
 * Replaces the old antd-variables.less / Less variable overrides.
 */
export const admTheme: ThemeConfig = {
  token: {
    // Primary color
    colorPrimary: '#2f54eb', // @geekblue-6

    // Text colors
    colorText: '#262626', // @gray-10
    colorTextHeading: '#434343', // @gray-9

    // Semantic colors
    colorSuccess: '#52c41a', // @green-6
    colorWarning: '#faad14', // @gold-6
    colorError: '#ff4d4f', // @red-5

    // Disabled
    colorTextDisabled: 'rgba(0, 0, 0, 0.25)',

    // Border radius
    borderRadius: 4,

    // Font
    fontWeightStrong: 700, // @typography-title-font-weight

    // Layout
    // Note: v5 uses colorBgLayout instead of @layout-body-background
    colorBgLayout: '#fff',
  },
  components: {
    Layout: {
      headerBg: '#fff',
      headerHeight: 48,
      headerPadding: '0 16px',
      bodyBg: '#fff',
    },
    Table: {
      cellPaddingBlock: 12, // @table-padding-vertical
      headerSplitColor: 'transparent', // @table-header-cell-split-color
    },
    Card: {
      colorBgContainer: '#fff',
    },
    Breadcrumb: {
      lastItemColor: '#262626', // @text-color
    },
    Tooltip: {
      colorBgSpotlight: '#262626', // @gray-10
    },
    Typography: {
      fontWeightStrong: 700,
    },
  },
};
