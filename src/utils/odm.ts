import { ODMMetadata } from '../types';
import { loadConfig } from '../config';

export function generateODMRoot(metadata: Partial<ODMMetadata> = {}): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  const now = new Date().toISOString();
  const fileOID = metadata.FileOID || `mock-${Date.now()}`;
  const fileType = metadata.FileType || config.odm.default_file_type;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="${config.odm.namespace.odm}"
     xmlns:mdsol="${config.odm.namespace.mdsol}"
     FileType="${fileType}"
     FileOID="${fileOID}"
     CreationDateTime="${now}"
     ODMVersion="${config.odm.version}">
</ODM>`;
}

export function generateODMWithClinicalData(
  studyOID: string,
  metadata: Partial<ODMMetadata> = {}
): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  const now = new Date().toISOString();
  const fileOID = metadata.FileOID || `mock-${Date.now()}`;
  const fileType = metadata.FileType || config.odm.default_file_type;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="${config.odm.namespace.odm}"
     xmlns:mdsol="${config.odm.namespace.mdsol}"
     FileType="${fileType}"
     FileOID="${fileOID}"
     CreationDateTime="${now}"
     ODMVersion="${config.odm.version}">
  <ClinicalData StudyOID="${studyOID}" MetaDataVersionOID="1">
    <!-- Mock: empty clinical data -->
  </ClinicalData>
</ODM>`;
}

export function generateODMMetadata(studyOID: string): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  const now = new Date().toISOString();
  const study = config.odm.test_studies?.find(s => s.study_oid === studyOID) || config.odm.default_study;
  
  // Use first study event and form from config
  const firstEvent = config.odm.study_events[0];
  const firstForm = config.odm.forms[0];
  const firstItemGroup = config.odm.item_groups[0];
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="${config.odm.namespace.odm}"
     xmlns:mdsol="${config.odm.namespace.mdsol}"
     FileType="${config.odm.default_file_type}"
     FileOID="metadata-${Date.now()}"
     CreationDateTime="${now}"
     ODMVersion="${config.odm.version}">
  <Study OID="${studyOID}">
    <GlobalVariables>
      <StudyName>${study.study_name}</StudyName>
      <StudyDescription>${study.study_description}</StudyDescription>
      <ProtocolName>${study.protocol_name}</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="1" Name="Version 1">
      <Protocol>
        <StudyEventRef StudyEventOID="${firstEvent.oid}" OrderNumber="1" Mandatory="Yes"/>
      </Protocol>
      <StudyEventDef OID="${firstEvent.oid}" Name="${firstEvent.name}" Type="${firstEvent.type}" Repeating="${firstEvent.repeating ? 'Yes' : 'No'}">
        <FormRef FormOID="${firstForm.oid}" OrderNumber="1" Mandatory="Yes"/>
      </StudyEventDef>
      <FormDef OID="${firstForm.oid}" Name="${firstForm.name}" Repeating="${firstForm.repeating ? 'Yes' : 'No'}">
        <ItemGroupRef ItemGroupOID="${firstItemGroup.oid}" Mandatory="Yes"/>
      </FormDef>
      <ItemGroupDef OID="${firstItemGroup.oid}" Name="${firstItemGroup.name}" Repeating="${firstItemGroup.repeating ? 'Yes' : 'No'}">
        <ItemRef ItemOID="${config.odm.items[0].oid}" OrderNumber="1" Mandatory="${config.odm.items[0].mandatory ? 'Yes' : 'No'}"/>
        <ItemRef ItemOID="${config.odm.items[1].oid}" OrderNumber="2" Mandatory="${config.odm.items[1].mandatory ? 'Yes' : 'No'}"/>
      </ItemGroupDef>
      <ItemDef OID="${config.odm.items[0].oid}" Name="${config.odm.items[0].name}" DataType="${config.odm.items[0].data_type}">
        <Question><TranslatedText>${config.odm.items[0].question}</TranslatedText></Question>
      </ItemDef>
      <ItemDef OID="${config.odm.items[1].oid}" Name="${config.odm.items[1].name}" DataType="${config.odm.items[1].data_type}">
        <Question><TranslatedText>${config.odm.items[1].question}</TranslatedText></Question>
      </ItemDef>
    </MetaDataVersion>
  </Study>
</ODM>`;
}

export function generateSuccessResponse(referenceNumber?: string): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  const refNum = referenceNumber || config.responses.success.reference_number_default;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="${config.odm.namespace.odm}"
          ReferenceNumber="${refNum}"
          InboundODMFileOID="${config.responses.success.inbound_file_oid}"
          IsTransactionSuccessful="${config.responses.success.is_transaction_successful}">
</Response>`;
}

export function generateErrorResponse(
  reasonCode: string,
  errorDescription: string,
  isTransactionSuccessful?: string
): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  const txnSuccess = isTransactionSuccessful || config.responses.error.is_transaction_successful;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="${config.odm.namespace.odm}"
          xmlns:mdsol="${config.odm.namespace.mdsol}"
          ReferenceNumber="${config.responses.error.reference_number}"
          IsTransactionSuccessful="${txnSuccess}"
          ReasonCode="${reasonCode}"
          ErrorDescription="${errorDescription}">
</Response>`;
}

export function generateODMError(errorDescription: string): string {
  const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
  
  return `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="${config.odm.namespace.odm}"
     xmlns:mdsol="${config.odm.namespace.mdsol}"
     mdsol:ErrorDescription="${errorDescription}">
</ODM>`;
}

export function validateODMXML(body: string): boolean {
  // Basic validation - check for ODM root element
  return body.includes('<ODM') || body.includes('<?xml');
}

