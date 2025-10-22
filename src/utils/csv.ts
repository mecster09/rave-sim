export function generateCSVHeader(datasetName: string): string {
  const headers: Record<string, string[]> = {
    Users: ['UserOID', 'Username', 'FirstName', 'LastName', 'Email', 'Active', 'Role'],
    Sites: ['StudyOID', 'SiteNumber', 'SiteName', 'SiteStatus', 'Country', 'Investigator'],
    Signatures: ['StudyOID', 'SiteNumber', 'SubjectName', 'FormOID', 'SignatureDate', 'Username'],
    VersionFolders: ['StudyOID', 'FolderOID', 'FolderName', 'VersionNumber', 'Primary'],
    ClinicalView: ['StudyOID', 'SiteNumber', 'SubjectName', 'FieldOID', 'FieldValue', 'RecordDate']
  };

  const header = headers[datasetName] || headers.ClinicalView;
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

