/**
 * One-time seed script: insert dashboards + threads for the existing
 * Retail Broker project (id=6, public folder_id=12).
 *
 * Run inside the container:
 *   node /tmp/seed-retail-broker-content.js
 */
const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/db.sqlite3');

const PROJECT_ID = 6;
const FOLDER_ID = 12; // Public Folder

// ── helpers ────────────────────────────────────────────────────────────────

function insertDashboard(name) {
  const stmt = db.prepare(`
    INSERT INTO dashboard (project_id, name, folder_id, cache_enabled, schedule_frequency, sort_order)
    VALUES (?, ?, ?, 1, 'NEVER', 0)
  `);
  return stmt.run(PROJECT_ID, name, FOLDER_ID).lastInsertRowid;
}

function insertDashboardItem(dashboardId, displayName, type, sql, chartSchema, layout) {
  const detail = JSON.stringify({ sql, chartSchema: chartSchema || undefined });
  const stmt = db.prepare(`
    INSERT INTO dashboard_item (dashboard_id, type, display_name, detail, layout)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(dashboardId, type, displayName, detail, JSON.stringify(layout));
}

function insertThread(question, folderId) {
  const stmt = db.prepare(`
    INSERT INTO thread (project_id, summary, folder_id)
    VALUES (?, ?, ?)
  `);
  return stmt.run(PROJECT_ID, question, folderId).lastInsertRowid;
}

function insertThreadResponse(threadId, question, sql, answer, chartDetail) {
  const breakdownDetail = JSON.stringify({ queryId: '', status: 'FINISHED', description: '' });
  const answerDetail = JSON.stringify({
    status: 'FINISHED',
    content: answer || null,
    numRowsUsedInLLM: answer ? 1 : 0,
  });
  const chartDetailJson = chartDetail
    ? JSON.stringify({
        queryId: '',
        status: 'FINISHED',
        description: chartDetail.description,
        chartType: chartDetail.chartType,
        chartSchema: chartDetail.chartSchema,
      })
    : null;

  const stmt = db.prepare(`
    INSERT INTO thread_response (thread_id, question, sql, breakdown_detail, answer_detail, chart_detail)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(threadId, question, sql, breakdownDetail, answerDetail, chartDetailJson);
}

// ── seed dashboards ────────────────────────────────────────────────────────

console.log('Seeding dashboards...');

const dash1 = insertDashboard('What is the overall trading activity profile?');
insertDashboardItem(dash1, 'Total Active Trades', 'NUMBER',
  `SELECT COUNT(*) AS total_active_trades\nFROM "Trades"\nWHERE cancel_flag = '0'`,
  null, { x: 0, y: 0, w: 2, h: 2 });
insertDashboardItem(dash1, 'Total Net Trade Value (CAD, Millions)', 'NUMBER',
  `SELECT ROUND(SUM(net_amount) / 1000000.0, 2) AS total_net_amount_cad_millions\nFROM "Trades"\nWHERE cancel_flag = '0'\n  AND net_amount_funds = 'CDN'`,
  null, { x: 2, y: 0, w: 2, h: 2 });
insertDashboardItem(dash1, 'Buy vs. Sell Trade Split', 'PIE',
  `SELECT\n  CASE buy_sell WHEN '0' THEN 'Buy' WHEN '1' THEN 'Sell' ELSE buy_sell END AS direction,\n  COUNT(*) AS trade_count\nFROM "Trades"\nWHERE cancel_flag = '0'\nGROUP BY buy_sell\nORDER BY trade_count DESC`,
  { mark: { type: 'arc', tooltip: true, innerRadius: 50 }, encoding: { theta: { field: 'trade_count', type: 'quantitative' }, color: { field: 'direction', type: 'nominal', title: 'Direction' } } },
  { x: 0, y: 2, w: 3, h: 4 });
insertDashboardItem(dash1, 'Trade Count by Security Type', 'BAR',
  `SELECT\n  COALESCE(security_type, 'Unknown') AS security_type,\n  COUNT(*) AS trade_count\nFROM "Trades"\nWHERE cancel_flag = '0'\nGROUP BY security_type\nORDER BY trade_count DESC\nLIMIT 10`,
  { mark: { type: 'bar', tooltip: true }, encoding: { x: { field: 'security_type', type: 'nominal', title: 'Security Type', sort: '-y' }, y: { field: 'trade_count', type: 'quantitative', title: 'Trade Count' } } },
  { x: 3, y: 2, w: 3, h: 4 });
console.log(`  Dashboard 1 created (id=${dash1})`);

const dash2 = insertDashboard('How are client portfolios composed by asset class?');
insertDashboardItem(dash2, 'Total Accounts with Holdings', 'NUMBER',
  `SELECT COUNT(DISTINCT acctno) AS total_accounts\nFROM "AccountHoldings"`,
  null, { x: 0, y: 0, w: 2, h: 2 });
insertDashboardItem(dash2, 'Total Unique Securities Held', 'NUMBER',
  `SELECT COUNT(DISTINCT secnum) AS total_securities\nFROM "AccountHoldings"`,
  null, { x: 2, y: 0, w: 2, h: 2 });
insertDashboardItem(dash2, 'Portfolio Market Value by Asset Group', 'PIE',
  `SELECT\n  CASE\n    WHEN groupcode = 'EQ' THEN 'Equity'\n    WHEN groupcode = 'BD' THEN 'Fixed Income'\n    WHEN groupcode = 'CS' THEN 'Cash'\n    WHEN groupcode = 'MF' THEN 'Mutual Fund'\n    ELSE COALESCE(groupcode, 'Other')\n  END AS asset_class,\n  ROUND(SUM(NULLIF(mktvalue, '')::numeric), 2) AS total_market_value\nFROM "AccountHoldings"\nWHERE NULLIF(mktvalue, '') IS NOT NULL\nGROUP BY groupcode\nORDER BY total_market_value DESC NULLS LAST`,
  { mark: { type: 'arc', tooltip: true, innerRadius: 50 }, encoding: { theta: { field: 'total_market_value', type: 'quantitative' }, color: { field: 'asset_class', type: 'nominal', title: 'Asset Class' } } },
  { x: 0, y: 2, w: 3, h: 4 });
insertDashboardItem(dash2, 'Top 10 Accounts by Total Market Value', 'BAR',
  `SELECT\n  ap.accountno,\n  ap.accounttype,\n  ROUND(NULLIF(ahs.tdmktval, '')::numeric, 2) AS total_market_value\nFROM "AccountProfile" ap\nJOIN "AccountHoldingsSummary" ahs ON ahs.acctno = ap.accountno\nWHERE NULLIF(ahs.tdmktval, '') IS NOT NULL\nORDER BY total_market_value DESC NULLS LAST\nLIMIT 10`,
  { mark: { type: 'bar', tooltip: true }, encoding: { x: { field: 'accountno', type: 'nominal', title: 'Account', sort: '-y' }, y: { field: 'total_market_value', type: 'quantitative', title: 'Market Value' }, color: { field: 'accounttype', type: 'nominal', title: 'Account Type' } } },
  { x: 3, y: 2, w: 3, h: 4 });
console.log(`  Dashboard 2 created (id=${dash2})`);

const dash3 = insertDashboard('What is the client risk profile distribution?');
insertDashboardItem(dash3, 'High / Speculative Risk Client Count', 'NUMBER',
  `SELECT COUNT(DISTINCT clientno) AS high_risk_clients\nFROM "ClientProfile"\nWHERE risktolerance IN ('HIGH', 'SPEC')`,
  null, { x: 0, y: 0, w: 2, h: 2 });
insertDashboardItem(dash3, 'Total Clients', 'NUMBER',
  `SELECT COUNT(DISTINCT clientno) AS total_clients\nFROM "ClientProfile"`,
  null, { x: 2, y: 0, w: 2, h: 2 });
insertDashboardItem(dash3, 'Client Risk Tolerance Distribution', 'PIE',
  `SELECT\n  COALESCE(risktolerance, 'Unknown') AS risk_tolerance,\n  COUNT(*) AS client_count\nFROM "ClientProfile"\nGROUP BY risktolerance\nORDER BY client_count DESC`,
  { mark: { type: 'arc', tooltip: true, innerRadius: 50 }, encoding: { theta: { field: 'client_count', type: 'quantitative' }, color: { field: 'risk_tolerance', type: 'nominal', title: 'Risk Tolerance' } } },
  { x: 0, y: 2, w: 3, h: 4 });
insertDashboardItem(dash3, 'Average Portfolio Value by Risk Tolerance', 'BAR',
  `SELECT\n  COALESCE(cp.risktolerance, 'Unknown') AS risk_tolerance,\n  ROUND(AVG(NULLIF(ahs.tdmktval, '')::numeric), 2) AS avg_portfolio_value,\n  COUNT(DISTINCT cp.clientno) AS client_count\nFROM "ClientProfile" cp\nJOIN "AccountClientLink" acl ON acl.clientno = cp.clientno\nJOIN "AccountHoldingsSummary" ahs ON ahs.acctno = acl.accountno\nWHERE NULLIF(ahs.tdmktval, '') IS NOT NULL\nGROUP BY cp.risktolerance\nORDER BY avg_portfolio_value DESC NULLS LAST`,
  { mark: { type: 'bar', tooltip: true }, encoding: { x: { field: 'risk_tolerance', type: 'nominal', title: 'Risk Tolerance', sort: '-y' }, y: { field: 'avg_portfolio_value', type: 'quantitative', title: 'Avg Portfolio Value' } } },
  { x: 3, y: 2, w: 3, h: 4 });
console.log(`  Dashboard 3 created (id=${dash3})`);

// ── seed threads ───────────────────────────────────────────────────────────

console.log('Seeding threads...');

const t1 = insertThread('Which broker codes are driving the most trade activity?', FOLDER_ID);
insertThreadResponse(t1,
  'Which broker codes are driving the most trade activity?',
  `SELECT\n  broker_no,\n  COUNT(*) AS trade_count,\n  COUNT(CASE WHEN buy_sell = '0' THEN 1 END) AS buy_trades,\n  COUNT(CASE WHEN buy_sell = '1' THEN 1 END) AS sell_trades,\n  ROUND(SUM(CASE WHEN net_amount_funds = 'CDN' THEN net_amount ELSE 0 END)::numeric, 2) AS total_net_cad\nFROM "Trades"\nWHERE cancel_flag = '0'\nGROUP BY broker_no\nORDER BY trade_count DESC\nLIMIT 10`,
  'The top broker codes by trade count are shown below, including buy/sell breakdown and total net trade value in CAD.',
  {
    description: 'Top broker codes by trade volume with buy/sell breakdown',
    chartType: 'BAR',
    chartSchema: {
      mark: { type: 'bar', tooltip: true },
      encoding: {
        x: { field: 'broker_no', type: 'nominal', title: 'Broker Code', sort: '-y' },
        y: { field: 'trade_count', type: 'quantitative', title: 'Trade Count' },
      },
    },
  });
console.log(`  Thread 1 created (id=${t1})`);

const t2 = insertThread('What is the equity vs. fixed income breakdown across all account portfolios?', FOLDER_ID);
insertThreadResponse(t2,
  'What is the equity vs. fixed income breakdown across all account portfolios?',
  `SELECT\n  CASE\n    WHEN groupcode = 'EQ' THEN 'Equity'\n    WHEN groupcode = 'BD' THEN 'Fixed Income'\n    WHEN groupcode = 'CS' THEN 'Cash'\n    WHEN groupcode = 'MF' THEN 'Mutual Fund'\n    ELSE COALESCE(groupcode, 'Other')\n  END AS asset_class,\n  COUNT(DISTINCT acctno) AS accounts_with_position,\n  COUNT(*) AS total_positions,\n  ROUND(SUM(NULLIF(mktvalue, '')::numeric), 2) AS total_market_value\nFROM "AccountHoldings"\nWHERE NULLIF(mktvalue, '') IS NOT NULL\nGROUP BY groupcode\nORDER BY total_market_value DESC NULLS LAST`,
  'Across all accounts with holdings, the table below shows portfolio market value and position count by asset group, from equity and fixed income to cash and other categories.',
  {
    description: 'Portfolio market value by asset class',
    chartType: 'BAR',
    chartSchema: {
      mark: { type: 'bar', tooltip: true },
      encoding: {
        x: { field: 'asset_class', type: 'nominal', title: 'Asset Class', sort: '-y' },
        y: { field: 'total_market_value', type: 'quantitative', title: 'Total Market Value' },
        color: { field: 'asset_class', type: 'nominal', title: 'Asset Class' },
      },
    },
  });
console.log(`  Thread 2 created (id=${t2})`);

const t3 = insertThread('Which accounts show the highest concentration risk in a single security position?', FOLDER_ID);
insertThreadResponse(t3,
  'Which accounts show the highest concentration risk in a single security position?',
  `SELECT\n  ah.acctno,\n  ah.secnum AS security_number,\n  ah.secdesc AS security_description,\n  ah.groupcode AS asset_group,\n  ROUND(NULLIF(ah.mktvalue, '')::numeric, 2) AS position_value,\n  ROUND(NULLIF(ahs.tdmktval, '')::numeric, 2) AS total_portfolio_value,\n  ROUND(\n    NULLIF(ah.mktvalue, '')::numeric\n    / NULLIF(NULLIF(ahs.tdmktval, '')::numeric, 0) * 100\n  , 1) AS concentration_pct\nFROM "AccountHoldings" ah\nJOIN "AccountHoldingsSummary" ahs ON ahs.acctno = ah.acctno\nWHERE NULLIF(ah.mktvalue, '') IS NOT NULL\n  AND NULLIF(ahs.tdmktval, '') IS NOT NULL\n  AND NULLIF(ahs.tdmktval, '')::numeric > 0\nORDER BY concentration_pct DESC NULLS LAST\nLIMIT 20`,
  'The accounts below have the largest single-security positions as a percentage of their total portfolio market value, highlighting potential concentration risk.',
  {
    description: 'Top accounts by single-security concentration percentage',
    chartType: 'BAR',
    chartSchema: {
      mark: { type: 'bar', tooltip: true },
      encoding: {
        x: { field: 'acctno', type: 'nominal', title: 'Account', sort: '-y' },
        y: { field: 'concentration_pct', type: 'quantitative', title: 'Concentration (%)' },
        color: { field: 'asset_group', type: 'nominal', title: 'Asset Group' },
      },
    },
  });
console.log(`  Thread 3 created (id=${t3})`);

console.log('Done.');
db.close();
