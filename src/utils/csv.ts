import { loadConfig } from '../config';

export function generateCSVHeader(datasetName: string): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  
  const header = config.csv_datasets[datasetName] || config.csv_datasets.ClinicalView;
  return header.join(',') + '\n';
}

export function generateCSV(datasetName: string, withData: boolean = false): string {
  const header = generateCSVHeader(datasetName);
  
  if (!withData) {
    // Return header only (no data rows) as per spec
    return header;
  }
  
  return header;
}

