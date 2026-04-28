import { merge } from 'lodash';
import { IconComponentProps } from '@/import/icon';
import ShoppingCartOutlined from '@ant-design/icons/ShoppingCartOutlined';
import IdCardOutlined from '@ant-design/icons/IdcardOutlined';
import CreditCardOutlined from '@ant-design/icons/CreditCardOutlined';
import StarOutlined from '@ant-design/icons/StarOutlined';
import NodeIndexOutlined from '@ant-design/icons/NodeIndexOutlined';
import StockOutlined from '@ant-design/icons/StockOutlined';
import { SETUP, DATA_SOURCES } from '@/utils/enum';
import Starter from './Starter';
import ConnectDataSource from './ConnectDataSource';
import SelectModels from './SelectModels';
import DefineRelations from './DefineRelations';
import { SampleDatasetName } from '@/apollo/client/graphql/__types__';
import { ERROR_CODES } from '@/utils/errorHandler';
import { DOC_LINKS } from '@/utils/docLinks';
import {
  getDataSourceConfig,
  getDataSourceFormComponent,
} from '@/utils/dataSourceType';

type SetupStep = {
  step: number;
  component: (
    props?: React.ComponentProps<typeof Starter> &
      React.ComponentProps<typeof ConnectDataSource> &
      React.ComponentProps<typeof SelectModels> &
      React.ComponentProps<typeof DefineRelations>,
  ) => JSX.Element;
  maxWidth?: number;
};

export type ButtonOption = {
  label: string;
  logo?: string;
  IconComponent?: IconComponentProps['component'];
  guide?: string;
  disabled?: boolean;
  submitting?: boolean;
  value?: string;
};

export const SETUP_STEPS = {
  [SETUP.STARTER]: {
    step: 0,
    component: Starter,
  },
  [SETUP.CREATE_DATA_SOURCE]: {
    step: 0,
    component: ConnectDataSource,
    maxWidth: 960,
  },
  [SETUP.SELECT_MODELS]: {
    step: 1,
    component: SelectModels,
    maxWidth: 960,
  },
  [SETUP.DEFINE_RELATIONS]: {
    step: 2,
    component: DefineRelations,
  },
} as { [key: string]: SetupStep };

export const DATA_SOURCE_OPTIONS = {
  [DATA_SOURCES.BIG_QUERY]: {
    ...getDataSourceConfig(DATA_SOURCES.BIG_QUERY),
    guide: DOC_LINKS.connectBigQuery,
    disabled: false,
  },
  [DATA_SOURCES.DUCKDB]: {
    ...getDataSourceConfig(DATA_SOURCES.DUCKDB),
    guide: DOC_LINKS.connectDuckDB,
    disabled: false,
  },
  [DATA_SOURCES.POSTGRES]: {
    ...getDataSourceConfig(DATA_SOURCES.POSTGRES),
    guide: DOC_LINKS.connectPostgres,
    disabled: false,
  },
  [DATA_SOURCES.MYSQL]: {
    ...getDataSourceConfig(DATA_SOURCES.MYSQL),
    guide: DOC_LINKS.connectMySQL,
    disabled: false,
  },
  [DATA_SOURCES.ORACLE]: {
    ...getDataSourceConfig(DATA_SOURCES.ORACLE),
    guide: DOC_LINKS.connectOracle,
    disabled: false,
  },
  [DATA_SOURCES.MSSQL]: {
    ...getDataSourceConfig(DATA_SOURCES.MSSQL),
    guide: DOC_LINKS.connectSQLServer,
    disabled: false,
  },
  [DATA_SOURCES.CLICK_HOUSE]: {
    ...getDataSourceConfig(DATA_SOURCES.CLICK_HOUSE),
    guide: DOC_LINKS.connectClickHouse,
    disabled: false,
  },
  [DATA_SOURCES.TRINO]: {
    ...getDataSourceConfig(DATA_SOURCES.TRINO),
    guide: DOC_LINKS.connectTrino,
    disabled: false,
  },
  [DATA_SOURCES.SNOWFLAKE]: {
    ...getDataSourceConfig(DATA_SOURCES.SNOWFLAKE),
    guide: DOC_LINKS.connectSnowflake,
    disabled: false,
  },
  [DATA_SOURCES.ATHENA]: {
    ...getDataSourceConfig(DATA_SOURCES.ATHENA),
    guide: DOC_LINKS.connectAthena,
    disabled: false,
  },
  [DATA_SOURCES.REDSHIFT]: {
    ...getDataSourceConfig(DATA_SOURCES.REDSHIFT),
    guide: DOC_LINKS.connectRedshift,
    disabled: false,
  },
  [DATA_SOURCES.DATABRICKS]: {
    ...getDataSourceConfig(DATA_SOURCES.DATABRICKS),
    guide: DOC_LINKS.connectDatabricks,
    disabled: false,
  },
} as { [key: string]: ButtonOption };

export const TEMPLATE_OPTIONS = {
  [SampleDatasetName.ECOMMERCE]: {
    label: 'E-commerce',
    IconComponent: ShoppingCartOutlined,
    guide: DOC_LINKS.sampleEcommerce,
  },
  [SampleDatasetName.HR]: {
    label: 'Human Resource',
    IconComponent: IdCardOutlined,
    guide: DOC_LINKS.sampleHR,
  },
  [SampleDatasetName.CARD_TRANSACTION]: {
    label: 'Card Transaction',
    IconComponent: CreditCardOutlined,
    guide: DOC_LINKS.sampleCardTransaction,
  },
  [SampleDatasetName.HOTEL_RATING]: {
    label: 'Hotel Rating',
    IconComponent: StarOutlined,
    guide: 'https://www.kaggle.com/datasets/alperenmyung/international-hotel-booking-analytics',
  },
  [SampleDatasetName.SUPPLY_CHAIN]: {
    label: 'Supply Chain',
    IconComponent: NodeIndexOutlined,
    guide: 'https://www.kaggle.com/datasets/harshsingh2209/supply-chain-analysis',
  },
  [SampleDatasetName.RETAIL_BROKER]: {
    label: 'Retail Broker',
    IconComponent: StockOutlined,
    guide: 'https://docs.legiblequery.ai',
  },
};

export const getDataSources = () => {
  return Object.values(DATA_SOURCE_OPTIONS) as ButtonOption[];
};

export const getDataSource = (dataSource: DATA_SOURCES) => {
  return merge(
    DATA_SOURCE_OPTIONS[dataSource],
    getDataSourceFormComponent(dataSource),
  );
};

export const getTemplates = () => {
  return Object.keys(TEMPLATE_OPTIONS).map((key) => ({
    ...TEMPLATE_OPTIONS[key],
    value: key,
  })) as ButtonOption[];
};

export const getPostgresErrorMessage = (error: Record<string, any>) => {
  if (error.code === ERROR_CODES.CONNECTION_REFUSED) {
    return (
      <div>
        {error.message}. <br />
        If you are having trouble connecting to your PostgreSQL database, please
        refer to our{' '}
        <a
          href={DOC_LINKS.connectPostgresTroubleshoot}
          target="_blank"
          rel="noopener noreferrer"
        >
          documentation
        </a>{' '}
        for detailed instructions.
      </div>
    );
  }
  return error.message;
};
