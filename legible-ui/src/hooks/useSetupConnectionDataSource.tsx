import { useRouter } from 'next/router';
import { useState, useCallback } from 'react';
import {
  Path,
  buildPath,
  REDSHIFT_AUTH_METHOD,
  DATABRICKS_AUTH_METHOD,
} from '@/utils/enum';
import { useSaveDataSourceMutation } from '@/apollo/client/graphql/dataSource.generated';
import { DataSourceName } from '@/apollo/client/graphql/__types__';
import { getStoredProjectId } from '@/hooks/useProject';

const PASSWORD_PLACEHOLDER = '************';

/**
 * Helper to persist the project ID for the newly created project.
 * This ensures subsequent GraphQL calls (saveTables, saveRelations, deploy)
 * use the correct X-Project-Id header.
 */
function switchToProject(projectId: number | null | undefined) {
  if (projectId && typeof window !== 'undefined') {
    localStorage.setItem('wren-current-project-id', String(projectId));
  }
}

export default function useSetupConnectionDataSource() {
  const router = useRouter();
  const [selected, setSelected] = useState<DataSourceName>();

  const [saveDataSourceMutation, { loading, error }] =
    useSaveDataSourceMutation({
      onError: (error) => console.error(error),
      onCompleted: (data) => {
        // Switch to the newly created project so the rest of onboarding
        // operates against it
        const projectId = data?.saveDataSource?.projectId;
        switchToProject(projectId);
        // Navigate using the newly created project's ID
        const targetProjectId = projectId || getStoredProjectId() || 0;
        router.push(buildPath(Path.OnboardingModels, targetProjectId));
      },
    });

  const selectDataSourceNext = useCallback(
    (payload: { dataSource: DataSourceName; dispatch?: () => void }) => {
      setSelected(payload.dataSource);
      payload?.dispatch?.();
    },
    [router],
  );

  const saveDataSource = useCallback(
    async (properties?: Record<string, any>) => {
      await saveDataSourceMutation({
        variables: {
          data: {
            type: selected,
            properties: transformFormToProperties(properties, selected),
          },
        },
      });
    },
    [selected, saveDataSourceMutation],
  );

  const completedDataSourceSave = useCallback(async () => {
    const targetProjectId = getStoredProjectId() || 0;
    router.push(buildPath(Path.OnboardingModels, targetProjectId));
  }, [selected, router]);

  return {
    loading,
    error,
    selected,
    saveDataSource,
    selectDataSourceNext,
    completedDataSourceSave,
    reset: () => setSelected(undefined),
  };
}

export const transformFormToProperties = (
  properties: Record<string, any>,
  dataSourceType: DataSourceName,
) => {
  if (dataSourceType === DataSourceName.DUCKDB) {
    const configurations = properties.configurations.reduce((acc, cur) => {
      if (cur.key && cur.value) {
        acc[cur.key] = cur.value;
      }

      return acc;
    }, {});

    return {
      ...properties,
      configurations,
      extensions: properties.extensions.filter((i) => i),
    };
  } else if (dataSourceType === DataSourceName.SNOWFLAKE) {
    return {
      ...properties,
      ...getSnowflakeAuthentication(properties),
    };
  } else if (dataSourceType === DataSourceName.DATABRICKS) {
    return {
      ...properties,
      ...getDatabricksAuthentication(properties),
    };
  } else if (dataSourceType === DataSourceName.ATHENA) {
    return {
      ...properties,
      ...getAthenaAuthentication(properties),
    };
  }

  return {
    ...properties,
    // remove password placeholder if user doesn't change the password
    password:
      properties?.password === PASSWORD_PLACEHOLDER
        ? undefined
        : properties?.password,

    awsSecretKey:
      properties?.awsSecretKey === PASSWORD_PLACEHOLDER
        ? undefined
        : properties?.awsSecretKey,
  };
};

export const transformPropertiesToForm = (
  properties: Record<string, any>,
  dataSourceType: DataSourceName,
) => {
  if (dataSourceType === DataSourceName.BIG_QUERY) {
  } else if (dataSourceType === DataSourceName.DUCKDB) {
    const configurations = Object.entries(properties?.configurations || {}).map(
      ([key, value]) => ({ key, value }),
    );
    const extensions = properties?.extensions || [];
    return {
      ...properties,
      // If there are no configurations or extensions, add an empty one, or the form properties will break
      configurations: configurations.length
        ? configurations
        : [{ key: '', value: '' }],
      extensions: extensions.length ? extensions : [''],
    };
  } else if (dataSourceType === DataSourceName.REDSHIFT) {
    return {
      ...properties,
      ...(properties?.redshiftType === REDSHIFT_AUTH_METHOD.redshift
        ? {
            password: properties?.password || PASSWORD_PLACEHOLDER,
          }
        : {
            awsSecretKey: properties?.awsSecretKey || PASSWORD_PLACEHOLDER,
          }),
    };
  } else if (dataSourceType === DataSourceName.DATABRICKS) {
    return {
      ...properties,
      ...(properties?.databricksType ===
      DATABRICKS_AUTH_METHOD.service_principal
        ? {
            clientSecret: properties?.clientSecret || PASSWORD_PLACEHOLDER,
          }
        : {
            accessToken: properties?.accessToken || PASSWORD_PLACEHOLDER,
          }),
    };
  }

  return {
    ...properties,
    // provide a password placeholder to UI
    password: properties?.password || PASSWORD_PLACEHOLDER,
    privateKey: properties?.privateKey || undefined,
  };
};

function getSnowflakeAuthentication(properties: Record<string, any>) {
  // Set password or private key to null if only one of them is provided
  if (properties?.privateKey) {
    return {
      privateKey: properties?.privateKey,
      password: null,
    };
  }
  if (properties?.password && properties?.password !== PASSWORD_PLACEHOLDER) {
    return {
      password: properties?.password,
      privateKey: null,
    };
  }
  return {};
}

function getDatabricksAuthentication(properties: Record<string, any>) {
  if (properties?.databricksType === DATABRICKS_AUTH_METHOD.service_principal) {
    return {
      clientSecret:
        properties?.clientSecret === PASSWORD_PLACEHOLDER
          ? undefined
          : properties?.clientSecret,
    };
  }

  return {
    accessToken:
      properties?.accessToken === PASSWORD_PLACEHOLDER
        ? undefined
        : properties?.accessToken,
  };
}

function getAthenaAuthentication(properties: Record<string, any>) {
  if (properties?.webIdentityToken) {
    return {
      webIdentityToken:
        properties?.webIdentityToken === PASSWORD_PLACEHOLDER
          ? undefined
          : properties?.webIdentityToken,
    };
  }

  return {
    awsSecretKey:
      properties?.awsSecretKey === PASSWORD_PLACEHOLDER
        ? undefined
        : properties?.awsSecretKey,
  };
}
