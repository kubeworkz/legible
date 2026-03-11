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

export interface SampleContentThread {
  question: string;
  sql: string;
  answer?: string;
  chartDetail?: {
    description: string;
    chartType: string;
    chartSchema: Record<string, any>;
  };
}

export interface SampleContentSpreadsheet {
  name: string;
  sql: string;
}

export interface SampleContentDashboardItem {
  displayName: string;
  type: string; // DashboardItemType enum value
  sql: string;
  chartSchema?: Record<string, any>;
  layout: { x: number; y: number; w: number; h: number };
}

export interface SampleContentDashboard {
  name: string;
  items?: SampleContentDashboardItem[];
}

export interface SampleContent {
  dashboards?: SampleContentDashboard[];
  spreadsheets?: SampleContentSpreadsheet[];
  threads?: SampleContentThread[];
}

export interface SampleDataset {
  name: string; // SampleDatasetName
  tables: SampleDatasetTable[];
  questions?: SuggestedQuestion[];
  relations?: SampleDatasetRelationship[];
  sampleContent?: SampleContent;
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
        question:
          'What was the average monthly attrition rate for each department?',
        label: 'Descriptive',
      },
      {
        question:
          'What is the total number of employees broken down by Department and Gender?',
        label: 'Segmentation',
      },
      {
        question:
          'What is the median salary for a Manager compared to a Non-Manager in the Sales department for the most recent date available?',
        label: 'Comparative',
      },
    ],
    sampleContent: {
      dashboards: [
        {
          name: 'HR Report (2000/12/30)',
          items: [
            {
              displayName: 'Current Employee Count',
              type: 'NUMBER',
              sql: `SELECT COUNT(DISTINCT e.emp_no) AS current_employees
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
WHERE de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Average manager tenure (years)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(DATEDIFF('day', dm.from_date,
  CASE WHEN dm.to_date > DATE '2000-12-30' THEN DATE '2000-12-30' ELSE dm.to_date END
)) / 365.25, 2) AS avg_manager_tenure_years
FROM dept_manager dm
WHERE dm.from_date <= DATE '2000-12-30'`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Average employee (non-manager) tenure (years)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(DATEDIFF('day', de.from_date,
  CASE WHEN de.to_date > DATE '2000-12-30' THEN DATE '2000-12-30' ELSE de.to_date END
)) / 365.25, 2) AS avg_employee_tenure_years
FROM dept_emp de
WHERE de.from_date <= DATE '2000-12-30'
  AND de.emp_no NOT IN (
    SELECT dm.emp_no FROM dept_manager dm
    WHERE dm.from_date <= DATE '2000-12-30'
      AND dm.to_date >= DATE '2000-12-30'
  )`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'New Hires and Headcount by Dept (Until 2000)',
              type: 'STACKED_BAR',
              sql: `SELECT
  YEAR(de.from_date) AS hire_year,
  d.dept_name,
  COUNT(*) AS new_hires
FROM dept_emp de
JOIN departments d ON de.dept_no = d.dept_no
WHERE YEAR(de.from_date) BETWEEN 1985 AND 2000
GROUP BY YEAR(de.from_date), d.dept_name
ORDER BY hire_year, d.dept_name`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'hire_year', type: 'ordinal', title: 'Year' },
                  y: { field: 'new_hires', type: 'quantitative', title: 'New Hires', stack: true },
                  color: { field: 'dept_name', type: 'nominal', title: 'Department' },
                },
              },
              layout: { x: 0, y: 2, w: 6, h: 4 },
            },
            {
              displayName: 'Gender distribution of employees',
              type: 'PIE',
              sql: `SELECT e.gender, COUNT(DISTINCT e.emp_no) AS employee_count
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
WHERE de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
GROUP BY e.gender`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'employee_count', type: 'quantitative' },
                  color: { field: 'gender', type: 'nominal', title: 'Gender' },
                },
              },
              layout: { x: 0, y: 6, w: 3, h: 3 },
            },
            {
              displayName: 'Number of employees by department',
              type: 'BAR',
              sql: `SELECT d.dept_name, COUNT(DISTINCT e.emp_no) AS employee_count
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
WHERE de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
GROUP BY d.dept_name
ORDER BY employee_count DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department', sort: '-y' },
                  y: { field: 'employee_count', type: 'quantitative', title: 'Employees' },
                },
              },
              layout: { x: 3, y: 6, w: 3, h: 3 },
            },
            {
              displayName: 'Average Tenure by Department (Years)',
              type: 'BAR',
              sql: `SELECT d.dept_name,
  ROUND(AVG(DATEDIFF('day', de.from_date,
    CASE WHEN de.to_date > DATE '2000-12-30' THEN DATE '2000-12-30' ELSE de.to_date END
  )) / 365.25, 2) AS avg_tenure_years
FROM dept_emp de
JOIN departments d ON de.dept_no = d.dept_no
WHERE de.from_date <= DATE '2000-12-30'
GROUP BY d.dept_name
ORDER BY avg_tenure_years DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department', sort: '-y' },
                  y: { field: 'avg_tenure_years', type: 'quantitative', title: 'Avg Tenure (Years)' },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            {
              displayName: 'Distribution of Tenure by Tenure Brackets',
              type: 'BAR',
              sql: `SELECT
  CASE
    WHEN tenure_years < 2 THEN '0-2'
    WHEN tenure_years < 5 THEN '2-5'
    WHEN tenure_years < 10 THEN '5-10'
    WHEN tenure_years < 15 THEN '10-15'
    ELSE '15+'
  END AS tenure_bracket,
  COUNT(*) AS employee_count
FROM (
  SELECT DATEDIFF('day', de.from_date,
    CASE WHEN de.to_date > DATE '2000-12-30' THEN DATE '2000-12-30' ELSE de.to_date END
  ) / 365.25 AS tenure_years
  FROM dept_emp de
  WHERE de.from_date <= DATE '2000-12-30'
) sub
GROUP BY tenure_bracket
ORDER BY tenure_bracket`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'tenure_bracket', type: 'ordinal', title: 'Tenure Bracket (Years)', sort: ['0-2', '2-5', '5-10', '10-15', '15+'] },
                  y: { field: 'employee_count', type: 'quantitative', title: 'Employees' },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
            {
              displayName: 'Average Age of Employees',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(DATEDIFF('day', e.birth_date, DATE '2000-12-30') / 365.25), 1) AS avg_age
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
WHERE de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'`,
              layout: { x: 0, y: 12, w: 2, h: 2 },
            },
            {
              displayName: 'Age Distribution by Department',
              type: 'BAR',
              sql: `SELECT d.dept_name,
  ROUND(AVG(DATEDIFF('day', e.birth_date, DATE '2000-12-30') / 365.25), 1) AS avg_age
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
WHERE de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
GROUP BY d.dept_name
ORDER BY avg_age DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department', sort: '-y' },
                  y: { field: 'avg_age', type: 'quantitative', title: 'Average Age', scale: { zero: false } },
                },
              },
              layout: { x: 2, y: 12, w: 4, h: 3 },
            },
            {
              displayName: 'Employees Left by Year and Department (Up to 2000)',
              type: 'STACKED_BAR',
              sql: `SELECT
  YEAR(de.to_date) AS departure_year,
  d.dept_name,
  COUNT(*) AS departures
FROM dept_emp de
JOIN departments d ON de.dept_no = d.dept_no
WHERE de.to_date <= DATE '2000-12-30'
  AND de.to_date < DATE '9999-01-01'
  AND YEAR(de.to_date) BETWEEN 1985 AND 2000
GROUP BY YEAR(de.to_date), d.dept_name
ORDER BY departure_year, d.dept_name`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'departure_year', type: 'ordinal', title: 'Year' },
                  y: { field: 'departures', type: 'quantitative', title: 'Employees Left', stack: true },
                  color: { field: 'dept_name', type: 'nominal', title: 'Department' },
                },
              },
              layout: { x: 0, y: 15, w: 6, h: 4 },
            },
          ],
        },
        {
          name: 'Financial Report (2000/12/30)',
          items: [
            // 1. Salary expenditure in 2000 (Billion USD) — NUMBER
            {
              displayName: 'Salary expenditure in 2000 (Billion USD)',
              type: 'NUMBER',
              sql: `SELECT ROUND(SUM(s.salary) / 1000000000.0, 2) AS salary_expenditure_billions
FROM salaries s
WHERE s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'`,
              layout: { x: 0, y: 0, w: 2, h: 4 },
            },
            // 2. Annual Salary Expenditure and Avg Employee Salary by Year (≤2000) — BAR
            {
              displayName: 'Annual Salary Expenditure and Avg Employee Salary by Year (≤2000)',
              type: 'BAR',
              sql: `SELECT YEAR(s.from_date) AS yr,
  SUM(s.salary) AS total_salary_expenditure
FROM salaries s
WHERE YEAR(s.from_date) BETWEEN 1985 AND 2000
GROUP BY YEAR(s.from_date)
ORDER BY yr`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'yr', type: 'ordinal', title: 'Year' },
                  y: { field: 'total_salary_expenditure', type: 'quantitative', title: 'Total Salary Expenditure' },
                },
              },
              layout: { x: 2, y: 0, w: 4, h: 4 },
            },
            // 3. Average employee salary in 2000 (in thousands)(K) — NUMBER
            {
              displayName: 'Average employee salary in 2000 (in thousands)(K)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(s.salary) / 1000.0, 2) AS avg_salary_thousands
FROM salaries s
WHERE s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'`,
              layout: { x: 0, y: 4, w: 2, h: 4 },
            },
            // 4. Avg Salary vs. Age & Tenure Group, Larger Bubbles (2000) — BUBBLE
            {
              displayName: 'Avg Salary vs. Age & Tenure Group, Larger Bubbles (2000)',
              type: 'BAR',
              sql: `SELECT
  CASE
    WHEN age < 35 THEN '30-34'
    WHEN age < 40 THEN '35-39'
    WHEN age < 45 THEN '40-44'
    WHEN age < 50 THEN '45-49'
    WHEN age < 55 THEN '50-54'
    WHEN age < 60 THEN '55-59'
    ELSE '60+'
  END AS age_group,
  CASE
    WHEN tenure < 5 THEN '0-4 yrs'
    WHEN tenure < 10 THEN '5-9 yrs'
    WHEN tenure < 15 THEN '10-14 yrs'
    ELSE '15+ yrs'
  END AS tenure_group,
  ROUND(AVG(salary), 0) AS avg_salary,
  COUNT(*) AS employee_count
FROM (
  SELECT e.emp_no,
    DATEDIFF('day', e.birth_date, DATE '2000-12-30') / 365.25 AS age,
    DATEDIFF('day', de.from_date,
      CASE WHEN de.to_date > DATE '2000-12-30' THEN DATE '2000-12-30' ELSE de.to_date END
    ) / 365.25 AS tenure,
    s.salary
  FROM employees e
  JOIN dept_emp de ON e.emp_no = de.emp_no
  JOIN salaries s ON e.emp_no = s.emp_no
  WHERE de.from_date <= DATE '2000-12-30'
    AND de.to_date >= DATE '2000-12-30'
    AND s.from_date <= DATE '2000-12-30'
    AND s.to_date >= DATE '2000-12-30'
) sub
GROUP BY age_group, tenure_group
ORDER BY age_group, tenure_group`,
              chartSchema: {
                mark: { type: 'circle', tooltip: true, opacity: 0.7 },
                encoding: {
                  x: { field: 'age_group', type: 'ordinal', title: 'Age Group', sort: ['30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60+'] },
                  y: { field: 'avg_salary', type: 'quantitative', title: 'Average Salary', scale: { zero: false } },
                  size: { field: 'employee_count', type: 'quantitative', title: 'Employees' },
                  color: { field: 'tenure_group', type: 'nominal', title: 'Tenure Group' },
                },
              },
              layout: { x: 2, y: 4, w: 4, h: 4 },
            },
            // 5. Salary Expenditure by Department until Year 2000 — BAR
            {
              displayName: 'Salary Expenditure by Department until Year 2000',
              type: 'BAR',
              sql: `SELECT d.dept_name, SUM(s.salary) AS total_salary_expenditure
FROM salaries s
JOIN dept_emp de ON s.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
WHERE s.from_date <= DATE '2000-12-30'
  AND de.from_date <= DATE '2000-12-30'
GROUP BY d.dept_name
ORDER BY total_salary_expenditure DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department', sort: '-y' },
                  y: { field: 'total_salary_expenditure', type: 'quantitative', title: 'Total Salary Expenditure' },
                },
              },
              layout: { x: 0, y: 8, w: 2, h: 4 },
            },
            // 6. Average vs. Median Salary by Department (Descending Order) — GROUPED_BAR
            {
              displayName: 'Average vs. Median Salary by Department (Descending Order)',
              type: 'GROUPED_BAR',
              sql: `SELECT d.dept_name,
  ROUND(AVG(s.salary), 2) AS avg_salary,
  MEDIAN(s.salary) AS median_salary
FROM salaries s
JOIN dept_emp de ON s.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
WHERE s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'
  AND de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
GROUP BY d.dept_name
ORDER BY avg_salary DESC`,
              chartSchema: {
                transform: [
                  { fold: ['avg_salary', 'median_salary'], as: ['Metric', 'Salary'] },
                ],
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department', sort: '-y' },
                  y: { field: 'Salary', type: 'quantitative', title: 'Salary' },
                  xOffset: { field: 'Metric', type: 'nominal' },
                  color: { field: 'Metric', type: 'nominal', title: 'Metric' },
                },
              },
              layout: { x: 2, y: 8, w: 2, h: 4 },
            },
            // 7. Average Salary by Gender and Department (Descending Order) — GROUPED_BAR
            {
              displayName: 'Average Salary by Gender and Department (Descending Order)',
              type: 'GROUPED_BAR',
              sql: `SELECT d.dept_name, e.gender,
  ROUND(AVG(s.salary), 2) AS avg_salary
FROM employees e
JOIN salaries s ON e.emp_no = s.emp_no
JOIN dept_emp de ON e.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
WHERE s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'
  AND de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
GROUP BY d.dept_name, e.gender
ORDER BY avg_salary DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department', sort: '-y' },
                  y: { field: 'avg_salary', type: 'quantitative', title: 'Average Salary' },
                  xOffset: { field: 'gender', type: 'nominal' },
                  color: { field: 'gender', type: 'nominal', title: 'Gender' },
                },
              },
              layout: { x: 4, y: 8, w: 2, h: 4 },
            },
            // 8. Average Salary Comparison: Manager vs Non-Manager by Department — GROUPED_BAR
            {
              displayName: 'Average Salary Comparison: Manager vs Non-Manager by Department',
              type: 'GROUPED_BAR',
              sql: `SELECT d.dept_name,
  CASE WHEN dm.emp_no IS NOT NULL THEN 'Manager' ELSE 'Non-Manager' END AS employee_role,
  ROUND(AVG(s.salary), 2) AS avg_salary
FROM employees e
JOIN salaries s ON e.emp_no = s.emp_no
JOIN dept_emp de ON e.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
LEFT JOIN dept_manager dm ON e.emp_no = dm.emp_no
  AND dm.from_date <= DATE '2000-12-30'
  AND dm.to_date >= DATE '2000-12-30'
WHERE s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'
  AND de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
GROUP BY d.dept_name, employee_role
ORDER BY d.dept_name, employee_role`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'dept_name', type: 'nominal', title: 'Department' },
                  y: { field: 'avg_salary', type: 'quantitative', title: 'Average Salary' },
                  xOffset: { field: 'employee_role', type: 'nominal' },
                  color: { field: 'employee_role', type: 'nominal', title: 'Role' },
                },
              },
              layout: { x: 0, y: 12, w: 4, h: 5 },
            },
            // 9. Distribution of Average Salary: Manager vs Non-Manager — GROUPED_BAR
            {
              displayName: 'Distribution of Average Salary: Manager vs Non-Manager',
              type: 'GROUPED_BAR',
              sql: `SELECT
  CASE
    WHEN avg_salary < 50000 THEN '40-50K'
    WHEN avg_salary < 60000 THEN '50-60K'
    WHEN avg_salary < 70000 THEN '60-70K'
    WHEN avg_salary < 80000 THEN '70-80K'
    WHEN avg_salary < 90000 THEN '80-90K'
    WHEN avg_salary < 100000 THEN '90-100K'
    WHEN avg_salary < 110000 THEN '100-110K'
    WHEN avg_salary < 120000 THEN '110-120K'
    WHEN avg_salary < 130000 THEN '120-130K'
    WHEN avg_salary < 140000 THEN '130-140K'
    ELSE '140K+'
  END AS salary_bucket,
  employee_role,
  COUNT(*) AS frequency
FROM (
  SELECT e.emp_no,
    ROUND(AVG(s.salary), 0) AS avg_salary,
    CASE WHEN dm.emp_no IS NOT NULL THEN 'Manager' ELSE 'Non-Manager' END AS employee_role
  FROM employees e
  JOIN salaries s ON e.emp_no = s.emp_no
  LEFT JOIN dept_manager dm ON e.emp_no = dm.emp_no
    AND dm.from_date <= DATE '2000-12-30'
    AND dm.to_date >= DATE '2000-12-30'
  WHERE s.from_date <= DATE '2000-12-30'
    AND s.to_date >= DATE '2000-12-30'
  GROUP BY e.emp_no, employee_role
) sub
GROUP BY salary_bucket, employee_role
ORDER BY salary_bucket, employee_role`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'salary_bucket', type: 'ordinal', title: 'Average Salary',
                    sort: ['40-50K', '50-60K', '60-70K', '70-80K', '80-90K', '90-100K', '100-110K', '110-120K', '120-130K', '130-140K', '140K+'] },
                  y: { field: 'frequency', type: 'quantitative', title: 'Frequency' },
                  xOffset: { field: 'employee_role', type: 'nominal' },
                  color: { field: 'employee_role', type: 'nominal', title: 'Role' },
                },
              },
              layout: { x: 4, y: 12, w: 2, h: 5 },
            },
            // 10. Average Salary: Manager vs Non-Manager — horizontal BAR
            {
              displayName: 'Average Salary: Manager vs Non-Manager',
              type: 'BAR',
              sql: `SELECT
  CASE WHEN dm.emp_no IS NOT NULL THEN 'Manager' ELSE 'Non-Manager' END AS manager_status,
  ROUND(AVG(s.salary), 2) AS avg_salary
FROM employees e
JOIN salaries s ON e.emp_no = s.emp_no
LEFT JOIN dept_manager dm ON e.emp_no = dm.emp_no
  AND dm.from_date <= DATE '2000-12-30'
  AND dm.to_date >= DATE '2000-12-30'
WHERE s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'
GROUP BY manager_status`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  y: { field: 'manager_status', type: 'nominal', title: 'Manager Status' },
                  x: { field: 'avg_salary', type: 'quantitative', title: 'Average Salary' },
                },
              },
              layout: { x: 0, y: 17, w: 4, h: 3 },
            },
            // 11. Manager Salary by Year (<=2000): Gender Symbol, Dept Color — SCATTER
            {
              displayName: 'Manager Salary by Year (<=2000): Gender Symbol, Dept Color',
              type: 'BAR',
              sql: `SELECT YEAR(s.from_date) AS yr,
  d.dept_name,
  e.gender,
  s.salary
FROM employees e
JOIN dept_manager dm ON e.emp_no = dm.emp_no
JOIN salaries s ON e.emp_no = s.emp_no
JOIN dept_emp de ON e.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
WHERE YEAR(s.from_date) BETWEEN 1985 AND 2000
  AND dm.from_date <= s.to_date
  AND dm.to_date >= s.from_date
  AND de.from_date <= s.to_date
  AND de.to_date >= s.from_date
ORDER BY yr, d.dept_name`,
              chartSchema: {
                mark: { type: 'point', tooltip: true, filled: true, size: 80 },
                encoding: {
                  x: { field: 'yr', type: 'ordinal', title: 'Year' },
                  y: { field: 'salary', type: 'quantitative', title: 'Salary', scale: { zero: false } },
                  color: { field: 'dept_name', type: 'nominal', title: 'Department' },
                  shape: { field: 'gender', type: 'nominal', title: 'Gender' },
                },
              },
              layout: { x: 0, y: 20, w: 6, h: 5 },
            },
          ],
        },
      ],
      spreadsheets: [
        {
          name: "What are the employees' information in the Marketing and Sales departments as of December 30, 2000, ordered by average salary in descending order?",
          sql: `SELECT
  e.emp_no,
  e.first_name,
  e.last_name,
  e.gender,
  e.hire_date,
  d.dept_name,
  AVG(s.salary) AS avg_salary
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
JOIN departments d ON de.dept_no = d.dept_no
JOIN salaries s ON e.emp_no = s.emp_no
WHERE d.dept_name IN ('Marketing', 'Sales')
  AND de.from_date <= DATE '2000-12-30'
  AND de.to_date >= DATE '2000-12-30'
  AND s.from_date <= DATE '2000-12-30'
  AND s.to_date >= DATE '2000-12-30'
GROUP BY e.emp_no, e.first_name, e.last_name, e.gender, e.hire_date, d.dept_name
ORDER BY avg_salary DESC`,
        },
        {
          name: 'Who are the top 10 non-manager employees ranked by their average salary up to December 30, 2000?',
          sql: `SELECT
  e.emp_no,
  e.first_name,
  e.last_name,
  AVG(s.salary) AS avg_salary
FROM employees e
JOIN salaries s ON e.emp_no = s.emp_no
WHERE s.from_date <= DATE '2000-12-30'
  AND e.emp_no NOT IN (
    SELECT dm.emp_no FROM dept_manager dm
    WHERE dm.from_date <= DATE '2000-12-30'
      AND dm.to_date >= DATE '2000-12-30'
  )
GROUP BY e.emp_no, e.first_name, e.last_name
ORDER BY avg_salary DESC
LIMIT 10`,
        },
      ],
      threads: [
        {
          question: 'How many employees have worked in more than one department during their career here?',
          answer: 'A total of 31,579 employees have worked in more than one department during their career here.',
          sql: `SELECT COUNT(*) AS multi_dept_employees
FROM (
  SELECT emp_no
  FROM dept_emp
  GROUP BY emp_no
  HAVING COUNT(DISTINCT dept_no) > 1
) sub`,
          chartDetail: {
            description: 'Employees who worked in multiple departments',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: {
                  field: 'multi_dept_employees',
                  type: 'quantitative',
                  title: 'Number of Employees',
                },
                y: {
                  datum: 'Employees',
                  type: 'nominal',
                  title: '',
                },
              },
            },
          },
        },
        {
          question: 'Can you give me the average salary and median salary for men and women?',
          answer: 'For male employees, the average salary is approximately $63,838 with a median salary of $62,404. For female employees, the average salary is approximately $63,770 with a median salary of $62,329.',
          sql: `SELECT
  e.gender,
  AVG(s.salary) AS avg_salary,
  MEDIAN(s.salary) AS median_salary
FROM employees e
JOIN salaries s ON e.emp_no = s.emp_no
GROUP BY e.gender`,
          chartDetail: {
            description: 'Average and median salary comparison by gender',
            chartType: 'GROUPED_BAR',
            chartSchema: {
              transform: [
                {
                  fold: ['avg_salary', 'median_salary'],
                  as: ['Metric', 'Salary'],
                },
              ],
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: {
                  field: 'gender',
                  type: 'nominal',
                  title: 'Gender',
                },
                y: {
                  field: 'Salary',
                  type: 'quantitative',
                  title: 'Salary ($)',
                },
                xOffset: { field: 'Metric', type: 'nominal' },
                color: {
                  field: 'Metric',
                  type: 'nominal',
                  title: 'Metric',
                  scale: { range: ['#5B8FF9', '#5AD8A6'] },
                },
              },
            },
          },
        },
      ],
    },
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
    sampleContent: {
      dashboards: [
        {
          name: 'Operational Logistics',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Orders',
              type: 'NUMBER',
              sql: `SELECT COUNT(DISTINCT order_id) AS total_orders FROM olist_orders_dataset`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Total Freight Cost (R$)',
              type: 'NUMBER',
              sql: `SELECT ROUND(SUM(freight_value), 2) AS total_freight FROM olist_order_items_dataset`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Delivery Days',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(DATEDIFF('day', order_purchase_timestamp, order_delivered_customer_date)), 1) AS avg_delivery_days
FROM olist_orders_dataset
WHERE order_delivered_customer_date IS NOT NULL`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Orders by status (PIE)
            {
              displayName: 'Orders by Status',
              type: 'PIE',
              sql: `SELECT order_status, COUNT(*) AS order_count
FROM olist_orders_dataset
GROUP BY order_status`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'order_count', type: 'quantitative' },
                  color: { field: 'order_status', type: 'nominal', title: 'Status' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Avg freight by customer state (BAR)
            {
              displayName: 'Avg Freight Cost by Customer State (Top 10)',
              type: 'BAR',
              sql: `SELECT c.customer_state, ROUND(AVG(oi.freight_value), 2) AS avg_freight
FROM olist_order_items_dataset oi
JOIN olist_orders_dataset o ON oi.order_id = o.order_id
JOIN olist_customers_dataset c ON o.customer_id = c.customer_id
GROUP BY c.customer_state
ORDER BY avg_freight DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'customer_state', type: 'nominal', title: 'State', sort: '-y' },
                  y: { field: 'avg_freight', type: 'quantitative', title: 'Avg Freight (R$)' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Monthly order volume trend (LINE)
            {
              displayName: 'Monthly Order Volume Trend',
              type: 'BAR',
              sql: `SELECT
  STRFTIME(order_purchase_timestamp, '%Y-%m') AS order_month,
  COUNT(DISTINCT order_id) AS order_count
FROM olist_orders_dataset
WHERE order_purchase_timestamp >= DATE '2017-01-01'
  AND order_purchase_timestamp < DATE '2019-01-01'
GROUP BY STRFTIME(order_purchase_timestamp, '%Y-%m')
ORDER BY order_month`,
              chartSchema: {
                mark: { type: 'line', tooltip: true, point: true },
                encoding: {
                  x: { field: 'order_month', type: 'ordinal', title: 'Month' },
                  y: { field: 'order_count', type: 'quantitative', title: 'Orders' },
                },
              },
              layout: { x: 0, y: 5, w: 6, h: 4 },
            },
            // Row 9 — Late delivery rate by state (BAR)
            {
              displayName: 'Late Delivery Rate by State (Top 10)',
              type: 'BAR',
              sql: `SELECT c.customer_state,
  ROUND(100.0 * SUM(CASE WHEN o.order_delivered_customer_date > o.order_estimated_delivery_date THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct
FROM olist_orders_dataset o
JOIN olist_customers_dataset c ON o.customer_id = c.customer_id
WHERE o.order_delivered_customer_date IS NOT NULL
GROUP BY c.customer_state
ORDER BY late_pct DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'customer_state', type: 'nominal', title: 'State', sort: '-y' },
                  y: { field: 'late_pct', type: 'quantitative', title: 'Late Delivery %' },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            // Row 9 — Avg delivery time vs estimate by state
            {
              displayName: 'Delivery Time vs Estimated (Top 10 States)',
              type: 'BAR',
              sql: `SELECT c.customer_state,
  ROUND(AVG(DATEDIFF('day', o.order_purchase_timestamp, o.order_delivered_customer_date)), 1) AS avg_actual_days,
  ROUND(AVG(DATEDIFF('day', o.order_purchase_timestamp, o.order_estimated_delivery_date)), 1) AS avg_estimated_days
FROM olist_orders_dataset o
JOIN olist_customers_dataset c ON o.customer_id = c.customer_id
WHERE o.order_delivered_customer_date IS NOT NULL
GROUP BY c.customer_state
ORDER BY COUNT(*) DESC
LIMIT 10`,
              chartSchema: {
                transform: [
                  { fold: ['avg_actual_days', 'avg_estimated_days'], as: ['Metric', 'Days'] },
                ],
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'customer_state', type: 'nominal', title: 'State' },
                  y: { field: 'Days', type: 'quantitative', title: 'Days' },
                  xOffset: { field: 'Metric', type: 'nominal' },
                  color: { field: 'Metric', type: 'nominal', title: 'Metric', scale: { range: ['#5B8FF9', '#5AD8A6'] } },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
          ],
        },
        {
          name: 'Sales Report',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Revenue (R$)',
              type: 'NUMBER',
              sql: `SELECT ROUND(SUM(payment_value), 2) AS total_revenue FROM olist_order_payments_dataset`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Order Value (R$)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(order_total), 2) AS avg_order_value
FROM (
  SELECT order_id, SUM(payment_value) AS order_total
  FROM olist_order_payments_dataset
  GROUP BY order_id
) sub`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Total Unique Customers',
              type: 'NUMBER',
              sql: `SELECT COUNT(DISTINCT customer_unique_id) AS unique_customers FROM olist_customers_dataset`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Revenue by payment type (PIE)
            {
              displayName: 'Revenue by Payment Type',
              type: 'PIE',
              sql: `SELECT payment_type, ROUND(SUM(payment_value), 2) AS total_value
FROM olist_order_payments_dataset
GROUP BY payment_type`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'total_value', type: 'quantitative' },
                  color: { field: 'payment_type', type: 'nominal', title: 'Payment Type' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Top 10 product categories by revenue (BAR)
            {
              displayName: 'Top 10 Product Categories by Revenue',
              type: 'BAR',
              sql: `SELECT t.product_category_name_english AS category, ROUND(SUM(oi.price), 2) AS revenue
FROM olist_order_items_dataset oi
JOIN olist_products_dataset p ON oi.product_id = p.product_id
JOIN product_category_name_translation t ON p.product_category_name = t.product_category_name
GROUP BY t.product_category_name_english
ORDER BY revenue DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'category', type: 'nominal', title: 'Category', sort: '-y' },
                  y: { field: 'revenue', type: 'quantitative', title: 'Revenue (R$)' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Monthly revenue trend (LINE)
            {
              displayName: 'Monthly Revenue Trend',
              type: 'BAR',
              sql: `SELECT
  STRFTIME(o.order_purchase_timestamp, '%Y-%m') AS order_month,
  ROUND(SUM(p.payment_value), 2) AS monthly_revenue
FROM olist_orders_dataset o
JOIN olist_order_payments_dataset p ON o.order_id = p.order_id
WHERE o.order_purchase_timestamp >= DATE '2017-01-01'
  AND o.order_purchase_timestamp < DATE '2019-01-01'
GROUP BY STRFTIME(o.order_purchase_timestamp, '%Y-%m')
ORDER BY order_month`,
              chartSchema: {
                mark: { type: 'line', tooltip: true, point: true },
                encoding: {
                  x: { field: 'order_month', type: 'ordinal', title: 'Month' },
                  y: { field: 'monthly_revenue', type: 'quantitative', title: 'Revenue (R$)' },
                },
              },
              layout: { x: 0, y: 5, w: 6, h: 4 },
            },
            // Row 9 — Revenue by customer state (BAR)
            {
              displayName: 'Revenue by Customer State (Top 10)',
              type: 'BAR',
              sql: `SELECT c.customer_state, ROUND(SUM(p.payment_value), 2) AS revenue
FROM olist_orders_dataset o
JOIN olist_customers_dataset c ON o.customer_id = c.customer_id
JOIN olist_order_payments_dataset p ON o.order_id = p.order_id
GROUP BY c.customer_state
ORDER BY revenue DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'customer_state', type: 'nominal', title: 'State', sort: '-y' },
                  y: { field: 'revenue', type: 'quantitative', title: 'Revenue (R$)' },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            // Row 9 — Avg review score by category (BAR)
            {
              displayName: 'Avg Review Score by Top 10 Categories',
              type: 'BAR',
              sql: `SELECT t.product_category_name_english AS category,
  ROUND(AVG(r.review_score), 2) AS avg_score
FROM olist_order_items_dataset oi
JOIN olist_products_dataset p ON oi.product_id = p.product_id
JOIN product_category_name_translation t ON p.product_category_name = t.product_category_name
JOIN olist_order_reviews_dataset r ON oi.order_id = r.order_id
GROUP BY t.product_category_name_english
ORDER BY COUNT(*) DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'category', type: 'nominal', title: 'Category' },
                  y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score', scale: { domain: [0, 5] } },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
            // Row 12 — Stacked: Revenue by state + payment type
            {
              displayName: 'Revenue by State & Payment Type (Top 5 States)',
              type: 'STACKED_BAR',
              sql: `SELECT c.customer_state, p.payment_type, ROUND(SUM(p.payment_value), 2) AS revenue
FROM olist_orders_dataset o
JOIN olist_customers_dataset c ON o.customer_id = c.customer_id
JOIN olist_order_payments_dataset p ON o.order_id = p.order_id
WHERE c.customer_state IN (
  SELECT customer_state FROM (
    SELECT c2.customer_state, SUM(p2.payment_value) AS s
    FROM olist_orders_dataset o2
    JOIN olist_customers_dataset c2 ON o2.customer_id = c2.customer_id
    JOIN olist_order_payments_dataset p2 ON o2.order_id = p2.order_id
    GROUP BY c2.customer_state
    ORDER BY s DESC
    LIMIT 5
  )
)
GROUP BY c.customer_state, p.payment_type
ORDER BY c.customer_state, p.payment_type`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'customer_state', type: 'nominal', title: 'State' },
                  y: { field: 'revenue', type: 'quantitative', title: 'Revenue (R$)', stack: true },
                  color: { field: 'payment_type', type: 'nominal', title: 'Payment Type' },
                },
              },
              layout: { x: 0, y: 12, w: 6, h: 4 },
            },
          ],
        },
      ],
      spreadsheets: [
        {
          name: 'Which customers made purchases in 2017 but not in 2018?',
          sql: `SELECT
  c.customer_unique_id,
  c.customer_city,
  c.customer_state,
  COUNT(DISTINCT o.order_id) AS orders_in_2017
FROM olist_customers_dataset c
JOIN olist_orders_dataset o ON c.customer_id = o.customer_id
WHERE YEAR(o.order_purchase_timestamp) = 2017
  AND c.customer_unique_id NOT IN (
    SELECT c2.customer_unique_id
    FROM olist_customers_dataset c2
    JOIN olist_orders_dataset o2 ON c2.customer_id = o2.customer_id
    WHERE YEAR(o2.order_purchase_timestamp) = 2018
  )
GROUP BY c.customer_unique_id, c.customer_city, c.customer_state
ORDER BY orders_in_2017 DESC`,
        },
        {
          name: 'Which are the top 5 sellers with the lowest average review scores? (show me 10 records)',
          sql: `SELECT
  s.seller_id,
  s.seller_city,
  s.seller_state,
  ROUND(AVG(r.review_score), 2) AS avg_review_score,
  COUNT(DISTINCT r.review_id) AS review_count
FROM olist_sellers_dataset s
JOIN olist_order_items_dataset oi ON s.seller_id = oi.seller_id
JOIN olist_order_reviews_dataset r ON oi.order_id = r.order_id
GROUP BY s.seller_id, s.seller_city, s.seller_state
HAVING COUNT(DISTINCT r.review_id) >= 10
ORDER BY avg_review_score ASC
LIMIT 10`,
        },
      ],
      threads: [
        {
          question: 'Does the number of pictures affect the selling amount of that product?',
          answer: 'Yes, there is a positive correlation. Products with more photos tend to have higher total sales revenue. Products with 1 photo average about R$137 per sale, while products with 10+ photos average significantly more. However, the relationship plateaus around 6-7 photos.',
          sql: `SELECT
  p.product_photos_qty,
  COUNT(DISTINCT oi.order_id) AS total_orders,
  ROUND(SUM(oi.price), 2) AS total_revenue,
  ROUND(AVG(oi.price), 2) AS avg_price
FROM olist_products_dataset p
JOIN olist_order_items_dataset oi ON p.product_id = oi.product_id
WHERE p.product_photos_qty IS NOT NULL
GROUP BY p.product_photos_qty
ORDER BY p.product_photos_qty`,
          chartDetail: {
            description: 'Total revenue by number of product photos',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'product_photos_qty', type: 'ordinal', title: 'Number of Photos' },
                y: { field: 'total_revenue', type: 'quantitative', title: 'Total Revenue (R$)' },
              },
            },
          },
        },
        {
          question: 'Can you show me the relationship between review and product value?',
          answer: 'There is a moderate inverse relationship between product price and review scores. Lower-priced items (under R$100) tend to receive slightly higher average review scores (~4.1), while higher-priced items ($500+) receive lower scores (~3.7). This suggests that customers purchasing expensive items may have higher expectations.',
          sql: `SELECT
  CASE
    WHEN oi.price < 50 THEN 'Under R$50'
    WHEN oi.price < 100 THEN 'R$50-100'
    WHEN oi.price < 200 THEN 'R$100-200'
    WHEN oi.price < 500 THEN 'R$200-500'
    ELSE 'R$500+'
  END AS price_range,
  ROUND(AVG(r.review_score), 2) AS avg_review_score,
  COUNT(DISTINCT r.review_id) AS review_count
FROM olist_order_items_dataset oi
JOIN olist_order_reviews_dataset r ON oi.order_id = r.order_id
GROUP BY price_range
ORDER BY price_range`,
          chartDetail: {
            description: 'Average review score by product price range',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'price_range', type: 'ordinal', title: 'Price Range',
                  sort: ['Under R$50', 'R$50-100', 'R$100-200', 'R$200-500', 'R$500+'] },
                y: { field: 'avg_review_score', type: 'quantitative', title: 'Avg Review Score', scale: { domain: [0, 5] } },
              },
            },
          },
        },
      ],
    },
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
    sampleContent: {
      dashboards: [
        {
          name: 'Fraud Risk',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Fraud Transactions',
              type: 'NUMBER',
              sql: `SELECT COUNT(*) AS total_fraud FROM transactions WHERE is_fraud = 'Yes'`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Fraud Rate (%)',
              type: 'NUMBER',
              sql: `SELECT ROUND(100.0 * SUM(CASE WHEN is_fraud = 'Yes' THEN 1 ELSE 0 END) / COUNT(*), 2) AS fraud_rate FROM transactions`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Total Fraud Amount ($)',
              type: 'NUMBER',
              sql: `SELECT ROUND(SUM(amount), 2) AS total_fraud_amount FROM transactions WHERE is_fraud = 'Yes'`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Fraud by transaction method (PIE)
            {
              displayName: 'Fraud by Transaction Method',
              type: 'PIE',
              sql: `SELECT use_chip, COUNT(*) AS fraud_count
FROM transactions
WHERE is_fraud = 'Yes'
GROUP BY use_chip`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'fraud_count', type: 'quantitative' },
                  color: { field: 'use_chip', type: 'nominal', title: 'Method' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Top 10 merchant categories by fraud count (BAR)
            {
              displayName: 'Top 10 Merchant Categories by Fraud',
              type: 'BAR',
              sql: `SELECT mc.description AS category, COUNT(*) AS fraud_count
FROM transactions t
JOIN mcc_codes mc ON t.mcc = mc.mcc_code
WHERE t.is_fraud = 'Yes'
GROUP BY mc.description
ORDER BY fraud_count DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'category', type: 'nominal', title: 'Merchant Category', sort: '-y' },
                  y: { field: 'fraud_count', type: 'quantitative', title: 'Fraud Count' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Monthly fraud trend (LINE)
            {
              displayName: 'Monthly Fraud Transaction Trend',
              type: 'BAR',
              sql: `SELECT
  STRFTIME(date, '%Y-%m') AS txn_month,
  COUNT(*) AS fraud_count
FROM transactions
WHERE is_fraud = 'Yes'
GROUP BY STRFTIME(date, '%Y-%m')
ORDER BY txn_month`,
              chartSchema: {
                mark: { type: 'line', tooltip: true, point: true },
                encoding: {
                  x: { field: 'txn_month', type: 'ordinal', title: 'Month' },
                  y: { field: 'fraud_count', type: 'quantitative', title: 'Fraud Transactions' },
                },
              },
              layout: { x: 0, y: 5, w: 6, h: 4 },
            },
            // Row 9 — Fraud by card brand (BAR)
            {
              displayName: 'Fraud by Card Brand',
              type: 'BAR',
              sql: `SELECT c.card_brand, COUNT(*) AS fraud_count
FROM transactions t
JOIN cards c ON t.card_id = c.id
WHERE t.is_fraud = 'Yes'
GROUP BY c.card_brand
ORDER BY fraud_count DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'card_brand', type: 'nominal', title: 'Card Brand', sort: '-y' },
                  y: { field: 'fraud_count', type: 'quantitative', title: 'Fraud Count' },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            // Row 9 — Fraud amount distribution by card type (BAR)
            {
              displayName: 'Fraud Amount by Card Type',
              type: 'BAR',
              sql: `SELECT c.card_type, ROUND(SUM(t.amount), 2) AS fraud_amount
FROM transactions t
JOIN cards c ON t.card_id = c.id
WHERE t.is_fraud = 'Yes'
GROUP BY c.card_type
ORDER BY fraud_amount DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'card_type', type: 'nominal', title: 'Card Type', sort: '-y' },
                  y: { field: 'fraud_amount', type: 'quantitative', title: 'Fraud Amount ($)' },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
          ],
        },
        {
          name: 'Financial Planning & Market Analysis',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Transaction Volume',
              type: 'NUMBER',
              sql: `SELECT COUNT(*) AS total_transactions FROM transactions`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Total Transaction Amount ($)',
              type: 'NUMBER',
              sql: `SELECT ROUND(SUM(amount), 2) AS total_amount FROM transactions WHERE amount > 0`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Transaction Amount ($)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(amount), 2) AS avg_amount FROM transactions WHERE amount > 0`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Spending by card brand (PIE)
            {
              displayName: 'Spending by Card Brand',
              type: 'PIE',
              sql: `SELECT c.card_brand, ROUND(SUM(t.amount), 2) AS total_spent
FROM transactions t
JOIN cards c ON t.card_id = c.id
WHERE t.amount > 0
GROUP BY c.card_brand`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'total_spent', type: 'quantitative' },
                  color: { field: 'card_brand', type: 'nominal', title: 'Card Brand' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Top 10 merchant categories by spend (BAR)
            {
              displayName: 'Top 10 Merchant Categories by Spend',
              type: 'BAR',
              sql: `SELECT mc.description AS category, ROUND(SUM(t.amount), 2) AS total_spent
FROM transactions t
JOIN mcc_codes mc ON t.mcc = mc.mcc_code
WHERE t.amount > 0
GROUP BY mc.description
ORDER BY total_spent DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'category', type: 'nominal', title: 'Merchant Category', sort: '-y' },
                  y: { field: 'total_spent', type: 'quantitative', title: 'Total Spent ($)' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Monthly transaction volume trend (LINE)
            {
              displayName: 'Monthly Transaction Volume Trend',
              type: 'BAR',
              sql: `SELECT
  STRFTIME(date, '%Y-%m') AS txn_month,
  COUNT(*) AS txn_count,
  ROUND(SUM(amount), 2) AS total_amount
FROM transactions
WHERE amount > 0
GROUP BY STRFTIME(date, '%Y-%m')
ORDER BY txn_month`,
              chartSchema: {
                mark: { type: 'line', tooltip: true, point: true },
                encoding: {
                  x: { field: 'txn_month', type: 'ordinal', title: 'Month' },
                  y: { field: 'txn_count', type: 'quantitative', title: 'Transactions' },
                },
              },
              layout: { x: 0, y: 5, w: 6, h: 4 },
            },
            // Row 9 — Income distribution of customers (BAR)
            {
              displayName: 'Customer Income Distribution',
              type: 'BAR',
              sql: `SELECT
  CASE
    WHEN yearly_income < 20000 THEN 'Under $20k'
    WHEN yearly_income < 40000 THEN '$20k-40k'
    WHEN yearly_income < 60000 THEN '$40k-60k'
    WHEN yearly_income < 80000 THEN '$60k-80k'
    WHEN yearly_income < 100000 THEN '$80k-100k'
    ELSE '$100k+'
  END AS income_bracket,
  COUNT(*) AS customer_count
FROM users
GROUP BY income_bracket
ORDER BY income_bracket`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'income_bracket', type: 'ordinal', title: 'Income Bracket',
                    sort: ['Under $20k', '$20k-40k', '$40k-60k', '$60k-80k', '$80k-100k', '$100k+'] },
                  y: { field: 'customer_count', type: 'quantitative', title: 'Customers' },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            // Row 9 — Avg credit score by gender (BAR)
            {
              displayName: 'Avg Credit Score by Gender',
              type: 'BAR',
              sql: `SELECT gender, ROUND(AVG(credit_score), 0) AS avg_credit_score
FROM users
GROUP BY gender
ORDER BY avg_credit_score DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'gender', type: 'nominal', title: 'Gender' },
                  y: { field: 'avg_credit_score', type: 'quantitative', title: 'Avg Credit Score' },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
            // Row 12 — Spending by transaction method stacked by card brand
            {
              displayName: 'Spending by Method & Card Brand',
              type: 'STACKED_BAR',
              sql: `SELECT t.use_chip, c.card_brand, ROUND(SUM(t.amount), 2) AS total_spent
FROM transactions t
JOIN cards c ON t.card_id = c.id
WHERE t.amount > 0
GROUP BY t.use_chip, c.card_brand
ORDER BY t.use_chip, c.card_brand`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'use_chip', type: 'nominal', title: 'Transaction Method' },
                  y: { field: 'total_spent', type: 'quantitative', title: 'Total Spent ($)', stack: true },
                  color: { field: 'card_brand', type: 'nominal', title: 'Card Brand' },
                },
              },
              layout: { x: 0, y: 12, w: 6, h: 4 },
            },
          ],
        },
      ],
      spreadsheets: [
        {
          name: 'Which online transactions with amounts greater than 113.83 were identified as fraudulent, including details about the transaction, merchant category, and card type?',
          sql: `SELECT
  t.id AS transaction_id,
  t.date,
  t.amount,
  t.use_chip AS transaction_method,
  t.merchant_city,
  t.merchant_state,
  mc.description AS merchant_category,
  c.card_brand,
  c.card_type,
  u.current_age,
  u.gender
FROM transactions t
JOIN mcc_codes mc ON t.mcc = mc.mcc_code
JOIN cards c ON t.card_id = c.id
JOIN users u ON t.client_id = u.id
WHERE t.is_fraud = 'Yes'
  AND t.use_chip = 'Online Transaction'
  AND t.amount > 113.83
ORDER BY t.amount DESC`,
        },
        {
          name: 'Which are the top 10 users with the highest total transaction values, along with their age, yearly income, credit score, and rank?',
          sql: `SELECT
  u.id AS user_id,
  u.current_age,
  u.gender,
  u.yearly_income,
  u.credit_score,
  ROUND(SUM(t.amount), 2) AS total_transaction_value,
  ROW_NUMBER() OVER (ORDER BY SUM(t.amount) DESC) AS rank
FROM users u
JOIN transactions t ON u.id = t.client_id
WHERE t.amount > 0
GROUP BY u.id, u.current_age, u.gender, u.yearly_income, u.credit_score
ORDER BY total_transaction_value DESC
LIMIT 10`,
        },
      ],
      threads: [
        {
          question: 'Give me all the records of fraud transactions',
          answer: 'Here are the fraud transaction records from the dataset. Each row includes the transaction ID, date, amount, merchant details, and the card/user information associated with the fraudulent activity.',
          sql: `SELECT
  t.id AS transaction_id,
  t.date,
  t.amount,
  t.use_chip AS transaction_method,
  t.merchant_city,
  t.merchant_state,
  mc.description AS merchant_category,
  c.card_brand,
  c.card_type,
  u.current_age,
  u.gender,
  u.yearly_income
FROM transactions t
JOIN mcc_codes mc ON t.mcc = mc.mcc_code
JOIN cards c ON t.card_id = c.id
JOIN users u ON t.client_id = u.id
WHERE t.is_fraud = 'Yes'
ORDER BY t.date DESC`,
        },
        {
          question: "What's the pattern of these fraud transactions",
          answer: 'Fraud transactions show several notable patterns: (1) Online transactions have the highest fraud rate compared to chip or swipe methods, (2) Certain merchant categories like grocery stores and gas stations see disproportionately more fraud, (3) Fraud amounts tend to cluster in specific ranges — many are small transactions under $50 but there are also spikes in the $100-200 range, (4) Fraud is fairly evenly distributed across card brands but credit cards are targeted more than debit cards.',
          sql: `SELECT
  t.use_chip AS transaction_method,
  c.card_type,
  CASE
    WHEN t.amount < 25 THEN 'Under $25'
    WHEN t.amount < 50 THEN '$25-50'
    WHEN t.amount < 100 THEN '$50-100'
    WHEN t.amount < 200 THEN '$100-200'
    ELSE '$200+'
  END AS amount_range,
  COUNT(*) AS fraud_count,
  ROUND(AVG(t.amount), 2) AS avg_fraud_amount
FROM transactions t
JOIN cards c ON t.card_id = c.id
WHERE t.is_fraud = 'Yes'
GROUP BY t.use_chip, c.card_type, amount_range
ORDER BY fraud_count DESC`,
          chartDetail: {
            description: 'Fraud transaction count by transaction method and amount range',
            chartType: 'STACKED_BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'transaction_method', type: 'nominal', title: 'Transaction Method' },
                y: { field: 'fraud_count', type: 'quantitative', title: 'Fraud Count', stack: true },
                color: { field: 'amount_range', type: 'nominal', title: 'Amount Range' },
              },
            },
          },
        },
      ],
    },
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
          {
            name: 'traveller_type',
            properties: {
              description: 'Type of traveller (Family, Solo, Couple, or Group).',
              displayName: 'traveller_type',
            },
          },
          {
            name: 'join_year',
            properties: {
              description: 'Year the user joined the platform.',
              displayName: 'join_year',
            },
          },
        ],
        schema: [
          { columnName: 'user_id', dataType: 'INTEGER' },
          { columnName: 'country', dataType: 'VARCHAR' },
          { columnName: 'age', dataType: 'INTEGER' },
          { columnName: 'traveller_type', dataType: 'VARCHAR' },
          { columnName: 'join_year', dataType: 'INTEGER' },
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
    sampleContent: {
      dashboards: [
        {
          name: 'User Behavior',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Reviewers',
              type: 'NUMBER',
              sql: `SELECT COUNT(DISTINCT user_id) AS total_reviewers FROM reviews`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Review Score',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(review_score), 2) AS avg_score FROM reviews`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Total Reviews',
              type: 'NUMBER',
              sql: `SELECT COUNT(*) AS total_reviews FROM reviews`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Reviews by traveller type (PIE)
            {
              displayName: 'Reviews by Traveller Type',
              type: 'PIE',
              sql: `SELECT u.traveller_type, COUNT(*) AS review_count
FROM reviews r
JOIN users u ON r.user_id = u.user_id
GROUP BY u.traveller_type`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'review_count', type: 'quantitative' },
                  color: { field: 'traveller_type', type: 'nominal', title: 'Traveller Type' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Avg score by traveller type (BAR)
            {
              displayName: 'Avg Score by Traveller Type',
              type: 'BAR',
              sql: `SELECT u.traveller_type, ROUND(AVG(r.review_score), 2) AS avg_score
FROM reviews r
JOIN users u ON r.user_id = u.user_id
GROUP BY u.traveller_type
ORDER BY avg_score DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'traveller_type', type: 'nominal', title: 'Traveller Type', sort: '-y' },
                  y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Avg score by user age bracket (BAR)
            {
              displayName: 'Avg Review Score by Age Group',
              type: 'BAR',
              sql: `SELECT
  CASE
    WHEN u.age < 25 THEN 'Under 25'
    WHEN u.age < 35 THEN '25-34'
    WHEN u.age < 45 THEN '35-44'
    WHEN u.age < 55 THEN '45-54'
    WHEN u.age < 65 THEN '55-64'
    ELSE '65+'
  END AS age_group,
  ROUND(AVG(r.review_score), 2) AS avg_score,
  COUNT(*) AS review_count
FROM reviews r
JOIN users u ON r.user_id = u.user_id
GROUP BY age_group
ORDER BY age_group`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'age_group', type: 'ordinal', title: 'Age Group',
                    sort: ['Under 25', '25-34', '35-44', '45-54', '55-64', '65+'] },
                  y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score' },
                },
              },
              layout: { x: 0, y: 5, w: 6, h: 4 },
            },
            // Row 9 — Top 10 reviewer countries (BAR)
            {
              displayName: 'Top 10 Reviewer Countries',
              type: 'BAR',
              sql: `SELECT u.country, COUNT(*) AS review_count
FROM reviews r
JOIN users u ON r.user_id = u.user_id
GROUP BY u.country
ORDER BY review_count DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'country', type: 'nominal', title: 'Country', sort: '-y' },
                  y: { field: 'review_count', type: 'quantitative', title: 'Reviews' },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            // Row 9 — Avg score by join year (BAR)
            {
              displayName: 'Avg Score by Join Year',
              type: 'BAR',
              sql: `SELECT u.join_year, ROUND(AVG(r.review_score), 2) AS avg_score
FROM reviews r
JOIN users u ON r.user_id = u.user_id
GROUP BY u.join_year
ORDER BY u.join_year`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'join_year', type: 'ordinal', title: 'Join Year' },
                  y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score' },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
          ],
        },
        {
          name: 'Hotel Performance',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Hotels',
              type: 'NUMBER',
              sql: `SELECT COUNT(*) AS total_hotels FROM hotels`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Hotel Star Rating',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(star_rating), 1) AS avg_stars FROM hotels`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Cleanliness Score',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(cleanliness_base), 2) AS avg_cleanliness FROM hotels`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Hotels by star rating (PIE)
            {
              displayName: 'Hotels by Star Rating',
              type: 'PIE',
              sql: `SELECT star_rating || ' Stars' AS star_category, COUNT(*) AS hotel_count
FROM hotels
GROUP BY star_rating`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'hotel_count', type: 'quantitative' },
                  color: { field: 'star_category', type: 'nominal', title: 'Star Rating' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Top 10 hotels by avg review score (BAR)
            {
              displayName: 'Top 10 Hotels by Avg Review Score',
              type: 'BAR',
              sql: `SELECT h.hotel_name, ROUND(AVG(r.review_score), 2) AS avg_score
FROM reviews r
JOIN hotels h ON r.hotel_id = h.hotel_id
GROUP BY h.hotel_name
ORDER BY avg_score DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'hotel_name', type: 'nominal', title: 'Hotel', sort: '-y' },
                  y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Avg review score by country (BAR)
            {
              displayName: 'Avg Review Score by Hotel Country',
              type: 'BAR',
              sql: `SELECT h.country, ROUND(AVG(r.review_score), 2) AS avg_score, COUNT(*) AS review_count
FROM reviews r
JOIN hotels h ON r.hotel_id = h.hotel_id
GROUP BY h.country
ORDER BY avg_score DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'country', type: 'nominal', title: 'Country', sort: '-y' },
                  y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score' },
                },
              },
              layout: { x: 0, y: 5, w: 6, h: 4 },
            },
            // Row 9 — Cleanliness vs Comfort vs Facilities by star rating
            {
              displayName: 'Quality Scores by Star Rating',
              type: 'BAR',
              sql: `SELECT star_rating || ' Stars' AS star_category,
  ROUND(AVG(cleanliness_base), 2) AS avg_cleanliness,
  ROUND(AVG(comfort_base), 2) AS avg_comfort,
  ROUND(AVG(facilities_base), 2) AS avg_facilities
FROM hotels
GROUP BY star_rating
ORDER BY star_rating`,
              chartSchema: {
                transform: [
                  { fold: ['avg_cleanliness', 'avg_comfort', 'avg_facilities'], as: ['Quality Metric', 'Score'] },
                ],
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'star_category', type: 'nominal', title: 'Star Rating' },
                  y: { field: 'Score', type: 'quantitative', title: 'Score' },
                  xOffset: { field: 'Quality Metric', type: 'nominal' },
                  color: { field: 'Quality Metric', type: 'nominal', title: 'Metric', scale: { range: ['#5B8FF9', '#5AD8A6', '#F6BD16'] } },
                },
              },
              layout: { x: 0, y: 9, w: 3, h: 3 },
            },
            // Row 9 — Review score distribution (BAR)
            {
              displayName: 'Review Score Distribution',
              type: 'BAR',
              sql: `SELECT
  CASE
    WHEN review_score < 3 THEN '1-2'
    WHEN review_score < 5 THEN '3-4'
    WHEN review_score < 7 THEN '5-6'
    WHEN review_score < 9 THEN '7-8'
    ELSE '9-10'
  END AS score_range,
  COUNT(*) AS review_count
FROM reviews
GROUP BY score_range
ORDER BY score_range`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'score_range', type: 'ordinal', title: 'Score Range',
                    sort: ['1-2', '3-4', '5-6', '7-8', '9-10'] },
                  y: { field: 'review_count', type: 'quantitative', title: 'Reviews' },
                },
              },
              layout: { x: 3, y: 9, w: 3, h: 3 },
            },
          ],
        },
      ],
      spreadsheets: [
        {
          name: 'Information of users aged 35-44 who are either Family or Solo travellers?',
          sql: `SELECT
  u.user_id,
  u.country,
  u.age,
  u.traveller_type,
  u.join_year,
  COUNT(r.review_id) AS total_reviews,
  ROUND(AVG(r.review_score), 2) AS avg_review_score,
  ROUND(MIN(r.review_score), 2) AS min_score,
  ROUND(MAX(r.review_score), 2) AS max_score
FROM users u
LEFT JOIN reviews r ON u.user_id = r.user_id
WHERE u.age BETWEEN 35 AND 44
  AND u.traveller_type IN ('Family', 'Solo')
GROUP BY u.user_id, u.country, u.age, u.traveller_type, u.join_year
ORDER BY total_reviews DESC`,
        },
        {
          name: 'Performance of Hotels in Different Regions',
          sql: `SELECT
  h.country AS region,
  h.city,
  COUNT(DISTINCT h.hotel_id) AS hotel_count,
  COUNT(r.review_id) AS total_reviews,
  ROUND(AVG(r.review_score), 2) AS avg_review_score,
  ROUND(AVG(h.star_rating), 1) AS avg_star_rating,
  ROUND(AVG(h.cleanliness_base), 2) AS avg_cleanliness,
  ROUND(AVG(h.comfort_base), 2) AS avg_comfort,
  ROUND(AVG(h.facilities_base), 2) AS avg_facilities
FROM hotels h
LEFT JOIN reviews r ON h.hotel_id = r.hotel_id
GROUP BY h.country, h.city
ORDER BY avg_review_score DESC`,
        },
      ],
      threads: [
        {
          question: 'Do users from specific countries consistently rate hotels in other regions lower than the global average?',
          answer: 'Yes, there are notable patterns. Users from certain countries tend to rate hotels in foreign regions differently. For example, some European users tend to rate hotels in Asia slightly below the global average, while users from Asian countries often give higher scores to European hotels. The global average review score serves as the baseline, and deviations of 0.5+ points suggest a consistent bias from particular origin countries.',
          sql: `SELECT
  u.country AS user_country,
  h.country AS hotel_country,
  COUNT(*) AS review_count,
  ROUND(AVG(r.review_score), 2) AS avg_score,
  ROUND((SELECT AVG(review_score) FROM reviews), 2) AS global_avg,
  ROUND(AVG(r.review_score) - (SELECT AVG(review_score) FROM reviews), 2) AS diff_from_global
FROM reviews r
JOIN users u ON r.user_id = u.user_id
JOIN hotels h ON r.hotel_id = h.hotel_id
WHERE u.country != h.country
GROUP BY u.country, h.country
HAVING COUNT(*) >= 3
ORDER BY diff_from_global ASC`,
          chartDetail: {
            description: 'Average review score by user country for foreign hotels vs global average',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'user_country', type: 'nominal', title: 'User Country' },
                y: { field: 'diff_from_global', type: 'quantitative', title: 'Diff from Global Avg' },
                color: {
                  field: 'diff_from_global', type: 'quantitative',
                  scale: { scheme: 'redblue', domainMid: 0 },
                  title: 'Deviation',
                },
              },
            },
          },
        },
        {
          question: 'Do users who joined in 2025 give significantly higher average scores than users who joined in 2020?',
          answer: 'Comparing the two cohorts reveals a measurable difference. Users who joined in 2025 tend to give modestly different average scores compared to the 2020 cohort. The breakdown by traveller type and hotel star rating shows that the gap is more pronounced for certain segments — for instance, newer solo travellers tend to rate 5-star hotels more generously than their 2020 counterparts.',
          sql: `SELECT
  u.join_year,
  u.traveller_type,
  h.star_rating,
  COUNT(*) AS review_count,
  ROUND(AVG(r.review_score), 2) AS avg_score
FROM reviews r
JOIN users u ON r.user_id = u.user_id
JOIN hotels h ON r.hotel_id = h.hotel_id
WHERE u.join_year IN (2020, 2025)
GROUP BY u.join_year, u.traveller_type, h.star_rating
ORDER BY u.join_year, u.traveller_type, h.star_rating`,
          chartDetail: {
            description: 'Average review score comparison: 2020 vs 2025 joiners by traveller type',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'traveller_type', type: 'nominal', title: 'Traveller Type' },
                y: { field: 'avg_score', type: 'quantitative', title: 'Avg Score' },
                xOffset: { field: 'join_year', type: 'nominal' },
                color: { field: 'join_year', type: 'nominal', title: 'Join Year', scale: { range: ['#5B8FF9', '#F6BD16'] } },
              },
            },
          },
        },
      ],
    },
  },
  supply_chain: {
    name: SampleDatasetName.SUPPLY_CHAIN,
    tables: [
      {
        tableName: 'suppliers',
        primaryKey: 'supplier_id',
        filePath:
          'http://wren-ui:3000/sample_data/supply_chain/suppliers.parquet',
        properties: {
          displayName: 'suppliers',
          description:
            'Contains the supplier catalog with unique suppliers and their key attributes including location, lead times, production volumes, and manufacturing costs.',
        },
        columns: [
          {
            name: 'supplier_id',
            properties: {
              description: 'Unique identifier for the supplier.',
              displayName: 'supplier_id',
            },
          },
          {
            name: 'supplier_name',
            properties: {
              description: 'Name of the supplier.',
              displayName: 'supplier_name',
            },
          },
          {
            name: 'location',
            properties: {
              description: 'City and country where the supplier is located.',
              displayName: 'location',
            },
          },
          {
            name: 'lead_time_days',
            properties: {
              description: 'Lead time in days for the supplier to deliver materials.',
              displayName: 'lead_time_days',
            },
          },
          {
            name: 'production_volume',
            properties: {
              description: 'Number of units the supplier can produce.',
              displayName: 'production_volume',
            },
          },
          {
            name: 'manufacturing_lead_time_days',
            properties: {
              description: 'Manufacturing lead time in days.',
              displayName: 'manufacturing_lead_time_days',
            },
          },
          {
            name: 'manufacturing_cost',
            properties: {
              description: 'Manufacturing cost per unit in USD.',
              displayName: 'manufacturing_cost',
            },
          },
        ],
        schema: [
          { columnName: 'supplier_id', dataType: 'INTEGER' },
          { columnName: 'supplier_name', dataType: 'VARCHAR' },
          { columnName: 'location', dataType: 'VARCHAR' },
          { columnName: 'lead_time_days', dataType: 'INTEGER' },
          { columnName: 'production_volume', dataType: 'INTEGER' },
          { columnName: 'manufacturing_lead_time_days', dataType: 'INTEGER' },
          { columnName: 'manufacturing_cost', dataType: 'DOUBLE' },
        ],
      },
      {
        tableName: 'products',
        primaryKey: 'product_id',
        filePath:
          'http://wren-ui:3000/sample_data/supply_chain/products.parquet',
        properties: {
          displayName: 'products',
          description:
            'Contains the product catalog with SKU, product type, pricing, availability, stock levels, and the supplier that manufactures each product.',
        },
        columns: [
          {
            name: 'product_id',
            properties: {
              description: 'Unique identifier for the product.',
              displayName: 'product_id',
            },
          },
          {
            name: 'sku',
            properties: {
              description: 'Stock Keeping Unit code for the product.',
              displayName: 'sku',
            },
          },
          {
            name: 'product_type',
            properties: {
              description: 'Type of the product (skincare, haircare, cosmetics).',
              displayName: 'product_type',
            },
          },
          {
            name: 'price',
            properties: {
              description: 'Unit price of the product in USD.',
              displayName: 'price',
            },
          },
          {
            name: 'availability',
            properties: {
              description: 'Number of units currently available for sale.',
              displayName: 'availability',
            },
          },
          {
            name: 'stock_level',
            properties: {
              description: 'Current stock level in the warehouse.',
              displayName: 'stock_level',
            },
          },
          {
            name: 'supplier_id',
            properties: {
              description: 'Foreign key referencing the supplier who manufactures this product.',
              displayName: 'supplier_id',
            },
          },
        ],
        schema: [
          { columnName: 'product_id', dataType: 'INTEGER' },
          { columnName: 'sku', dataType: 'VARCHAR' },
          { columnName: 'product_type', dataType: 'VARCHAR' },
          { columnName: 'price', dataType: 'DOUBLE' },
          { columnName: 'availability', dataType: 'INTEGER' },
          { columnName: 'stock_level', dataType: 'INTEGER' },
          { columnName: 'supplier_id', dataType: 'INTEGER' },
        ],
      },
      {
        tableName: 'orders',
        primaryKey: 'order_id',
        filePath:
          'http://wren-ui:3000/sample_data/supply_chain/orders.parquet',
        properties: {
          displayName: 'orders',
          description:
            'Central transactional table linking products to customer orders, capturing order quantities, units sold, revenue, customer demographics, quality inspection results, and defect rates.',
        },
        columns: [
          {
            name: 'order_id',
            properties: {
              description: 'Unique identifier for the order.',
              displayName: 'order_id',
            },
          },
          {
            name: 'product_id',
            properties: {
              description: 'Foreign key referencing the product ordered.',
              displayName: 'product_id',
            },
          },
          {
            name: 'order_quantity',
            properties: {
              description: 'Number of units ordered.',
              displayName: 'order_quantity',
            },
          },
          {
            name: 'number_sold',
            properties: {
              description: 'Number of units actually sold from this order.',
              displayName: 'number_sold',
            },
          },
          {
            name: 'revenue_generated',
            properties: {
              description: 'Total revenue generated from this order in USD.',
              displayName: 'revenue_generated',
            },
          },
          {
            name: 'customer_demographics',
            properties: {
              description: 'Gender/demographic category of the customer (Female, Male, Non-binary, Unknown).',
              displayName: 'customer_demographics',
            },
          },
          {
            name: 'inspection_result',
            properties: {
              description: 'Quality inspection result for the order (Pass, Fail, Pending).',
              displayName: 'inspection_result',
            },
          },
          {
            name: 'defect_rate',
            properties: {
              description: 'Percentage defect rate for the products in this order.',
              displayName: 'defect_rate',
            },
          },
        ],
        schema: [
          { columnName: 'order_id', dataType: 'INTEGER' },
          { columnName: 'product_id', dataType: 'INTEGER' },
          { columnName: 'order_quantity', dataType: 'INTEGER' },
          { columnName: 'number_sold', dataType: 'INTEGER' },
          { columnName: 'revenue_generated', dataType: 'DOUBLE' },
          { columnName: 'customer_demographics', dataType: 'VARCHAR' },
          { columnName: 'inspection_result', dataType: 'VARCHAR' },
          { columnName: 'defect_rate', dataType: 'DOUBLE' },
        ],
      },
      {
        tableName: 'shipments',
        primaryKey: 'shipment_id',
        filePath:
          'http://wren-ui:3000/sample_data/supply_chain/shipments.parquet',
        properties: {
          displayName: 'shipments',
          description:
            'Contains shipping details for each order, including carrier, transportation mode, route, shipping time, shipping cost, and total logistics cost.',
        },
        columns: [
          {
            name: 'shipment_id',
            properties: {
              description: 'Unique identifier for the shipment.',
              displayName: 'shipment_id',
            },
          },
          {
            name: 'order_id',
            properties: {
              description: 'Foreign key referencing the order being shipped.',
              displayName: 'order_id',
            },
          },
          {
            name: 'shipping_time_days',
            properties: {
              description: 'Number of days to ship the order.',
              displayName: 'shipping_time_days',
            },
          },
          {
            name: 'shipping_carrier',
            properties: {
              description: 'Name of the shipping carrier.',
              displayName: 'shipping_carrier',
            },
          },
          {
            name: 'shipping_cost',
            properties: {
              description: 'Cost of shipping in USD.',
              displayName: 'shipping_cost',
            },
          },
          {
            name: 'transportation_mode',
            properties: {
              description: 'Mode of transportation (Road, Rail, Air, Sea).',
              displayName: 'transportation_mode',
            },
          },
          {
            name: 'route',
            properties: {
              description: 'Shipping route used for delivery.',
              displayName: 'route',
            },
          },
          {
            name: 'total_cost',
            properties: {
              description: 'Total logistics cost including shipping and handling in USD.',
              displayName: 'total_cost',
            },
          },
        ],
        schema: [
          { columnName: 'shipment_id', dataType: 'INTEGER' },
          { columnName: 'order_id', dataType: 'INTEGER' },
          { columnName: 'shipping_time_days', dataType: 'INTEGER' },
          { columnName: 'shipping_carrier', dataType: 'VARCHAR' },
          { columnName: 'shipping_cost', dataType: 'DOUBLE' },
          { columnName: 'transportation_mode', dataType: 'VARCHAR' },
          { columnName: 'route', dataType: 'VARCHAR' },
          { columnName: 'total_cost', dataType: 'DOUBLE' },
        ],
      },
    ],
    relations: [
      // suppliers -> products (one supplier has many products)
      {
        fromModelName: 'suppliers',
        fromColumnName: 'supplier_id',
        toModelName: 'products',
        toColumnName: 'supplier_id',
        type: RelationType.ONE_TO_MANY,
      },
      // products -> orders (one product has many orders)
      {
        fromModelName: 'products',
        fromColumnName: 'product_id',
        toModelName: 'orders',
        toColumnName: 'product_id',
        type: RelationType.ONE_TO_MANY,
      },
      // orders -> shipments (one order has one shipment)
      {
        fromModelName: 'orders',
        fromColumnName: 'order_id',
        toModelName: 'shipments',
        toColumnName: 'order_id',
        type: RelationType.ONE_TO_MANY,
      },
    ],
    sampleContent: {
      dashboards: [
        {
          name: 'Supply Chain & Operation',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Avg Lead Time (days)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(lead_time_days), 1) AS avg_lead_time FROM suppliers`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Shipping Time (days)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(shipping_time_days), 1) AS avg_shipping_time FROM shipments`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Defect Rate (%)',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(defect_rate), 2) AS avg_defect_rate FROM orders`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Inspection results (PIE)
            {
              displayName: 'Order Inspection Results',
              type: 'PIE',
              sql: `SELECT inspection_result, COUNT(*) AS order_count
FROM orders
GROUP BY inspection_result`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'order_count', type: 'quantitative' },
                  color: { field: 'inspection_result', type: 'nominal', title: 'Result' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Shipping cost by transportation mode (BAR)
            {
              displayName: 'Avg Shipping Cost by Transportation Mode',
              type: 'BAR',
              sql: `SELECT transportation_mode, ROUND(AVG(shipping_cost), 2) AS avg_shipping_cost
FROM shipments
GROUP BY transportation_mode
ORDER BY avg_shipping_cost DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'transportation_mode', type: 'nominal', title: 'Mode', sort: '-y' },
                  y: { field: 'avg_shipping_cost', type: 'quantitative', title: 'Avg Shipping Cost ($)' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Avg defect rate by product type (BAR)
            {
              displayName: 'Avg Defect Rate by Product Type',
              type: 'BAR',
              sql: `SELECT p.product_type, ROUND(AVG(o.defect_rate), 2) AS avg_defect_rate
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY p.product_type
ORDER BY avg_defect_rate DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'product_type', type: 'nominal', title: 'Product Type', sort: '-y' },
                  y: { field: 'avg_defect_rate', type: 'quantitative', title: 'Avg Defect Rate (%)' },
                },
              },
              layout: { x: 0, y: 5, w: 3, h: 3 },
            },
            // Row 5 — Avg manufacturing cost by supplier location (BAR top 10)
            {
              displayName: 'Top 10 Supplier Locations by Avg Mfg Cost',
              type: 'BAR',
              sql: `SELECT location, ROUND(AVG(manufacturing_cost), 2) AS avg_mfg_cost
FROM suppliers
GROUP BY location
ORDER BY avg_mfg_cost DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'location', type: 'nominal', title: 'Location', sort: '-y' },
                  y: { field: 'avg_mfg_cost', type: 'quantitative', title: 'Avg Mfg Cost ($)' },
                },
              },
              layout: { x: 3, y: 5, w: 3, h: 3 },
            },
            // Row 8 — Shipping carrier performance stacked by mode
            {
              displayName: 'Shipping Volume by Carrier & Mode',
              type: 'STACKED_BAR',
              sql: `SELECT shipping_carrier, transportation_mode, COUNT(*) AS shipment_count
FROM shipments
GROUP BY shipping_carrier, transportation_mode
ORDER BY shipping_carrier, transportation_mode`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'shipping_carrier', type: 'nominal', title: 'Carrier' },
                  y: { field: 'shipment_count', type: 'quantitative', title: 'Shipments', stack: true },
                  color: { field: 'transportation_mode', type: 'nominal', title: 'Mode' },
                },
              },
              layout: { x: 0, y: 8, w: 6, h: 4 },
            },
          ],
        },
        {
          name: 'Sales & Commercial',
          items: [
            // Row 0 — KPI Numbers
            {
              displayName: 'Total Revenue ($)',
              type: 'NUMBER',
              sql: `SELECT ROUND(SUM(revenue_generated), 2) AS total_revenue FROM orders`,
              layout: { x: 0, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Total Units Sold',
              type: 'NUMBER',
              sql: `SELECT SUM(number_sold) AS total_units_sold FROM orders`,
              layout: { x: 2, y: 0, w: 2, h: 2 },
            },
            {
              displayName: 'Avg Order Quantity',
              type: 'NUMBER',
              sql: `SELECT ROUND(AVG(order_quantity), 0) AS avg_order_qty FROM orders`,
              layout: { x: 4, y: 0, w: 2, h: 2 },
            },
            // Row 2 — Revenue by customer demographics (PIE)
            {
              displayName: 'Revenue by Customer Demographics',
              type: 'PIE',
              sql: `SELECT customer_demographics, ROUND(SUM(revenue_generated), 2) AS revenue
FROM orders
GROUP BY customer_demographics`,
              chartSchema: {
                mark: { type: 'arc', tooltip: true, innerRadius: 50 },
                encoding: {
                  theta: { field: 'revenue', type: 'quantitative' },
                  color: { field: 'customer_demographics', type: 'nominal', title: 'Demographics' },
                },
              },
              layout: { x: 0, y: 2, w: 3, h: 3 },
            },
            // Row 2 — Revenue by product type (BAR)
            {
              displayName: 'Revenue by Product Type',
              type: 'BAR',
              sql: `SELECT p.product_type, ROUND(SUM(o.revenue_generated), 2) AS revenue
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY p.product_type
ORDER BY revenue DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'product_type', type: 'nominal', title: 'Product Type', sort: '-y' },
                  y: { field: 'revenue', type: 'quantitative', title: 'Revenue ($)' },
                },
              },
              layout: { x: 3, y: 2, w: 3, h: 3 },
            },
            // Row 5 — Top 10 products by revenue (BAR)
            {
              displayName: 'Top 10 Products by Revenue',
              type: 'BAR',
              sql: `SELECT p.sku, ROUND(SUM(o.revenue_generated), 2) AS revenue
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY p.sku
ORDER BY revenue DESC
LIMIT 10`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'sku', type: 'nominal', title: 'Product SKU', sort: '-y' },
                  y: { field: 'revenue', type: 'quantitative', title: 'Revenue ($)' },
                },
              },
              layout: { x: 0, y: 5, w: 3, h: 3 },
            },
            // Row 5 — Avg price by product type (BAR)
            {
              displayName: 'Avg Product Price by Type',
              type: 'BAR',
              sql: `SELECT product_type, ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY product_type
ORDER BY avg_price DESC`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'product_type', type: 'nominal', title: 'Product Type', sort: '-y' },
                  y: { field: 'avg_price', type: 'quantitative', title: 'Avg Price ($)' },
                },
              },
              layout: { x: 3, y: 5, w: 3, h: 3 },
            },
            // Row 8 — Revenue by demographics & product type stacked
            {
              displayName: 'Revenue by Demographics & Product Type',
              type: 'STACKED_BAR',
              sql: `SELECT o.customer_demographics, p.product_type, ROUND(SUM(o.revenue_generated), 2) AS revenue
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY o.customer_demographics, p.product_type
ORDER BY o.customer_demographics, p.product_type`,
              chartSchema: {
                mark: { type: 'bar', tooltip: true },
                encoding: {
                  x: { field: 'customer_demographics', type: 'nominal', title: 'Demographics' },
                  y: { field: 'revenue', type: 'quantitative', title: 'Revenue ($)', stack: true },
                  color: { field: 'product_type', type: 'nominal', title: 'Product Type' },
                },
              },
              layout: { x: 0, y: 8, w: 6, h: 4 },
            },
          ],
        },
      ],
      spreadsheets: [
        {
          name: 'What are the average lead time, average shipping time, average manufacturing lead time, average order quantity, average availability, and counts of distinct shipping carriers, transportation modes, routes, and supplier locations for each product type?',
          sql: `SELECT
  p.product_type,
  ROUND(AVG(s.lead_time_days), 1) AS avg_lead_time,
  ROUND(AVG(sh.shipping_time_days), 1) AS avg_shipping_time,
  ROUND(AVG(s.manufacturing_lead_time_days), 1) AS avg_mfg_lead_time,
  ROUND(AVG(o.order_quantity), 1) AS avg_order_quantity,
  ROUND(AVG(p.availability), 1) AS avg_availability,
  COUNT(DISTINCT sh.shipping_carrier) AS distinct_carriers,
  COUNT(DISTINCT sh.transportation_mode) AS distinct_modes,
  COUNT(DISTINCT sh.route) AS distinct_routes,
  COUNT(DISTINCT s.location) AS distinct_supplier_locations
FROM products p
JOIN suppliers s ON p.supplier_id = s.supplier_id
JOIN orders o ON p.product_id = o.product_id
JOIN shipments sh ON o.order_id = sh.order_id
GROUP BY p.product_type
ORDER BY p.product_type`,
        },
        {
          name: 'Which are the top 10 products with the lowest average stock levels and availability, ranked by their risk of stock shortage?',
          sql: `SELECT
  p.product_id,
  p.sku,
  p.product_type,
  p.stock_level,
  p.availability,
  ROUND(AVG(o.order_quantity), 1) AS avg_order_qty,
  ROUND(p.stock_level * 1.0 / NULLIF(AVG(o.order_quantity), 0), 2) AS stock_to_demand_ratio,
  ROW_NUMBER() OVER (ORDER BY p.stock_level + p.availability ASC) AS shortage_risk_rank
FROM products p
JOIN orders o ON p.product_id = o.product_id
GROUP BY p.product_id, p.sku, p.product_type, p.stock_level, p.availability
ORDER BY shortage_risk_rank
LIMIT 10`,
        },
      ],
      threads: [
        {
          question: 'For the same transportation mode, which shipping carrier has the best balance of shipping costs and shipping times?',
          answer: 'Looking at each transportation mode, the carriers with the best cost-to-time efficiency are identified by their cost-per-day metric (shipping cost divided by shipping time). Lower values indicate a carrier delivers more value per dollar spent. Across modes like Road, Rail, Air, and Sea, certain carriers consistently offer better cost-time balance — for example, carriers with shorter shipping times at moderate costs outperform those with lower costs but significantly longer delivery windows.',
          sql: `SELECT
  sh.transportation_mode,
  sh.shipping_carrier,
  COUNT(*) AS shipment_count,
  ROUND(AVG(sh.shipping_cost), 2) AS avg_shipping_cost,
  ROUND(AVG(sh.shipping_time_days), 1) AS avg_shipping_days,
  ROUND(AVG(sh.shipping_cost) / NULLIF(AVG(sh.shipping_time_days), 0), 2) AS cost_per_day
FROM shipments sh
GROUP BY sh.transportation_mode, sh.shipping_carrier
ORDER BY sh.transportation_mode, cost_per_day ASC`,
          chartDetail: {
            description: 'Average shipping cost vs average shipping time by carrier, grouped by transportation mode',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'shipping_carrier', type: 'nominal', title: 'Carrier' },
                y: { field: 'cost_per_day', type: 'quantitative', title: 'Cost per Day ($)' },
                color: { field: 'transportation_mode', type: 'nominal', title: 'Mode' },
                xOffset: { field: 'transportation_mode', type: 'nominal' },
              },
            },
          },
        },
        {
          question: 'Rank the prices of the product SKUs that men buy',
          answer: 'Here are the product SKUs purchased by male customers, ranked by their unit price from highest to lowest. This shows which premium products are most popular among male buyers and helps identify pricing patterns in that demographic segment.',
          sql: `SELECT
  p.sku,
  p.product_type,
  p.price,
  SUM(o.number_sold) AS total_units_sold,
  ROUND(SUM(o.revenue_generated), 2) AS total_revenue,
  RANK() OVER (ORDER BY p.price DESC) AS price_rank
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.customer_demographics = 'Male'
GROUP BY p.sku, p.product_type, p.price
ORDER BY price_rank`,
          chartDetail: {
            description: 'Product prices ranked for male customer purchases',
            chartType: 'BAR',
            chartSchema: {
              mark: { type: 'bar', tooltip: true },
              encoding: {
                x: { field: 'sku', type: 'nominal', title: 'Product SKU', sort: '-y' },
                y: { field: 'price', type: 'quantitative', title: 'Price ($)' },
                color: { field: 'product_type', type: 'nominal', title: 'Product Type' },
              },
            },
          },
        },
      ],
    },
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
