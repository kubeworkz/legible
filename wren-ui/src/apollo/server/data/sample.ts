import { RelationType } from '../types';
import { SampleDatasetName } from './type';

export interface SampleDatasetColumn {
  name: string;
  properties?: Record<string, any>;
}

export interface SampleDatasetSchema {
  columnName: string;
  dataType: string;
}
export interface SampleDatasetTable {
  filePath: string;
  tableName: string;
  primaryKey?: string;
  // the column order in schema definition should be the same as the column in csv file
  schema?: SampleDatasetSchema[];
  columns?: SampleDatasetColumn[];
  properties?: Record<string, any>;
}

export interface SampleDatasetRelationship {
  fromModelName: string;
  fromColumnName: string;
  toModelName: string;
  toColumnName: string;
  type: RelationType;
  description?: string;
}
export interface SuggestedQuestion {
  question: string;
  label: string;
}

export interface SampleDataset {
  name: string; // SampleDatasetName
  tables: SampleDatasetTable[];
  questions?: SuggestedQuestion[];
  relations?: SampleDatasetRelationship[];
}

export const sampleDatasets: Record<string, SampleDataset> = {
  hr: {
    name: SampleDatasetName.HR,
    tables: [
      {
        tableName: 'salaries',
        filePath:
          'https://assets.getwren.ai/sample_data/employees/salaries.parquet',
        schema: [
          { columnName: 'emp_no', dataType: 'INTEGER' },
          { columnName: 'salary', dataType: 'INTEGER' },
          { columnName: 'from_date', dataType: 'DATE' },
          { columnName: 'to_date', dataType: 'DATE' },
        ],
        columns: [
          {
            name: 'emp_no',
            properties: {
              description: 'The employee number',
              displayName: 'emp_no',
            },
          },
          {
            name: 'salary',
            properties: {
              description: 'The salary of the employee.',
              displayName: 'salary',
            },
          },
          {
            name: 'from_date',
            properties: {
              description: 'The start date of the salary period.',
              displayName: 'from_date',
            },
          },
          {
            name: 'to_date',
            properties: {
              description: 'The end date of the salary period.',
              displayName: 'to_date',
            },
          },
        ],
        properties: {
          description:
            'Tracks the salary of employees, including the period during which each salary was valid.',
          displayName: 'salaries',
        },
      },
      {
        tableName: 'titles',
        filePath:
          'https://assets.getwren.ai/sample_data/employees/titles.parquet',
        schema: [
          { columnName: 'emp_no', dataType: 'INTEGER' },
          { columnName: 'title', dataType: 'VARCHAR' },
          { columnName: 'from_date', dataType: 'DATE' },
          { columnName: 'to_date', dataType: 'DATE' },
        ],
        columns: [
          {
            name: 'emp_no',
            properties: {
              description: 'The employee number',
              displayName: 'emp_no',
            },
          },
          {
            name: 'title',
            properties: {
              description:
                'The title or position held by the employee. Limited to a maximum of 50 characters.',
              displayName: 'title',
            },
          },
          {
            name: 'from_date',
            properties: {
              description: 'The start date when the employee held this title',
              displayName: 'from_date',
            },
          },
          {
            name: 'to_date',
            properties: {
              description:
                'The end date when the employee held this title. This can be NULL if the employee currently holds the title.',
              displayName: 'to_date',
            },
          },
        ],
        properties: {
          description:
            'Tracks the titles (positions) held by employees, including the period during which they held each title.',
          displayName: 'titles',
        },
      },
      {
        tableName: 'dept_emp',
        filePath:
          'https://assets.getwren.ai/sample_data/employees/dept_emp.parquet',
        schema: [
          { columnName: 'emp_no', dataType: 'INTEGER' },
          { columnName: 'dept_no', dataType: 'VARCHAR' },
          { columnName: 'from_date', dataType: 'DATE' },
          { columnName: 'to_date', dataType: 'DATE' },
        ],
        columns: [
          {
            name: 'emp_no',
            properties: {
              description: 'The employee number.',
              displayName: 'emp_no',
            },
          },
          {
            name: 'dept_no',
            properties: {
              description:
                'The department number the employee is associated with, referencing the dept_no in the departments table.',
              displayName: 'dept_no',
            },
          },
          {
            name: 'from_date',
            properties: {
              description:
                "The start date of the employee's association with the department.",
              displayName: 'from_date',
            },
          },
          {
            name: 'to_date',
            properties: {
              description:
                "The end date of the employee's association with the department",
              displayName: 'to_date',
            },
          },
        ],
        properties: {
          displayName: 'dept_emp',
        },
      },
      {
        tableName: 'departments',
        filePath:
          'https://assets.getwren.ai/sample_data/employees/departments.parquet',
        schema: [
          { columnName: 'dept_name', dataType: 'VARCHAR' },
          { columnName: 'dept_no', dataType: 'VARCHAR' },
        ],
        columns: [
          {
            name: 'dept_name',
            properties: {
              description:
                'The name of the department. Limited to a maximum of 40 characters. This column is also unique across the table, ensuring no two departments share the same name',
              displayName: 'dept_name',
            },
          },
          {
            name: 'dept_no',
            properties: {
              description:
                'A unique identifier for each department. It serves as the primary key of the table.',
              displayName: 'dept_no',
            },
          },
        ],
        properties: {
          displayName: 'departments',
        },
      },
      {
        tableName: 'employees',
        filePath:
          'https://assets.getwren.ai/sample_data/employees/employees.parquet',
        schema: [
          { columnName: 'birth_date', dataType: 'DATE' },
          { columnName: 'first_name', dataType: 'VARCHAR' },
          { columnName: 'last_name', dataType: 'VARCHAR' },
          { columnName: 'gender', dataType: 'VARCHAR' },
          { columnName: 'hire_date', dataType: 'DATE' },
          { columnName: 'emp_no', dataType: 'INTEGER' },
        ],
        columns: [
          {
            name: 'birth_date',
            properties: {
              description: 'The birth date of the employee.',
              displayName: 'birth_date',
            },
          },
          {
            name: 'first_name',
            properties: {
              description:
                'The first name of the employee. Limited to a maximum of 14 characters.',
              displayName: 'first_name',
            },
          },
          {
            name: 'last_name',
            properties: {
              description:
                'The last name of the employee. Limited to a maximum of 16 characters.',
              displayName: 'last_name',
            },
          },
          {
            name: 'gender',
            properties: {
              description:
                "The gender of the employee, with possible values 'M' (Male) or 'F' (Female).",
              displayName: 'gender',
            },
          },
          {
            name: 'hire_date',
            properties: {
              description: 'The date when the employee was hired.',
              displayName: 'hire_date',
            },
          },
          {
            name: 'emp_no',
            properties: {
              description:
                'A unique identifier for each employee. It serves as the primary key of the table',
              displayName: 'emp_no',
            },
          },
        ],
        properties: {
          description:
            'Stores basic information about employees such as their employee number, name, gender, birth date, and hire date',
          displayName: 'employees',
        },
      },
      {
        tableName: 'dept_manager',
        filePath:
          'https://assets.getwren.ai/sample_data/employees/dept_manager.parquet',
        schema: [
          { columnName: 'from_date', dataType: 'DATE' },
          { columnName: 'to_date', dataType: 'DATE' },
          { columnName: 'emp_no', dataType: 'INTEGER' },
          { columnName: 'dept_no', dataType: 'VARCHAR' },
        ],
        columns: [
          {
            name: 'from_date',
            properties: {
              description:
                'The start date of the employee’s managerial role in the department.',
              displayName: 'from_date',
            },
          },
          {
            name: 'to_date',
            properties: {
              description:
                'The end date of the employee’s managerial role in the department.',
              displayName: 'to_date',
            },
          },
          {
            name: 'emp_no',
            properties: {
              description: 'The employee number of the department manager',
              displayName: 'emp_no',
            },
          },
          {
            name: 'dept_no',
            properties: {
              description:
                'The department number that the manager is assigned to, referencing the dept_no in the departments table.',
              displayName: 'dept_no',
            },
          },
        ],
        properties: {
          description:
            'Tracks the assignment of managers to departments, including the period during which they managed a department',
          displayName: 'dept_manager',
        },
      },
    ],
    relations: [
      {
        fromModelName: 'employees',
        fromColumnName: 'emp_no',
        toModelName: 'titles',
        toColumnName: 'emp_no',
        type: RelationType.ONE_TO_MANY,
        description:
          'Each entry represents a title held by an employee during a specific time period.',
      },
      {
        fromModelName: 'departments',
        fromColumnName: 'dept_no',
        toModelName: 'dept_emp',
        toColumnName: 'dept_no',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'employees',
        fromColumnName: 'emp_no',
        toModelName: 'salaries',
        toColumnName: 'emp_no',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'dept_manager',
        fromColumnName: 'emp_no',
        toModelName: 'employees',
        toColumnName: 'emp_no',
        type: RelationType.MANY_TO_ONE,
      },
      {
        fromModelName: 'dept_emp',
        fromColumnName: 'emp_no',
        toModelName: 'employees',
        toColumnName: 'emp_no',
        type: RelationType.MANY_TO_ONE,
        description:
          'meaning an employee can be associated with multiple departments, titles, and salaries over time.',
      },
      {
        fromModelName: 'departments',
        fromColumnName: 'dept_no',
        toModelName: 'dept_manager',
        toColumnName: 'dept_no',
        type: RelationType.ONE_TO_MANY,
      },
    ],
    questions: [
      {
        question: 'What is the average salary for each position?',
        label: 'Aggregation',
      },
      {
        question:
          'Compare the average salary of male and female employees in each department.',
        label: 'Comparison',
      },
      {
        question:
          'What are the names of the managers and the departments they manage?',
        label: 'Associating',
      },
    ],
  },
  music: {
    name: SampleDatasetName.MUSIC,
    tables: [
      {
        tableName: 'album',
        filePath: 'https://wrenai-public.s3.amazonaws.com/demo/Music/Album.csv',
        schema: [
          { columnName: 'AlbumId', dataType: 'INT' },
          { columnName: 'Title', dataType: 'varchar' },
          { columnName: 'ArtistId', dataType: 'INT' },
        ],
      },
      {
        tableName: 'artist',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/Music/Artist.csv',
        schema: [
          { columnName: 'ArtistId', dataType: 'INT' },
          { columnName: 'Name', dataType: 'varchar' },
        ],
      },
      {
        tableName: 'customer',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/Music/Customer.csv',
        schema: [
          { columnName: 'CustomerId', dataType: 'BIGINT' },
          { columnName: 'FirstName', dataType: 'VARCHAR' },
          { columnName: 'LastName', dataType: 'VARCHAR' },
          { columnName: 'Company', dataType: 'VARCHAR' },
          { columnName: 'Address', dataType: 'VARCHAR' },
          { columnName: 'City', dataType: 'VARCHAR' },
          { columnName: 'State', dataType: 'VARCHAR' },
          { columnName: 'Country', dataType: 'VARCHAR' },
          { columnName: 'PostalCode', dataType: 'VARCHAR' },
          { columnName: 'Phone', dataType: 'VARCHAR' },
          { columnName: 'Fax', dataType: 'VARCHAR' },
          { columnName: 'Email', dataType: 'VARCHAR' },
          { columnName: 'SupportRepId', dataType: 'BIGINT' },
        ],
      },
      {
        tableName: 'genre',
        filePath: 'https://wrenai-public.s3.amazonaws.com/demo/Music/Genre.csv',
        schema: [
          { columnName: 'GenreId', dataType: 'BIGINT' },
          { columnName: 'Name', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'invoice',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/Music/Invoice.csv',
        schema: [
          { columnName: 'InvoiceId', dataType: 'BIGINT' },
          { columnName: 'CustomerId', dataType: 'BIGINT' },
          { columnName: 'InvoiceDate', dataType: 'Date' },
          { columnName: 'BillingAddress', dataType: 'VARCHAR' },
          { columnName: 'BillingCity', dataType: 'VARCHAR' },
          { columnName: 'BillingState', dataType: 'VARCHAR' },
          { columnName: 'BillingCountry', dataType: 'VARCHAR' },
          { columnName: 'BillingPostalCode', dataType: 'VARCHAR' },
          { columnName: 'Total', dataType: 'DOUBLE' },
        ],
      },
      {
        tableName: 'invoiceLine',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/Music/InvoiceLine.csv',
        schema: [
          { columnName: 'InvoiceLineId', dataType: 'BIGINT' },
          { columnName: 'InvoiceId', dataType: 'BIGINT' },
          { columnName: 'TrackId', dataType: 'BIGINT' },
          { columnName: 'UnitPrice', dataType: 'DOUBLE' },
          { columnName: 'Quantity', dataType: 'BIGINT' },
        ],
      },
      {
        tableName: 'track',
        filePath: 'https://wrenai-public.s3.amazonaws.com/demo/Music/Track.csv',
        schema: [
          { columnName: 'TrackId', dataType: 'BIGINT' },
          { columnName: 'Name', dataType: 'VARCHAR' },
          { columnName: 'AlbumId', dataType: 'BIGINT' },
          { columnName: 'MediaTypeId', dataType: 'BIGINT' },
          { columnName: 'GenreId', dataType: 'BIGINT' },
          { columnName: 'Composer', dataType: 'VARCHAR' },
          { columnName: 'Milliseconds', dataType: 'BIGINT' },
          { columnName: 'Bytes', dataType: 'BIGINT' },
          { columnName: 'UnitPrice', dataType: 'DOUBLE' },
        ],
      },
    ],
    questions: [
      {
        question: 'What are the top 5 selling albums in the US?',
        label: 'Ranking',
      },
      {
        question: 'What is the total revenue generated from each genre?',
        label: 'Aggregation',
      },
      {
        question:
          'Which customers have made purchases of tracks from albums in each genre?',
        label: 'General',
      },
    ],
    relations: [
      {
        fromModelName: 'album',
        fromColumnName: 'ArtistId',
        toModelName: 'artist',
        toColumnName: 'ArtistId',
        type: RelationType.MANY_TO_ONE,
      },
      {
        fromModelName: 'customer',
        fromColumnName: 'CustomerId',
        toModelName: 'invoice',
        toColumnName: 'CustomerId',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'genre',
        fromColumnName: 'GenreId',
        toModelName: 'track',
        toColumnName: 'GenreId',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'invoice',
        fromColumnName: 'InvoiceId',
        toModelName: 'invoiceLine',
        toColumnName: 'InvoiceId',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'track',
        fromColumnName: 'TrackId',
        toModelName: 'invoiceLine',
        toColumnName: 'TrackId',
        type: RelationType.ONE_TO_MANY,
      },
      // album -> track
      {
        fromModelName: 'album',
        fromColumnName: 'AlbumId',
        toModelName: 'track',
        toColumnName: 'AlbumId',
        type: RelationType.ONE_TO_MANY,
      },
    ],
  },
  ecommerce: {
    name: SampleDatasetName.ECOMMERCE,
    tables: [
      {
        tableName: 'olist_customers_dataset',
        primaryKey: 'customer_id',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_customers_dataset.parquet',
        properties: {
          displayName: 'customers',
        },
        columns: [
          {
            name: 'customer_city',
            properties: {
              description: 'Name of the city where the customer is located',
              displayName: 'customer_city',
            },
          },
          {
            name: 'customer_id',
            properties: {
              description: null,
              displayName: 'customer_id',
            },
          },
          {
            name: 'customer_state',
            properties: {
              description: 'Name of the state where the customer is located',
              displayName: 'customer_state',
            },
          },
          {
            name: 'customer_unique_id',
            properties: {
              description: 'Unique id of the customer',
              displayName: 'customer_unique_id',
            },
          },
          {
            name: 'customer_zip_code_prefix',
            properties: {
              description: 'First 5 digits of customer zip code',
              displayName: 'customer_zip_code_prefix',
            },
          },
        ],
        schema: [
          { columnName: 'customer_city', dataType: 'VARCHAR' },
          { columnName: 'customer_id', dataType: 'VARCHAR' },
          { columnName: 'customer_state', dataType: 'VARCHAR' },
          { columnName: 'customer_unique_id', dataType: 'VARCHAR' },
          { columnName: 'customer_zip_code_prefix', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'olist_order_items_dataset',
        primaryKey: 'order_item_id',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_order_items_dataset.parquet',
        properties: {
          displayName: 'order items',
          description:
            'This table contains the information related to a specific order containing its shipping cost, products, cost, number of order items, and the seller.',
        },
        columns: [
          {
            name: 'freight_value',
            properties: {
              description:
                'Cost of shipping associated with the specific order item',
              displayName: 'freight_value',
            },
          },
          {
            name: 'order_id',
            properties: {
              description:
                'Unique identifier for the order across the platform',
              displayName: 'order_id',
            },
          },
          {
            name: 'order_item_id',
            properties: {
              description:
                'Unique identifier for each item within a specific order',
              displayName: 'order_item_id',
            },
          },
          {
            name: 'price',
            properties: {
              description: 'Price of the individual item within the order',
              displayName: 'price',
            },
          },
          {
            name: 'product_id',
            properties: {
              description:
                'Unique identifier for the product sold in the order.',
              displayName: 'product_id',
            },
          },
          {
            name: 'seller_id',
            properties: {
              description:
                'Unique identifier of the seller who fulfilled the order item.',
              displayName: 'seller_id',
            },
          },
          {
            name: 'shipping_limit_date',
            properties: {
              description:
                'Deadline for the order item to be shipped by the seller.',
              displayName: 'shipping_limit_date',
            },
          },
        ],
        schema: [
          { columnName: 'freight_value', dataType: 'DOUBLE' },
          { columnName: 'order_id', dataType: 'VARCHAR' },
          { columnName: 'order_item_id', dataType: 'BIGINT' },
          { columnName: 'price', dataType: 'DOUBLE' },
          { columnName: 'product_id', dataType: 'VARCHAR' },
          { columnName: 'seller_id', dataType: 'VARCHAR' },
          { columnName: 'shipping_limit_date', dataType: 'TIMESTAMP' },
        ],
      },
      {
        tableName: 'olist_orders_dataset',
        primaryKey: 'order_id',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_orders_dataset.parquet',
        properties: {
          displayName: 'orders',
          description:
            'This table contains detailed information about customer orders, including timestamps for various stages of the order process (approval, shipping, delivery), as well as the order status and customer identification. It helps track the lifecycle of an order from purchase to delivery.',
        },
        columns: [
          {
            name: 'customer_id',
            properties: {
              description:
                'Unique identifier for the customer who placed the order.',
              displayName: 'customer_id',
            },
          },
          {
            name: 'order_approved_at',
            properties: {
              description:
                'Date and time when the order was approved for processing.',
              displayName: 'order_approved_at',
            },
          },
          {
            name: 'order_delivered_carrier_date',
            properties: {
              description:
                'Date when the order was handed over to the carrier or freight forwarder for delivery.',
              displayName: 'order_delivered_carrier_date',
            },
          },
          {
            name: 'order_delivered_customer_date',
            properties: {
              description: 'Date when the order was delivered to the customer.',
              displayName: 'order_delivered_customer_date',
            },
          },
          {
            name: 'order_estimated_delivery_date',
            properties: {
              description:
                'Expected delivery date based on the initial estimate.',
              displayName: 'order_estimated_delivery_date',
            },
          },
          {
            name: 'order_id',
            properties: {
              description: 'Unique identifier for the specific order',
              displayName: 'order_id',
            },
          },
          {
            name: 'order_purchase_timestamp',
            properties: {
              description:
                'Date and time when the order was placed by the customer.',
              displayName: 'order_purchase_timestamp',
            },
          },
          {
            name: 'order_status',
            properties: {
              description:
                'Current status of the order (e.g., delivered, shipped, canceled).',
              displayName: 'order_status',
            },
          },
        ],
        schema: [
          { columnName: 'customer_id', dataType: 'VARCHAR' },
          { columnName: 'order_approved_at', dataType: 'TIMESTAMP' },
          { columnName: 'order_delivered_carrier_date', dataType: 'TIMESTAMP' },
          {
            columnName: 'order_delivered_customer_date',
            dataType: 'TIMESTAMP',
          },
          {
            columnName: 'order_estimated_delivery_date',
            dataType: 'TIMESTAMP',
          },
          { columnName: 'order_id', dataType: 'VARCHAR' },
          { columnName: 'order_purchase_timestamp', dataType: 'TIMESTAMP' },
          { columnName: 'order_status', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'olist_order_payments_dataset',
        primaryKey: 'order_id',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_order_payments_dataset.parquet',
        properties: {
          displayName: 'order payments',
          description:
            'This table contains information about payment details for each order, including payment methods, amounts, installment plans, and payment sequences, helping to track how orders were paid and processed within the e-commerce platform.',
        },
        columns: [
          {
            name: 'order_id',
            properties: {
              description:
                'Unique identifier for the order associated with the payment.',
              displayName: 'order_id',
            },
          },
          {
            name: 'payment_installments',
            properties: {
              description:
                'Number of installments the payment is divided into for the order.',
              displayName: 'payment_installments',
            },
          },
          {
            name: 'payment_sequential',
            properties: {
              description:
                'Sequence number for tracking multiple payments within the same order.',
              displayName: 'payment_sequential',
            },
          },
          {
            name: 'payment_type',
            properties: {
              description:
                'Method used for the payment, such as credit card, debit, or voucher.',
              displayName: 'payment_type',
            },
          },
          {
            name: 'payment_value',
            properties: {
              description: 'Total amount paid in the specific transaction.',
              displayName: 'payment_value',
            },
          },
        ],
        schema: [
          { columnName: 'order_id', dataType: 'VARCHAR' },
          { columnName: 'payment_installments', dataType: 'BIGINT' },
          { columnName: 'payment_sequential', dataType: 'BIGINT' },
          { columnName: 'payment_type', dataType: 'VARCHAR' },
          { columnName: 'payment_value', dataType: 'DOUBLE' },
        ],
      },
      {
        tableName: 'olist_products_dataset',
        primaryKey: 'product_id',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_products_dataset.parquet',
        properties: {
          displayName: 'products',
          description:
            'This table provides detailed information about products, including their category, dimensions, weight, description length, and the number of photos. This helps in managing product details and enhancing the shopping experience on the e-commerce platform.',
        },
        columns: [
          {
            name: 'product_category_name',
            properties: {
              description:
                'Name of the product category to which the item belongs.',
              displayName: 'product_category_name',
            },
          },
          {
            name: 'product_description_lenght',
            properties: {
              description: 'Length of the product description in characters.',
              displayName: 'product_description_lenght',
            },
          },
          {
            name: 'product_height_cm',
            properties: {
              description: 'Height of the product in centimeters.',
              displayName: 'product_height_cm',
            },
          },
          {
            name: 'product_id',
            properties: {
              description: 'Unique identifier for the product',
              displayName: 'product_id',
            },
          },
          {
            name: 'product_length_cm',
            properties: {
              description: 'Length of the product in centimeters',
              displayName: 'product_length_cm',
            },
          },
          {
            name: 'product_name_lenght',
            properties: {
              description: 'Length of the product name in characters',
              displayName: 'product_name_lenght',
            },
          },
          {
            name: 'product_photos_qty',
            properties: {
              description: 'Number of photos available for the product',
              displayName: 'product_photos_qty',
            },
          },
          {
            name: 'product_weight_g',
            properties: {
              description: 'Weight of the product in grams',
              displayName: 'product_weight_g',
            },
          },
          {
            name: 'product_width_cm',
            properties: {
              description: 'Width of the product in centimeters',
              displayName: 'product_width_cm',
            },
          },
        ],
        schema: [
          { columnName: 'product_category_name', dataType: 'VARCHAR' },
          { columnName: 'product_description_lenght', dataType: 'BIGINT' },
          { columnName: 'product_height_cm', dataType: 'BIGINT' },
          { columnName: 'product_id', dataType: 'VARCHAR' },
          { columnName: 'product_length_cm', dataType: 'BIGINT' },
          { columnName: 'product_name_lenght', dataType: 'BIGINT' },
          { columnName: 'product_photos_qty', dataType: 'BIGINT' },
          { columnName: 'product_weight_g', dataType: 'BIGINT' },
          { columnName: 'product_width_cm', dataType: 'BIGINT' },
        ],
      },
      {
        tableName: 'olist_order_reviews_dataset',
        primaryKey: 'review_id',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_order_reviews_dataset.parquet',
        properties: {
          displayName: 'order reviews',
          description:
            'This table contains customer reviews for each order, including feedback comments, ratings, and timestamps for when the review was submitted and responded to. It helps track customer satisfaction and review management on the e-commerce platform.',
        },
        columns: [
          {
            name: 'order_id',
            properties: {
              description:
                'Unique identifier linking the review to the corresponding order.',
              displayName: 'order_id',
            },
          },
          {
            name: 'review_answer_timestamp',
            properties: {
              description:
                'Date and time when the review was responded to by the seller',
              displayName: 'review_answer_timestamp',
            },
          },
          {
            name: 'review_comment_message',
            properties: {
              description:
                'Detailed feedback or comments provided by the customer regarding the order.',
              displayName: 'review_comment_message',
            },
          },
          {
            name: 'review_comment_title',
            properties: {
              description: "Summary or title of the customer's review",
              displayName: 'review_comment_title',
            },
          },
          {
            name: 'review_creation_date',
            properties: {
              description:
                'Date and time when the customer initially submitted the review.',
              displayName: 'review_creation_date',
            },
          },
          {
            name: 'review_id',
            properties: {
              description: 'Unique identifier for the specific review entry.',
              displayName: 'review_id',
            },
          },
          {
            name: 'review_score',
            properties: {
              description:
                'Numeric rating given by the customer, typically ranging from 1 (worst) to 5 (best).',
              displayName: 'review_score',
            },
          },
        ],
        schema: [
          { columnName: 'order_id', dataType: 'VARCHAR' },
          { columnName: 'review_answer_timestamp', dataType: 'TIMESTAMP' },
          { columnName: 'review_comment_message', dataType: 'VARCHAR' },
          { columnName: 'review_comment_title', dataType: 'VARCHAR' },
          { columnName: 'review_creation_date', dataType: 'TIMESTAMP' },
          { columnName: 'review_id', dataType: 'VARCHAR' },
          { columnName: 'review_score', dataType: 'BIGINT' },
        ],
      },
      {
        tableName: 'olist_geolocation_dataset',
        primaryKey: '',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_geolocation_dataset.parquet',
        properties: {
          displayName: 'geolocation',
          description:
            'This table contains detailed information about Brazilian zip codes and their corresponding latitude and longitude coordinates. It can be used to plot maps, calculate distances between sellers and customers, and perform geographic analysis.',
        },
        columns: [
          {
            name: 'geolocation_city',
            properties: {
              displayName: 'geolocation_city',
              description: 'The city name of the geolocation',
            },
          },
          {
            name: 'geolocation_lat',
            properties: {
              displayName: 'geolocation_lat',
              description: 'The coordinations for the locations latitude',
            },
          },
          {
            name: 'geolocation_lng',
            properties: {
              displayName: 'geolocation_lng',
              description: 'The coordinations for the locations longitude',
            },
          },
          {
            name: 'geolocation_state',
            properties: {
              displayName: 'geolocation_state',
              description: 'The state of the geolocation',
            },
          },
          {
            name: 'geolocation_zip_code_prefix',
            properties: {
              displayName: 'geolocation_zip_code_prefix',
              description: 'First 5 digits of zip code',
            },
          },
        ],
        schema: [
          { columnName: 'geolocation_city', dataType: 'VARCHAR' },
          { columnName: 'geolocation_lat', dataType: 'DOUBLE' },
          { columnName: 'geolocation_lng', dataType: 'DOUBLE' },
          { columnName: 'geolocation_state', dataType: 'VARCHAR' },
          { columnName: 'geolocation_zip_code_prefix', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'olist_sellers_dataset',
        primaryKey: '',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/olist_sellers_dataset.parquet',
        properties: {
          displayName: 'sellers',
          description:
            'This table includes data about the sellers that fulfilled orders made. Use it to find the seller location and to identify which seller fulfilled each product.',
        },
        columns: [
          {
            name: 'seller_city',
            properties: {
              description: 'The Brazilian city where the seller is located',
              displayName: 'seller_city',
            },
          },
          {
            name: 'seller_id',
            properties: {
              description: 'Unique identifier for the seller on the platform',
              displayName: 'seller_id',
            },
          },
          {
            name: 'seller_state',
            properties: {
              description: 'The Brazilian state where the seller is located',
              displayName: 'seller_state',
            },
          },
          {
            name: 'seller_zip_code_prefix',
            properties: {
              description: 'First 5 digits of seller zip code',
              displayName: 'seller_zip_code_prefix',
            },
          },
        ],
        schema: [
          { columnName: 'seller_city', dataType: 'VARCHAR' },
          { columnName: 'seller_id', dataType: 'VARCHAR' },
          { columnName: 'seller_state', dataType: 'VARCHAR' },
          { columnName: 'seller_zip_code_prefix', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'product_category_name_translation',
        primaryKey: 'product_category_name',
        filePath:
          'https://assets.getwren.ai/sample_data/brazilian-ecommerce/product_category_name_translation.parquet',
        properties: {
          displayName: 'product category name translation',
          description:
            'This table contains translations of product categories from Portuguese to English.',
        },
        columns: [
          {
            name: 'product_category_name',
            properties: {
              description:
                'Original name of the product category in Portuguese.',
              displayName: 'product_category_name',
            },
          },
          {
            name: 'product_category_name_english',
            properties: {
              description:
                'Translated name of the product category in English.',
              displayName: 'product_category_name_english',
            },
          },
        ],
        schema: [
          { columnName: 'product_category_name', dataType: 'VARCHAR' },
          { columnName: 'product_category_name_english', dataType: 'VARCHAR' },
        ],
      },
    ],
    questions: [
      {
        question:
          'Which are the top 3 cities with the highest number of orders?',
        label: 'Ranking',
      },
      {
        question:
          'What is the average score of reviews submitted for orders placed by customers in each city?',
        label: 'Aggregation',
      },
      {
        question:
          'What is the total value of payments made by customers from each state?',
        label: 'Aggregation',
      },
    ],
    relations: [
      // orders
      // orders -> customers
      {
        fromModelName: 'olist_orders_dataset',
        fromColumnName: 'customer_id',
        toModelName: 'olist_customers_dataset',
        toColumnName: 'customer_id',
        type: RelationType.MANY_TO_ONE,
      },
      // orders -> items
      {
        fromModelName: 'olist_orders_dataset',
        fromColumnName: 'order_id',
        toModelName: 'olist_order_items_dataset',
        toColumnName: 'order_id',
        type: RelationType.ONE_TO_MANY,
      },
      // orders -> reviews
      {
        fromModelName: 'olist_orders_dataset',
        fromColumnName: 'order_id',
        toModelName: 'olist_order_reviews_dataset',
        toColumnName: 'order_id',
        type: RelationType.ONE_TO_MANY,
      },
      // orders -> payments
      {
        fromModelName: 'olist_orders_dataset',
        fromColumnName: 'order_id',
        toModelName: 'olist_order_payments_dataset',
        toColumnName: 'order_id',
        type: RelationType.ONE_TO_MANY,
      },
      // items -> products
      {
        fromModelName: 'olist_order_items_dataset',
        fromColumnName: 'product_id',
        toModelName: 'olist_products_dataset',
        toColumnName: 'product_id',
        type: RelationType.MANY_TO_ONE,
      },
      // items -> sellers
      {
        fromModelName: 'olist_order_items_dataset',
        fromColumnName: 'seller_id',
        toModelName: 'olist_sellers_dataset',
        toColumnName: 'seller_id',
        type: RelationType.MANY_TO_ONE,
      },
      // geolocation -> customers (zip code prefix)
      {
        fromModelName: 'olist_geolocation_dataset',
        fromColumnName: 'geolocation_zip_code_prefix',
        toModelName: 'olist_customers_dataset',
        toColumnName: 'customer_zip_code_prefix',
        type: RelationType.ONE_TO_MANY,
      },
      // geolocation -> sellers (zip code prefix)
      {
        fromModelName: 'olist_geolocation_dataset',
        fromColumnName: 'geolocation_zip_code_prefix',
        toModelName: 'olist_sellers_dataset',
        toColumnName: 'seller_zip_code_prefix',
        type: RelationType.ONE_TO_MANY,
      },
      // product category name translation -> products
      {
        fromModelName: 'product_category_name_translation',
        fromColumnName: 'product_category_name',
        toModelName: 'olist_products_dataset',
        toColumnName: 'product_category_name',
        type: RelationType.ONE_TO_MANY,
      },
    ],
  },
  nba: {
    name: SampleDatasetName.NBA,
    tables: [
      {
        tableName: 'game',
        primaryKey: 'Id',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/v0.3.0/NBA/game.csv',
        columns: [
          {
            name: 'Id',
          },
          {
            name: 'SeasonId',
          },
          {
            name: 'TeamIdHome',
          },
          {
            name: 'WlHome',
          },
          {
            name: 'Min',
          },
          {
            name: 'FgmHome',
            properties: {
              description: 'number of field goals made by the home team.',
            },
          },
          {
            name: 'FgaHome',
            properties: {
              description: 'number of field goals attempted by the home team.',
            },
          },
          {
            name: 'threepHome',
            properties: {
              description:
                'number of three point field goals made by the home team.',
            },
          },
          {
            name: 'threepaHome',
            properties: {
              description:
                'number of three point field goals attempted by the home team.',
            },
          },
          {
            name: 'FtmHome',
            properties: {
              description: 'number of free throws made by the home team.',
            },
          },
          {
            name: 'FtaHome',
            properties: {
              description: 'number of free throws attempted by the home team.',
            },
          },
          {
            name: 'OrebHome',
            properties: {
              description: 'number of offensive rebounds by the home team.',
            },
          },
          {
            name: 'DrebHome',
            properties: {
              description: 'number of defensive rebounds by the home team.',
            },
          },
          {
            name: 'RebHome',
            properties: { description: 'number of rebounds by the home team.' },
          },
          {
            name: 'AstHome',
            properties: { description: 'number of assists by the home team.' },
          },
          {
            name: 'StlHome',
            properties: { description: 'number of steels by the home team.' },
          },
          {
            name: 'BlkHome',
            properties: { description: 'number of blocks by the home team.' },
          },
          {
            name: 'TovHome',
            properties: {
              description: 'number of turnovers by the home team.',
            },
          },
          {
            name: 'PfHome',
            properties: {
              description: 'number of personal fouls by the home team.',
            },
          },
          {
            name: 'PtsHome',
            properties: { description: 'Total score of the home team.' },
          },
          {
            name: 'PlusMimusHome',
          },
          {
            name: 'TeamIdAway',
          },
          {
            name: 'WlAway',
          },
          {
            name: 'FgmAway',
            properties: {
              description: 'number of field goals made by the away team.',
            },
          },
          {
            name: 'FgaAway',
            properties: {
              description: 'number of field goals attempted by the away team.',
            },
          },
          {
            name: 'threepAway',
            properties: {
              description:
                'number of three point field goals made by the away team.',
            },
          },
          {
            name: 'threepaAway',
            properties: {
              description:
                'number of three point field goals attempted by the away team.',
            },
          },
          {
            name: 'FtmAway',
            properties: {
              description: 'number of free throws made by the away team.',
            },
          },
          {
            name: 'FtaAway',
            properties: {
              description: 'number of free throws attempted by the away team.',
            },
          },
          {
            name: 'OrebAway',
            properties: {
              description: 'number of offensive rebounds by the away team.',
            },
          },
          {
            name: 'DrebAway',
            properties: {
              description: 'number of defensive rebounds by the away team.',
            },
          },
          {
            name: 'RebAway',
            properties: { description: 'number of rebounds by the away team.' },
          },
          {
            name: 'AstAway',
            properties: { description: 'number of assists by the away team.' },
          },
          {
            name: 'StlAway',
            properties: { description: 'number of steels by the away team.' },
          },
          {
            name: 'BlkAway',
            properties: { description: 'number of blocks by the away team.' },
          },
          {
            name: 'TovAway',
            properties: {
              description: 'number of turnovers by the away team.',
            },
          },
          {
            name: 'PfAway',
            properties: {
              description: 'number of personal fouls by the away team.',
            },
          },
          {
            name: 'PtsAway',
            properties: { description: 'Total score of the away team.' },
          },
          {
            name: 'PlusMimusAway',
          },
          {
            name: 'seasonType',
          },
        ],
        schema: [
          { columnName: 'SeasonId', dataType: 'BIGINT' },
          { columnName: 'TeamIdHome', dataType: 'BIGINT' },
          { columnName: 'Id', dataType: 'BIGINT' },
          { columnName: 'GameDate', dataType: 'DATE' },
          { columnName: 'WlHome', dataType: 'VARCHAR' },
          { columnName: 'Min', dataType: 'BIGINT' },
          { columnName: 'FgmHome', dataType: 'BIGINT' },
          { columnName: 'FgaHome', dataType: 'BIGINT' },
          { columnName: 'FgPct_home', dataType: 'DOUBLE' },
          { columnName: 'threepHome', dataType: 'BIGINT' },
          { columnName: 'threepaHome', dataType: 'BIGINT' },
          { columnName: 'fg3_pct_home', dataType: 'DOUBLE' },
          { columnName: 'FtmHome', dataType: 'BIGINT' },
          { columnName: 'FtaHome', dataType: 'BIGINT' },
          { columnName: 'ft_pct_home', dataType: 'DOUBLE' },
          { columnName: 'OrebHome', dataType: 'BIGINT' },
          { columnName: 'DrebHome', dataType: 'BIGINT' },
          { columnName: 'RebHome', dataType: 'BIGINT' },
          { columnName: 'AstHome', dataType: 'BIGINT' },
          { columnName: 'StlHome', dataType: 'BIGINT' },
          { columnName: 'BlkHome', dataType: 'BIGINT' },
          { columnName: 'TovHome', dataType: 'BIGINT' },
          { columnName: 'PfHome', dataType: 'BIGINT' },
          { columnName: 'PtsHome', dataType: 'BIGINT' },
          { columnName: 'PlusMinusHome', dataType: 'BIGINT' },
          { columnName: 'TeamIdAway', dataType: 'BIGINT' },
          { columnName: 'WlAway', dataType: 'VARCHAR' },
          { columnName: 'FgmAway', dataType: 'BIGINT' },
          { columnName: 'FgaAway', dataType: 'BIGINT' },
          { columnName: 'fg_pct_away', dataType: 'DOUBLE' },
          { columnName: 'threepAway', dataType: 'BIGINT' },
          { columnName: 'threepaAway', dataType: 'BIGINT' },
          { columnName: 'Fg3_pct_away', dataType: 'DOUBLE' },
          { columnName: 'FtmAway', dataType: 'BIGINT' },
          { columnName: 'FtaAway', dataType: 'BIGINT' },
          { columnName: 'Ft_pct_away', dataType: 'DOUBLE' },
          { columnName: 'OrebAway', dataType: 'BIGINT' },
          { columnName: 'DrebAway', dataType: 'BIGINT' },
          { columnName: 'RebAway', dataType: 'BIGINT' },
          { columnName: 'AstAway', dataType: 'BIGINT' },
          { columnName: 'StlAway', dataType: 'BIGINT' },
          { columnName: 'BlkAway', dataType: 'BIGINT' },
          { columnName: 'TovAway', dataType: 'BIGINT' },
          { columnName: 'PfAway', dataType: 'BIGINT' },
          { columnName: 'PtsAway', dataType: 'BIGINT' },
          { columnName: 'PlusMinusAway', dataType: 'BIGINT' },
          { columnName: 'SeasonType', dataType: 'VARCHAR' },
        ],
        properties: {
          description:
            'This table describes the game statistics for both the home and away teams in each NBA game. Turnover percentage is the number of possessions that end in a turnover. The formula for turnover percentage (TOV%) is "TOV% = (Tov ÷ (FGA + (0.44 x FTA) + Tov)) x 100%".',
        },
      },
      {
        tableName: 'line_score',
        primaryKey: 'GameId',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/v0.3.0/NBA/line_score.csv',
        columns: [
          {
            name: 'GameId',
          },
          {
            name: 'GameDate',
          },
          {
            name: 'GameSequence',
          },
          {
            name: 'TeamIdHome',
          },
          {
            name: 'TeamWinsLossesHome',
          },
          {
            name: 'PtsQtr1Home',
            properties: {
              description: 'The score of the home team in the first quarter.',
            },
          },
          {
            name: 'PtsQtr2Home',
            properties: {
              description: 'The score of the home team in the second quarter.',
            },
          },
          {
            name: 'PtsQtr3Home',
            properties: {
              description: 'The score of the home team in the third quarter.',
            },
          },
          {
            name: 'PtsQtr4Home',
            properties: {
              description: 'The score of the home team in the fourth quarter.',
            },
          },
          {
            name: 'PtsOt1Home',
            properties: {
              description:
                'The score of the home team in the overtime. The value of 0 indicates that the game did not go into overtime.',
            },
          },
          {
            name: 'PtsHome',
            properties: { description: 'Total score of the home team.' },
          },
          {
            name: 'TeamIdAway',
          },
          {
            name: 'TeamWinsLossesAway',
          },
          {
            name: 'PtsQtr1Away',
            properties: {
              description: 'The score of the away team in the first quarter.',
            },
          },
          {
            name: 'PtsQtr2Away',
            properties: {
              description: 'The score of the away team in the second quarter.',
            },
          },
          {
            name: 'PtsQtr3Away',
            properties: {
              description: 'The score of the away team in the third quarter.',
            },
          },
          {
            name: 'PtsQtr4Away',
            properties: {
              description: 'The score of the away team in the fourth quarter.',
            },
          },
          {
            name: 'PtsOt1Away',
            properties: {
              description:
                'The score of the away team in the overtime. The value of 0 indicates that the game did not go into overtime.',
            },
          },
          {
            name: 'PtsAway',
            properties: { description: 'Total score of the away team.' },
          },
        ],
        schema: [
          { columnName: 'GameDate', dataType: 'DATE' },
          { columnName: 'GameSequence', dataType: 'BIGINT' },
          { columnName: 'GameId', dataType: 'BIGINT' },
          { columnName: 'TeamIdHome', dataType: 'BIGINT' },
          { columnName: 'TeamWinsLossesHome', dataType: 'VARCHAR' },
          { columnName: 'PtsQtr1Home', dataType: 'BIGINT' },
          { columnName: 'PtsQtr2Home', dataType: 'BIGINT' },
          { columnName: 'PtsQtr3Home', dataType: 'BIGINT' },
          { columnName: 'PtsQtr4Home', dataType: 'BIGINT' },
          { columnName: 'PtsOt1Home', dataType: 'BIGINT' },
          { columnName: 'PtsHome', dataType: 'BIGINT' },
          { columnName: 'TeamIdAway', dataType: 'BIGINT' },
          { columnName: 'TeamWinsLossesAway', dataType: 'VARCHAR' },
          { columnName: 'PtsQtr1Away', dataType: 'BIGINT' },
          { columnName: 'PtsQtr2Away', dataType: 'BIGINT' },
          { columnName: 'PtsQtr3Away', dataType: 'BIGINT' },
          { columnName: 'PtsQtr4Away', dataType: 'BIGINT' },
          { columnName: 'PtsOt1Away', dataType: 'BIGINT' },
          { columnName: 'PtsAway', dataType: 'BIGINT' },
        ],
        properties: {
          description:
            'This table describes the scores and total score for each quarter or overtime of an NBA game, detailing the scores for both the home team and the away team.',
        },
      },
      {
        tableName: 'player_games',
        primaryKey: 'Id',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/v0.3.0/NBA/player_game.csv',
        columns: [
          {
            name: 'Id',
          },
          {
            name: 'GameId',
          },
          {
            name: 'PlayerId',
          },
          {
            name: 'Date',
          },
          {
            name: 'Age',
            properties: { description: 'player age. The format is "age-days"' },
          },
          {
            name: 'Tm',
            properties: { description: 'team affiliation.' },
          },
          {
            name: 'Opp',
            properties: { description: 'opposing team.' },
          },
          {
            name: 'MP',
            properties: { description: 'minutes played' },
          },
          {
            name: 'FG',
            properties: {
              description: 'number of two point field goals made.',
            },
          },
          {
            name: 'FGA',
            properties: {
              description:
                'number of two point field goals attempted (do not include free throws).',
            },
          },
          {
            name: 'threeP',
            properties: {
              description: 'number of three point field goals made.',
            },
          },
          {
            name: 'threePA',
            properties: {
              description: 'number of three point field goals attempted.',
            },
          },
          {
            name: 'FT',
            properties: { description: 'number of free throws made.' },
          },
          {
            name: 'FTA',
            properties: { description: 'number of free throws attempted.' },
          },
          {
            name: 'ORB',
            properties: { description: 'number of offensive rebounds.' },
          },
          {
            name: 'DRB',
            properties: { description: 'number of defensive rebounds.' },
          },
          {
            name: 'AST',
            properties: { description: 'number of assists.' },
          },
          {
            name: 'STL',
            properties: { description: 'number of Steals.' },
          },
          {
            name: 'BLK',
            properties: { description: 'number of blocks.' },
          },
          {
            name: 'TOV',
            properties: { description: 'number of turnovers allowed' },
          },
          {
            name: 'PF',
            properties: { description: 'number of personal fouls' },
          },
          {
            name: 'PTS',
            properties: { description: 'total score' },
          },
        ],
        schema: [
          { columnName: 'Id', dataType: 'BIGINT' },
          { columnName: 'PlayerID', dataType: 'BIGINT' },
          { columnName: 'GameID', dataType: 'BIGINT' },
          { columnName: 'Date', dataType: 'DATE' },
          { columnName: 'Age', dataType: 'VARCHAR' }, // 35-032
          { columnName: 'Tm', dataType: 'VARCHAR' },
          { columnName: 'Opp', dataType: 'VARCHAR' },
          { columnName: 'MP', dataType: 'VARCHAR' }, // 37:25:00
          { columnName: 'FG', dataType: 'BIGINT' },
          { columnName: 'FGA', dataType: 'BIGINT' },
          { columnName: 'threeP', dataType: 'BIGINT' },
          { columnName: 'threePA', dataType: 'BIGINT' },
          { columnName: 'FT', dataType: 'BIGINT' },
          { columnName: 'FTA', dataType: 'BIGINT' },
          { columnName: 'ORB', dataType: 'BIGINT' },
          { columnName: 'DRB', dataType: 'BIGINT' },
          { columnName: 'TRB', dataType: 'BIGINT' },
          { columnName: 'AST', dataType: 'BIGINT' },
          { columnName: 'STL', dataType: 'BIGINT' },
          { columnName: 'BLK', dataType: 'BIGINT' },
          { columnName: 'TOV', dataType: 'BIGINT' },
          { columnName: 'PF', dataType: 'BIGINT' },
          { columnName: 'PTS', dataType: 'BIGINT' },
        ],
        properties: {
          description:
            'This table describes the game statistics for each NBA player in every game. Turnover percentage is the number of possessions that end in a turnover. The formula for turnover percentage (TOV%) is "TOV% = (Tov ÷ (FGA + (0.44 x FTA) + Tov)) x 100%".',
        },
      },
      {
        tableName: 'player',
        primaryKey: 'Id',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/v0.3.0/NBA/player.csv',
        columns: [
          {
            name: 'Id',
          },
          {
            name: 'TeamId',
          },
          {
            name: 'FullName',
          },
          {
            name: 'FirstName',
          },
          {
            name: 'LastName',
          },
        ],
        schema: [
          { columnName: 'Id', dataType: 'BIGINT' },
          { columnName: 'TeamId', dataType: 'BIGINT' },
          { columnName: 'FullName', dataType: 'VARCHAR' },
          { columnName: 'FirstName', dataType: 'VARCHAR' },
          { columnName: 'LastName', dataType: 'VARCHAR' },
        ],
        properties: {
          description:
            'This table describes NBA players by their ID, name, and team affiliation.',
        },
      },
      {
        tableName: 'team',
        primaryKey: 'Id',
        filePath:
          'https://wrenai-public.s3.amazonaws.com/demo/v0.3.0/NBA/team.csv',
        columns: [
          {
            name: 'Id',
          },
          {
            name: 'FullName',
          },
          {
            name: 'Abbreviation',
          },
          {
            name: 'Nickname',
          },
          {
            name: 'City',
          },
          {
            name: 'State',
          },
          {
            name: 'YearFounded',
          },
        ],
        schema: [
          { columnName: 'Id', dataType: 'BIGINT' },
          { columnName: 'FullName', dataType: 'VARCHAR' },
          { columnName: 'Abbreviation', dataType: 'VARCHAR' },
          { columnName: 'Nickname', dataType: 'VARCHAR' },
          { columnName: 'City', dataType: 'VARCHAR' },
          { columnName: 'State', dataType: 'VARCHAR' },
          { columnName: 'YearFounded', dataType: 'INT' },
        ],
        properties: {
          description:
            'This table describes NBA teams by their ID, team name, team abbreviation, and founding date.',
        },
      },
    ],
    questions: [
      {
        question:
          'How many three-pointers were made by each player in each game?',
        label: 'Aggregation',
      },
      {
        question:
          'What is the differences in turnover rates between teams with high and low average scores?',
        label: 'Comparison',
      },
      {
        question:
          'Which teams had the highest average points scored per game throughout the season?',
        label: 'Ranking',
      },
    ],
    relations: [
      {
        fromModelName: 'game',
        fromColumnName: 'Id',
        toModelName: 'line_score',
        toColumnName: 'GameId',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'line_score',
        fromColumnName: 'GameId',
        toModelName: 'player_games',
        toColumnName: 'GameID',
        type: RelationType.ONE_TO_MANY,
      },
      {
        fromModelName: 'player',
        fromColumnName: 'TeamId',
        toModelName: 'team',
        toColumnName: 'Id',
        type: RelationType.ONE_TO_ONE,
      },
      {
        fromModelName: 'team',
        fromColumnName: 'Id',
        toModelName: 'game',
        toColumnName: 'TeamIdHome',
        type: RelationType.ONE_TO_MANY,
      },
    ],
  },
  card_transaction: {
    name: SampleDatasetName.CARD_TRANSACTION,
    tables: [
      {
        tableName: 'users',
        primaryKey: 'id',
        filePath:
          'http://wren-ui:3000/sample_data/card_transaction/users.parquet',
        properties: {
          displayName: 'users',
          description:
            'Contains demographic and financial profile information about customers, including age, income, debt, and credit score.',
        },
        columns: [
          {
            name: 'id',
            properties: {
              description: 'Unique identifier for the customer.',
              displayName: 'id',
            },
          },
          {
            name: 'current_age',
            properties: {
              description: 'Current age of the customer.',
              displayName: 'current_age',
            },
          },
          {
            name: 'retirement_age',
            properties: {
              description: 'Expected retirement age of the customer.',
              displayName: 'retirement_age',
            },
          },
          {
            name: 'birth_year',
            properties: {
              description: 'Year the customer was born.',
              displayName: 'birth_year',
            },
          },
          {
            name: 'birth_month',
            properties: {
              description: 'Month the customer was born.',
              displayName: 'birth_month',
            },
          },
          {
            name: 'gender',
            properties: {
              description:
                'Gender of the customer (e.g., Male, Female).',
              displayName: 'gender',
            },
          },
          {
            name: 'address',
            properties: {
              description: 'Street address of the customer.',
              displayName: 'address',
            },
          },
          {
            name: 'latitude',
            properties: {
              description: 'Latitude coordinate of the customer location.',
              displayName: 'latitude',
            },
          },
          {
            name: 'longitude',
            properties: {
              description: 'Longitude coordinate of the customer location.',
              displayName: 'longitude',
            },
          },
          {
            name: 'per_capita_income',
            properties: {
              description:
                'Per capita income of the customer area in USD.',
              displayName: 'per_capita_income',
            },
          },
          {
            name: 'yearly_income',
            properties: {
              description: 'Annual income of the customer in USD.',
              displayName: 'yearly_income',
            },
          },
          {
            name: 'total_debt',
            properties: {
              description: 'Total outstanding debt of the customer in USD.',
              displayName: 'total_debt',
            },
          },
          {
            name: 'credit_score',
            properties: {
              description: 'Credit score of the customer.',
              displayName: 'credit_score',
            },
          },
          {
            name: 'num_credit_cards',
            properties: {
              description:
                'Number of credit cards held by the customer.',
              displayName: 'num_credit_cards',
            },
          },
        ],
        schema: [
          { columnName: 'id', dataType: 'INTEGER' },
          { columnName: 'current_age', dataType: 'INTEGER' },
          { columnName: 'retirement_age', dataType: 'INTEGER' },
          { columnName: 'birth_year', dataType: 'INTEGER' },
          { columnName: 'birth_month', dataType: 'INTEGER' },
          { columnName: 'gender', dataType: 'VARCHAR' },
          { columnName: 'address', dataType: 'VARCHAR' },
          { columnName: 'latitude', dataType: 'DOUBLE' },
          { columnName: 'longitude', dataType: 'DOUBLE' },
          { columnName: 'per_capita_income', dataType: 'DOUBLE' },
          { columnName: 'yearly_income', dataType: 'DOUBLE' },
          { columnName: 'total_debt', dataType: 'DOUBLE' },
          { columnName: 'credit_score', dataType: 'INTEGER' },
          { columnName: 'num_credit_cards', dataType: 'INTEGER' },
        ],
      },
      {
        tableName: 'cards',
        primaryKey: 'id',
        filePath:
          'http://wren-ui:3000/sample_data/card_transaction/cards.parquet',
        properties: {
          displayName: 'cards',
          description:
            'Contains credit and debit card details including card brand, type, credit limit, and activation dates.',
        },
        columns: [
          {
            name: 'id',
            properties: {
              description: 'Unique identifier for the card.',
              displayName: 'id',
            },
          },
          {
            name: 'client_id',
            properties: {
              description:
                'Identifier of the customer who owns this card.',
              displayName: 'client_id',
            },
          },
          {
            name: 'card_brand',
            properties: {
              description:
                'Brand of the card (e.g., Visa, Mastercard, Amex).',
              displayName: 'card_brand',
            },
          },
          {
            name: 'card_type',
            properties: {
              description:
                'Type of the card (e.g., Debit, Credit, Prepaid).',
              displayName: 'card_type',
            },
          },
          {
            name: 'card_number',
            properties: {
              description: 'Card number.',
              displayName: 'card_number',
            },
          },
          {
            name: 'expires',
            properties: {
              description:
                'Expiration date of the card (MM/YYYY).',
              displayName: 'expires',
            },
          },
          {
            name: 'cvv',
            properties: {
              description: 'Card verification value.',
              displayName: 'cvv',
            },
          },
          {
            name: 'has_chip',
            properties: {
              description:
                'Whether the card has chip technology (YES/NO).',
              displayName: 'has_chip',
            },
          },
          {
            name: 'num_cards_issued',
            properties: {
              description:
                'Number of cards issued for this account.',
              displayName: 'num_cards_issued',
            },
          },
          {
            name: 'credit_limit',
            properties: {
              description: 'Credit limit on the card in USD.',
              displayName: 'credit_limit',
            },
          },
          {
            name: 'acct_open_date',
            properties: {
              description:
                'Date the account was opened (MM/YYYY).',
              displayName: 'acct_open_date',
            },
          },
          {
            name: 'year_pin_last_changed',
            properties: {
              description:
                'Year the card PIN was last changed.',
              displayName: 'year_pin_last_changed',
            },
          },
          {
            name: 'card_on_dark_web',
            properties: {
              description:
                'Whether the card details were found on the dark web (Yes/No).',
              displayName: 'card_on_dark_web',
            },
          },
        ],
        schema: [
          { columnName: 'id', dataType: 'INTEGER' },
          { columnName: 'client_id', dataType: 'INTEGER' },
          { columnName: 'card_brand', dataType: 'VARCHAR' },
          { columnName: 'card_type', dataType: 'VARCHAR' },
          { columnName: 'card_number', dataType: 'VARCHAR' },
          { columnName: 'expires', dataType: 'VARCHAR' },
          { columnName: 'cvv', dataType: 'VARCHAR' },
          { columnName: 'has_chip', dataType: 'VARCHAR' },
          { columnName: 'num_cards_issued', dataType: 'INTEGER' },
          { columnName: 'credit_limit', dataType: 'DOUBLE' },
          { columnName: 'acct_open_date', dataType: 'VARCHAR' },
          { columnName: 'year_pin_last_changed', dataType: 'INTEGER' },
          { columnName: 'card_on_dark_web', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'transactions',
        primaryKey: 'id',
        filePath:
          'http://wren-ui:3000/sample_data/card_transaction/transactions.parquet',
        properties: {
          displayName: 'transactions',
          description:
            'Contains detailed transaction records including amounts, timestamps, merchant details, and fraud labels.',
        },
        columns: [
          {
            name: 'id',
            properties: {
              description: 'Unique identifier for the transaction.',
              displayName: 'id',
            },
          },
          {
            name: 'date',
            properties: {
              description:
                'Date and time of the transaction.',
              displayName: 'date',
            },
          },
          {
            name: 'client_id',
            properties: {
              description:
                'Identifier of the customer who made the transaction.',
              displayName: 'client_id',
            },
          },
          {
            name: 'card_id',
            properties: {
              description:
                'Identifier of the card used for the transaction.',
              displayName: 'card_id',
            },
          },
          {
            name: 'amount',
            properties: {
              description:
                'Transaction amount in USD (negative values indicate refunds).',
              displayName: 'amount',
            },
          },
          {
            name: 'use_chip',
            properties: {
              description:
                'Method of transaction (e.g., Swipe Transaction, Chip Transaction, Online Transaction).',
              displayName: 'use_chip',
            },
          },
          {
            name: 'merchant_id',
            properties: {
              description:
                'Unique identifier of the merchant.',
              displayName: 'merchant_id',
            },
          },
          {
            name: 'merchant_city',
            properties: {
              description:
                'City where the merchant is located.',
              displayName: 'merchant_city',
            },
          },
          {
            name: 'merchant_state',
            properties: {
              description:
                'State where the merchant is located.',
              displayName: 'merchant_state',
            },
          },
          {
            name: 'zip',
            properties: {
              description: 'ZIP code of the merchant location.',
              displayName: 'zip',
            },
          },
          {
            name: 'mcc',
            properties: {
              description:
                'Merchant Category Code classifying the type of business.',
              displayName: 'mcc',
            },
          },
          {
            name: 'errors',
            properties: {
              description:
                'Transaction error codes, if any.',
              displayName: 'errors',
            },
          },
          {
            name: 'is_fraud',
            properties: {
              description:
                'Whether the transaction was flagged as fraudulent (Yes/No).',
              displayName: 'is_fraud',
            },
          },
        ],
        schema: [
          { columnName: 'id', dataType: 'INTEGER' },
          { columnName: 'date', dataType: 'TIMESTAMP' },
          { columnName: 'client_id', dataType: 'INTEGER' },
          { columnName: 'card_id', dataType: 'INTEGER' },
          { columnName: 'amount', dataType: 'DOUBLE' },
          { columnName: 'use_chip', dataType: 'VARCHAR' },
          { columnName: 'merchant_id', dataType: 'INTEGER' },
          { columnName: 'merchant_city', dataType: 'VARCHAR' },
          { columnName: 'merchant_state', dataType: 'VARCHAR' },
          { columnName: 'zip', dataType: 'VARCHAR' },
          { columnName: 'mcc', dataType: 'INTEGER' },
          { columnName: 'errors', dataType: 'VARCHAR' },
          { columnName: 'is_fraud', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'mcc_codes',
        primaryKey: 'mcc_code',
        filePath:
          'http://wren-ui:3000/sample_data/card_transaction/mcc_codes.parquet',
        properties: {
          displayName: 'mcc_codes',
          description:
            'Standard Merchant Category Codes (MCC) that classify business types for transaction categorization.',
        },
        columns: [
          {
            name: 'mcc_code',
            properties: {
              description: 'The Merchant Category Code.',
              displayName: 'mcc_code',
            },
          },
          {
            name: 'description',
            properties: {
              description:
                'Description of the merchant category.',
              displayName: 'description',
            },
          },
        ],
        schema: [
          { columnName: 'mcc_code', dataType: 'INTEGER' },
          { columnName: 'description', dataType: 'VARCHAR' },
        ],
      },
      {
        tableName: 'train_fraud_labels',
        primaryKey: 'transaction_id',
        filePath:
          'http://wren-ui:3000/sample_data/card_transaction/train_fraud_labels.parquet',
        properties: {
          displayName: 'train_fraud_labels',
          description:
            'Binary classification labels indicating whether each transaction is fraudulent (1) or legitimate (0). Used for training supervised fraud detection models.',
        },
        columns: [
          {
            name: 'transaction_id',
            properties: {
              description:
                'Identifier of the transaction this label applies to.',
              displayName: 'transaction_id',
            },
          },
          {
            name: 'is_fraud',
            properties: {
              description:
                'Binary fraud label: 1 indicates a fraudulent transaction, 0 indicates a legitimate transaction.',
              displayName: 'is_fraud',
            },
          },
        ],
        schema: [
          { columnName: 'transaction_id', dataType: 'INTEGER' },
          { columnName: 'is_fraud', dataType: 'INTEGER' },
        ],
      },
    ],
    questions: [
      {
        question:
          'What is the total transaction amount by card brand?',
        label: 'Spending Analysis',
      },
      {
        question:
          'Which merchant categories have the highest number of fraudulent transactions?',
        label: 'Fraud Detection',
      },
      {
        question:
          'What is the average credit score of customers grouped by gender?',
        label: 'Customer Analytics',
      },
    ],
    relations: [
      // users -> cards (one user has many cards)
      {
        fromModelName: 'users',
        fromColumnName: 'id',
        toModelName: 'cards',
        toColumnName: 'client_id',
        type: RelationType.ONE_TO_MANY,
      },
      // users -> transactions (one user has many transactions)
      {
        fromModelName: 'users',
        fromColumnName: 'id',
        toModelName: 'transactions',
        toColumnName: 'client_id',
        type: RelationType.ONE_TO_MANY,
      },
      // cards -> transactions (one card has many transactions)
      {
        fromModelName: 'cards',
        fromColumnName: 'id',
        toModelName: 'transactions',
        toColumnName: 'card_id',
        type: RelationType.ONE_TO_MANY,
      },
      // mcc_codes -> transactions (one mcc code has many transactions)
      {
        fromModelName: 'mcc_codes',
        fromColumnName: 'mcc_code',
        toModelName: 'transactions',
        toColumnName: 'mcc',
        type: RelationType.ONE_TO_MANY,
      },
      // transactions -> train_fraud_labels (one transaction has one fraud label)
      {
        fromModelName: 'transactions',
        fromColumnName: 'id',
        toModelName: 'train_fraud_labels',
        toColumnName: 'transaction_id',
        type: RelationType.ONE_TO_ONE,
      },
    ],
  },
  hotel_rating: {
    name: SampleDatasetName.HOTEL_RATING,
    tables: [
      {
        tableName: 'hotels',
        primaryKey: 'hotel_id',
        filePath:
          'http://wren-ui:3000/sample_data/hotel_rating/hotels.parquet',
        properties: {
          displayName: 'hotels',
          description:
            'Contains the hotel catalog with unique hotels and their key attributes including location, star rating, and base quality scores for cleanliness, comfort, and facilities.',
        },
        columns: [
          {
            name: 'hotel_id',
            properties: {
              description: 'Unique identifier for the hotel.',
              displayName: 'hotel_id',
            },
          },
          {
            name: 'hotel_name',
            properties: {
              description: 'Name of the hotel.',
              displayName: 'hotel_name',
            },
          },
          {
            name: 'city',
            properties: {
              description: 'City where the hotel is located.',
              displayName: 'city',
            },
          },
          {
            name: 'country',
            properties: {
              description: 'Country where the hotel is located.',
              displayName: 'country',
            },
          },
          {
            name: 'lat',
            properties: {
              description: 'Latitude coordinate of the hotel.',
              displayName: 'lat',
            },
          },
          {
            name: 'lon',
            properties: {
              description: 'Longitude coordinate of the hotel.',
              displayName: 'lon',
            },
          },
          {
            name: 'star_rating',
            properties: {
              description: 'Star rating of the hotel (3, 4, or 5 stars).',
              displayName: 'star_rating',
            },
          },
          {
            name: 'cleanliness_base',
            properties: {
              description:
                "Hotel's base cleanliness quality score (5.0-10.0).",
              displayName: 'cleanliness_base',
            },
          },
          {
            name: 'comfort_base',
            properties: {
              description:
                "Hotel's base comfort quality score (5.0-10.0).",
              displayName: 'comfort_base',
            },
          },
          {
            name: 'facilities_base',
            properties: {
              description:
                "Hotel's base facilities quality score (4.0-9.5).",
              displayName: 'facilities_base',
            },
          },
        ],
        schema: [
          { columnName: 'hotel_id', dataType: 'INTEGER' },
          { columnName: 'hotel_name', dataType: 'VARCHAR' },
          { columnName: 'city', dataType: 'VARCHAR' },
          { columnName: 'country', dataType: 'VARCHAR' },
          { columnName: 'lat', dataType: 'DOUBLE' },
          { columnName: 'lon', dataType: 'DOUBLE' },
          { columnName: 'star_rating', dataType: 'INTEGER' },
          { columnName: 'cleanliness_base', dataType: 'DOUBLE' },
          { columnName: 'comfort_base', dataType: 'DOUBLE' },
          { columnName: 'facilities_base', dataType: 'DOUBLE' },
        ],
      },
      {
        tableName: 'users',
        primaryKey: 'user_id',
        filePath:
          'http://wren-ui:3000/sample_data/hotel_rating/users.parquet',
        properties: {
          displayName: 'users',
          description:
            'Contains unique customers with demographic information including their country and age, useful for segmenting customers and understanding review behavior.',
        },
        columns: [
          {
            name: 'user_id',
            properties: {
              description: 'Unique identifier for the user.',
              displayName: 'user_id',
            },
          },
          {
            name: 'country',
            properties: {
              description: 'Country of origin of the user.',
              displayName: 'country',
            },
          },
          {
            name: 'age',
            properties: {
              description: 'Age of the user.',
              displayName: 'age',
            },
          },
        ],
        schema: [
          { columnName: 'user_id', dataType: 'INTEGER' },
          { columnName: 'country', dataType: 'VARCHAR' },
          { columnName: 'age', dataType: 'INTEGER' },
        ],
      },
      {
        tableName: 'reviews',
        primaryKey: 'review_id',
        filePath:
          'http://wren-ui:3000/sample_data/hotel_rating/reviews.parquet',
        properties: {
          displayName: 'reviews',
          description:
            'Central transactional table linking users to the hotels they reviewed, capturing the review_id, hotel_id, user_id, and a numerical review_score.',
        },
        columns: [
          {
            name: 'review_id',
            properties: {
              description: 'Unique identifier for the review.',
              displayName: 'review_id',
            },
          },
          {
            name: 'hotel_id',
            properties: {
              description:
                'Foreign key referencing the hotel being reviewed.',
              displayName: 'hotel_id',
            },
          },
          {
            name: 'user_id',
            properties: {
              description:
                'Foreign key referencing the user who wrote the review.',
              displayName: 'user_id',
            },
          },
          {
            name: 'review_score',
            properties: {
              description:
                'Numerical review score given by the user (1.0-10.0).',
              displayName: 'review_score',
            },
          },
        ],
        schema: [
          { columnName: 'review_id', dataType: 'INTEGER' },
          { columnName: 'hotel_id', dataType: 'INTEGER' },
          { columnName: 'user_id', dataType: 'INTEGER' },
          { columnName: 'review_score', dataType: 'DOUBLE' },
        ],
      },
    ],
    relations: [
      // hotels -> reviews (one hotel has many reviews)
      {
        fromModelName: 'hotels',
        fromColumnName: 'hotel_id',
        toModelName: 'reviews',
        toColumnName: 'hotel_id',
        type: RelationType.ONE_TO_MANY,
      },
      // users -> reviews (one user has many reviews)
      {
        fromModelName: 'users',
        fromColumnName: 'user_id',
        toModelName: 'reviews',
        toColumnName: 'user_id',
        type: RelationType.ONE_TO_MANY,
      },
    ],
  },
};

export const buildInitSql = (datasetName: SampleDatasetName) => {
  const selectedDataset = sampleDatasets[datasetName.toLowerCase()];

  return selectedDataset.tables
    .map((table) => {
      const schema = table.schema
        ?.map(({ columnName, dataType }) => `'${columnName}': '${dataType}'`)
        .join(', ');
      const fileExtension = table.filePath.split('.').pop();
      const createTableStatement = (fileType: string, schema?: string) => {
        if (fileType !== 'csv' && fileType !== 'parquet') {
          throw new Error(`Unsupported file type: ${fileType}`);
        }
        const baseStatement = `CREATE TABLE ${table.tableName} AS select * FROM read_${fileType}('${table.filePath}'`;
        const schemaPart =
          fileType === 'csv' && schema ? `, columns={${schema}}` : '';
        const headerPart = fileType === 'csv' ? ',header=true' : '';
        return `${baseStatement}${headerPart}${schemaPart});`;
      };

      return createTableStatement(fileExtension, schema);
    })
    .join('\n');
};

export const getRelations = (datasetName: SampleDatasetName) => {
  const selectedDataset = sampleDatasets[datasetName.toLowerCase()];
  return selectedDataset.relations;
};

export const getSampleAskQuestions = (datasetName: SampleDatasetName) => {
  const selectedDataset = sampleDatasets[datasetName.toLowerCase()];
  return selectedDataset.questions;
};
