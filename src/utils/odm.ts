import { ODMMetadata } from '../types';

export function generateODMRoot(metadata: Partial<ODMMetadata> = {}): string {
  const now = new Date().toISOString();
  const fileOID = metadata.FileOID || `mock-${Date.now()}`;
  const fileType = metadata.FileType || 'Snapshot';
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata"
     FileType="${fileType}"
     FileOID="${fileOID}"
     CreationDateTime="${now}"
     ODMVersion="1.3">
</ODM>`;
}

export function generateODMWithClinicalData(
  studyOID: string,
  metadata: Partial<ODMMetadata> = {}
): string {
  const now = new Date().toISOString();
  const fileOID = metadata.FileOID || `mock-${Date.now()}`;
  const fileType = metadata.FileType || 'Snapshot';
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata"
     FileType="${fileType}"
     FileOID="${fileOID}"
     CreationDateTime="${now}"
     ODMVersion="1.3">
  <ClinicalData StudyOID="${studyOID}" MetaDataVersionOID="1">
    <!-- Mock: empty clinical data -->
  </ClinicalData>
</ODM>`;
}

export function generateODMMetadata(studyOID: string): string {
  const now = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata"
     FileType="Snapshot"
     FileOID="metadata-${Date.now()}"
     CreationDateTime="${now}"
     ODMVersion="1.3">
  <Study OID="${studyOID}">
    <GlobalVariables>
      <StudyName>Mock Study</StudyName>
      <StudyDescription>Mock study metadata</StudyDescription>
      <ProtocolName>MOCK-001</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="1" Name="Version 1">
      <Protocol>
        <StudyEventRef StudyEventOID="SCREENING" OrderNumber="1" Mandatory="Yes"/>
      </Protocol>
      <StudyEventDef OID="SCREENING" Name="Screening" Type="Scheduled" Repeating="No">
        <FormRef FormOID="DM" OrderNumber="1" Mandatory="Yes"/>
      </StudyEventDef>
      <FormDef OID="DM" Name="Demographics" Repeating="No">
        <ItemGroupRef ItemGroupOID="DM_IG" Mandatory="Yes"/>
      </FormDef>
      <ItemGroupDef OID="DM_IG" Name="Demographics" Repeating="No">
        <ItemRef ItemOID="SUBJID" OrderNumber="1" Mandatory="Yes"/>
        <ItemRef ItemOID="AGE" OrderNumber="2" Mandatory="No"/>
      </ItemGroupDef>
      <ItemDef OID="SUBJID" Name="Subject ID" DataType="text">
        <Question><TranslatedText>Subject ID</TranslatedText></Question>
      </ItemDef>
      <ItemDef OID="AGE" Name="Age" DataType="integer">
        <Question><TranslatedText>Age</TranslatedText></Question>
      </ItemDef>
    </MetaDataVersion>
  </Study>
</ODM>`;
}

export function generateSuccessResponse(referenceNumber: string = '0000'): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="http://www.cdisc.org/ns/odm/v1.3"
          ReferenceNumber="${referenceNumber}"
          InboundODMFileOID="mockFile"
          IsTransactionSuccessful="1">
</Response>`;
}

export function generateErrorResponse(
  reasonCode: string,
  errorDescription: string,
  isTransactionSuccessful: string = '0'
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="http://www.cdisc.org/ns/odm/v1.3"
          xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata"
          ReferenceNumber="error"
          IsTransactionSuccessful="${isTransactionSuccessful}"
          ReasonCode="${reasonCode}"
          ErrorDescription="${errorDescription}">
</Response>`;
}

export function generateODMError(errorDescription: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata"
     mdsol:ErrorDescription="${errorDescription}">
</ODM>`;
}

export function validateODMXML(body: string): boolean {
  // Basic validation - check for ODM root element
  return body.includes('<ODM') || body.includes('<?xml');
}

