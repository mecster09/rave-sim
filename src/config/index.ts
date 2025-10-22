import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface Config {
  server: {
    port: number;
    host: string;
    bodyLimit: number;
  };
  rws: {
    version: string;
  };
  auth: {
    test_credentials?: Array<{ username: string; password: string }>;
    basic_auth?: {
      enabled: boolean;
      allow_any_credentials?: boolean;
    };
    mauth?: {
      enabled: boolean;
      stub_mode?: boolean;
      test_signature?: string;
    };
  };
  odm: {
    namespace: {
      odm: string;
      mdsol: string;
    };
    version: string;
    default_file_type: string;
    default_study: {
      study_name: string;
      study_description: string;
      protocol_name: string;
    };
    test_studies?: Array<{
      study_oid: string;
      study_name: string;
      study_description: string;
      protocol_name: string;
    }>;
    study_events: Array<{
      oid: string;
      name: string;
      type: string;
      repeating: boolean;
      order: number;
    }>;
    forms: Array<{
      oid: string;
      name: string;
      repeating: boolean;
      item_group: string;
    }>;
    item_groups: Array<{
      oid: string;
      name: string;
      repeating: boolean;
      items: string[];
    }>;
    items: Array<{
      oid: string;
      name: string;
      data_type: string;
      question: string;
      mandatory: boolean;
    }>;
    test_subjects?: Array<{
      subject_key: string;
      subject_name: string;
      age: number;
      sex: string;
      race: string;
    }>;
  };
  csv_datasets: Record<string, string[]>;
  responses: {
    success: {
      reference_number_default: string;
      inbound_file_oid: string;
      is_transaction_successful: string;
    };
    error: {
      reference_number: string;
      is_transaction_successful: string;
    };
    error_codes: Record<string, {
      message: string;
      http_status: number;
    }>;
  };
  cache?: {
    enabled?: boolean;
    flush_response: {
      status: string;
    };
  };
  pagination?: {
    default_per_page: number;
    max_per_page?: number;
  };
  logging?: {
    level: string;
    pretty: boolean;
    test_mode: boolean;
  };
}

let configCache: Config | null = null;

export function loadConfig(environment: 'test' | 'production' = 'production'): Config {
  if (configCache && process.env.NODE_ENV === environment) {
    return configCache;
  }

  const configPath = path.join(__dirname, '../../config', `${environment}.yaml`);
  
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    configCache = yaml.load(fileContents) as Config;
    return configCache;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    throw new Error(`Configuration file not found or invalid: ${configPath}`);
  }
}

export function getConfig(): Config {
  const environment = process.env.NODE_ENV === 'test' ? 'test' : 'production';
  return loadConfig(environment);
}

// Export for direct access
export const config = getConfig();

