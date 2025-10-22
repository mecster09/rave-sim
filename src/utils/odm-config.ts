import { Config } from '../config';

export function generateODMMetadataFromConfig(studyOID: string, config: Config): string {
  const now = new Date().toISOString();
  const study = config.odm.test_studies?.find(s => s.study_oid === studyOID) || config.odm.default_study;
  
  // Build study events
  const studyEventsXML = config.odm.study_events.map((event, idx) => `
        <StudyEventRef StudyEventOID="${event.oid}" OrderNumber="${idx + 1}" Mandatory="Yes"/>`
  ).join('');

  // Build study event defs
  const studyEventDefsXML = config.odm.study_events.map(event => {
    const form = config.odm.forms[0]; // Use first form for simplicity
    return `
      <StudyEventDef OID="${event.oid}" Name="${event.name}" Type="${event.type}" Repeating="${event.repeating ? 'Yes' : 'No'}">
        <FormRef FormOID="${form.oid}" OrderNumber="1" Mandatory="Yes"/>
      </StudyEventDef>`;
  }).join('');

  // Build form defs
  const formDefsXML = config.odm.forms.map(form => `
      <FormDef OID="${form.oid}" Name="${form.name}" Repeating="${form.repeating ? 'Yes' : 'No'}">
        <ItemGroupRef ItemGroupOID="${form.item_group}" Mandatory="Yes"/>
      </FormDef>`
  ).join('');

  // Build item group defs
  const itemGroupDefsXML = config.odm.item_groups.map(group => {
    const itemRefsXML = group.items.map((itemOID, idx) => {
      const item = config.odm.items.find(i => i.oid === itemOID);
      return `
        <ItemRef ItemOID="${itemOID}" OrderNumber="${idx + 1}" Mandatory="${item?.mandatory ? 'Yes' : 'No'}"/>`;
    }).join('');
    
    return `
      <ItemGroupDef OID="${group.oid}" Name="${group.name}" Repeating="${group.repeating ? 'Yes' : 'No'}">${itemRefsXML}
      </ItemGroupDef>`;
  }).join('');

  // Build item defs
  const itemDefsXML = config.odm.items.map(item => `
      <ItemDef OID="${item.oid}" Name="${item.name}" DataType="${item.data_type}">
        <Question><TranslatedText>${item.question}</TranslatedText></Question>
      </ItemDef>`
  ).join('');

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
      <Protocol>${studyEventsXML}
      </Protocol>${studyEventDefsXML}${formDefsXML}${itemGroupDefsXML}${itemDefsXML}
    </MetaDataVersion>
  </Study>
</ODM>`;
}

