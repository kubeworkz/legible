/**
 * Mock Connector Tests
 *
 * Tests all 12 data source connector forms using Playwright route
 * interception. No real database backends are required — GraphQL
 * responses are mocked so each test exercises:
 *
 *  1. Navigating to the connection setup page
 *  2. Selecting the data source type
 *  3. Filling every form field with valid test data
 *  4. Submitting the form
 *  5. Verifying navigation to the model selection page
 *
 * Run with:
 *   npx playwright test e2e/specs/mockConnectors.spec.ts
 */
import { test, expect, Page } from '@playwright/test';
import * as helper from '../helper';
import {
  installGraphQLMocks,
  removeGraphQLMocks,
} from '../mockData/graphqlMocks';
import {
  CONNECTORS,
  ConnectorFormData,
  FormField,
} from '../mockData/connectorFixtures';

const MOCK_PROJECT_ID = 99;

/**
 * Fill a single form field based on its action type.
 */
async function fillField(page: Page, field: FormField) {
  switch (field.action) {
    case 'upload': {
      // BigQuery credentials — create a temp JSON file and upload
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByText('Click or drag credential').click();
      const fileChooser = await fileChooserPromise;
      // Create a minimal valid GCP service account JSON
      const credentialJson = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'key123',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJBALRiMgHm\n-----END RSA PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: '123456789',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      });
      await fileChooser.setFiles({
        name: 'credentials.json',
        mimeType: 'application/json',
        buffer: Buffer.from(credentialJson),
      });
      break;
    }
    case 'check':
      await page.getByLabel(field.label).check();
      break;
    case 'radio':
      await page.getByText(field.value).click();
      break;
    case 'skip':
      break;
    case 'fill':
    default:
      await page.getByLabel(field.label).click();
      await page.getByLabel(field.label).fill(field.value);
      break;
  }
}

/**
 * Fill all fields for a connector form.
 */
async function fillConnectorForm(page: Page, connector: ConnectorFormData) {
  for (const field of connector.fields) {
    await fillField(page, field);
  }
}

// ── Test suite ───────────────────────────────────────────────────────────────

test.describe('Mock Connector Tests — All 12 Data Sources', () => {
  test.beforeAll(async () => {
    await helper.resetDatabase();
  });

  for (const connector of CONNECTORS) {
    test(`${connector.buttonLabel}: form renders and submits successfully`, async ({
      page,
    }) => {
      // Reset DB state for each connector so they're independent
      await helper.resetDatabase();

      // Install GraphQL mocks before navigating
      await installGraphQLMocks(page, { projectId: MOCK_PROJECT_ID });

      // 1. Navigate to the connection setup page
      //    We need a valid project context first — use project 99
      await page.goto('/setup/connection');

      // 2. Select data source
      await page
        .locator('button')
        .filter({ hasText: connector.buttonLabel })
        .click();

      // 3. Verify the form appeared (Display name field is common to all)
      await expect(page.getByLabel('Display name')).toBeVisible({
        timeout: 5000,
      });

      // 4. Fill form fields
      await fillConnectorForm(page, connector);

      // 5. Click Next / Submit
      await page.getByRole('button', { name: 'Next' }).click();

      // 6. Verify navigation to model selection
      //    The app navigates to /projects/{projectId}/setup/models
      await expect(page).toHaveURL(/\/setup\/models/, { timeout: 30000 });

      // Cleanup mocks
      await removeGraphQLMocks(page);
    });
  }
});

// ── Individual detailed tests for complex connectors ─────────────────────────

test.describe('Mock Connector — BigQuery (file upload)', () => {
  test.beforeAll(async () => {
    await helper.resetDatabase();
  });

  test('BigQuery credential upload renders and validates', async ({ page }) => {
    await installGraphQLMocks(page, { projectId: MOCK_PROJECT_ID });
    await page.goto('/setup/connection');

    await page.locator('button').filter({ hasText: 'BigQuery' }).click();
    await expect(page.getByLabel('Display name')).toBeVisible();

    // Fill text fields
    await page.getByLabel('Display name').fill('test-bigquery');
    await page.getByLabel('Project ID').fill('my-gcp-project');
    await page.getByLabel('Dataset ID').fill('my_dataset');

    // Upload credential file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Click or drag credential').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'credentials.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          type: 'service_account',
          project_id: 'test-project',
          private_key_id: 'key123',
          private_key: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n',
          client_email: 'test@test-project.iam.gserviceaccount.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
        }),
      ),
    });

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/setup\/models/, { timeout: 30000 });

    await removeGraphQLMocks(page);
  });
});

