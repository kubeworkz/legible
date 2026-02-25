/**
 * Common IANA timezones grouped by region for the timezone selector.
 * Each entry includes the IANA key and a human-readable label.
 */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  // UTC
  { value: 'UTC', label: '(UTC+00:00) UTC' },

  // Americas
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Hawaii' },
  { value: 'America/Anchorage', label: '(UTC-09:00) Alaska' },
  {
    value: 'America/Los_Angeles',
    label: '(UTC-08:00) Pacific Time (US & Canada)',
  },
  { value: 'America/Denver', label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { value: 'America/Phoenix', label: '(UTC-07:00) Arizona' },
  { value: 'America/Chicago', label: '(UTC-06:00) Central Time (US & Canada)' },
  { value: 'America/Mexico_City', label: '(UTC-06:00) Mexico City' },
  {
    value: 'America/New_York',
    label: '(UTC-05:00) Eastern Time (US & Canada)',
  },
  { value: 'America/Bogota', label: '(UTC-05:00) Bogota, Lima' },
  { value: 'America/Halifax', label: '(UTC-04:00) Atlantic Time (Canada)' },
  { value: 'America/Caracas', label: '(UTC-04:00) Caracas' },
  { value: 'America/Santiago', label: '(UTC-04:00) Santiago' },
  { value: 'America/St_Johns', label: '(UTC-03:30) Newfoundland' },
  { value: 'America/Sao_Paulo', label: '(UTC-03:00) São Paulo' },
  {
    value: 'America/Argentina/Buenos_Aires',
    label: '(UTC-03:00) Buenos Aires',
  },

  // Europe & Africa
  { value: 'Atlantic/Reykjavik', label: '(UTC+00:00) Reykjavik' },
  { value: 'Europe/London', label: '(UTC+00:00) London, Dublin' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) Berlin, Amsterdam, Paris' },
  { value: 'Europe/Madrid', label: '(UTC+01:00) Madrid' },
  { value: 'Europe/Rome', label: '(UTC+01:00) Rome' },
  { value: 'Europe/Zurich', label: '(UTC+01:00) Zurich' },
  { value: 'Africa/Lagos', label: '(UTC+01:00) Lagos' },
  { value: 'Africa/Cairo', label: '(UTC+02:00) Cairo' },
  { value: 'Africa/Johannesburg', label: '(UTC+02:00) Johannesburg' },
  { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki, Bucharest' },
  { value: 'Europe/Athens', label: '(UTC+02:00) Athens' },
  { value: 'Europe/Istanbul', label: '(UTC+03:00) Istanbul' },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow' },

  // Middle East & South Asia
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai' },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) Mumbai, Kolkata, New Delhi' },
  { value: 'Asia/Kathmandu', label: '(UTC+05:45) Kathmandu' },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Dhaka' },
  { value: 'Asia/Yangon', label: '(UTC+06:30) Yangon' },

  // East & Southeast Asia
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok, Jakarta' },
  { value: 'Asia/Ho_Chi_Minh', label: '(UTC+07:00) Ho Chi Minh City' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Beijing, Shanghai' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore, Kuala Lumpur' },
  { value: 'Asia/Taipei', label: '(UTC+08:00) Taipei' },
  { value: 'Asia/Hong_Kong', label: '(UTC+08:00) Hong Kong' },
  { value: 'Australia/Perth', label: '(UTC+08:00) Perth' },
  { value: 'Asia/Seoul', label: '(UTC+09:00) Seoul' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo, Osaka' },

  // Australia & Pacific
  { value: 'Australia/Adelaide', label: '(UTC+09:30) Adelaide' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney, Melbourne' },
  { value: 'Australia/Brisbane', label: '(UTC+10:00) Brisbane' },
  { value: 'Pacific/Guam', label: '(UTC+10:00) Guam' },
  { value: 'Pacific/Noumea', label: '(UTC+11:00) Noumea' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland, Wellington' },
  { value: 'Pacific/Fiji', label: '(UTC+12:00) Fiji' },
  { value: 'Pacific/Tongatapu', label: "(UTC+13:00) Nuku'alofa" },
];