test.describe('Mock Connector — Snowflake (auth methods)', () => {
  test.beforeAll(async () => {
    await helper.resetDatabase();
  });

  test('Snowflake password authentication', async ({ page }) => {
    await installGraphQLMocks(page, { projectId: MOCK_PROJECT_ID });
    await page.goto('/setup/connection');

    await page.locator('button').filter({ hasText: 'Snowflake' }).click();
    await expect(page.getByLabel('Display name')).toBeVisible();

    await page.getByLabel('Display name').fill('test-snowflake-pw');
    await page.getByLabel('Account').fill('xy12345.us-east-1');
    await page.getByLabel('Database name').fill('TESTDB');
    await page.getByLabel('Schema').fill('PUBLIC');
    await page.getByLabel('Warehouse').fill('COMPUTE_WH');
    await page.getByLabel('User').fill('testuser');
    // Password auth is the default
    await page.getByLabel('Password').fill('testpass');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/setup\/models/, { timeout: 30000 });

    await removeGraphQLMocks(page);
  });
});

test.describe('Mock Connector — Athena (auth methods)', () => {
  test.beforeAll(async () => {
    await helper.resetDatabase();
  });

  test('Athena AWS credentials authentication', async ({ page }) => {
    await installGraphQLMocks(page, { projectId: MOCK_PROJECT_ID });
    await page.goto('/setup/connection');

    await page
      .locator('button')
      .filter({ hasText: 'Athena (Trino)' })
      .click();
    await expect(page.getByLabel('Display name')).toBeVisible();

    await page.getByLabel('Display name').fill('test-athena');
    await page.getByLabel('Database (schema)').fill('default');
    await page.getByLabel('S3 staging directory').fill('s3://bucket/staging/');
    await page.getByLabel('AWS region').fill('us-east-1');
    await page.getByLabel('AWS access key ID').fill('AKIAIOSFODNN7EXAMPLE');
    await page
      .getByLabel('AWS secret access key')
      .fill('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/setup\/models/, { timeout: 30000 });

    await removeGraphQLMocks(page);
  });
});

test.describe('Mock Connector — Redshift (auth methods)', () => {
  test.beforeAll(async () => {
    await helper.resetDatabase();
  });

  test('Redshift username/password authentication', async ({ page }) => {
    await installGraphQLMocks(page, { projectId: MOCK_PROJECT_ID });
    await page.goto('/setup/connection');

    await page.locator('button').filter({ hasText: 'Redshift' }).click();
    await expect(page.getByLabel('Display name')).toBeVisible();

    await page.getByLabel('Display name').fill('test-redshift');
    // Username/password is the default auth method
    await page
      .getByLabel('Host')
      .fill('my-cluster.abc123.us-east-1.redshift.amazonaws.com');
    await page.getByLabel('Port').fill('5439');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('testpass');
    await page.getByLabel('Database').fill('dev');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/setup\/models/, { timeout: 30000 });

    await removeGraphQLMocks(page);
  });
});

test.describe('Mock Connector — Databricks (auth methods)', () => {
  test.beforeAll(async () => {
    await helper.resetDatabase();
  });

  test('Databricks PAT authentication', async ({ page }) => {
    await installGraphQLMocks(page, { projectId: MOCK_PROJECT_ID });
    await page.goto('/setup/connection');

    await page.locator('button').filter({ hasText: 'Databricks' }).click();
    await expect(page.getByLabel('Display name')).toBeVisible();

    await page.getByLabel('Display name').fill('test-databricks');
    // PAT is the default auth method
    await page
      .getByLabel('Server hostname')
      .fill('adb-1234567890.12.azuredatabricks.net');
    await page.getByLabel('HTTP path').fill('/sql/1.0/warehouses/abcdef');
    await page.getByLabel('Access token').fill('dapi0123456789abcdef');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/setup\/models/, { timeout: 30000 });

    await removeGraphQLMocks(page);
  });
});
