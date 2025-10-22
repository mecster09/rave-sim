import {
  generateODMRoot,
  generateODMWithClinicalData,
  generateODMMetadata,
  generateSuccessResponse,
  generateErrorResponse,
  validateODMXML,
} from '../src/utils/odm';

describe('ODM Utils', () => {
  describe('generateODMRoot', () => {
    it('should generate valid ODM XML root', () => {
      const xml = generateODMRoot();
      
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('<ODM');
      expect(xml).toContain('xmlns="http://www.cdisc.org/ns/odm/v1.3"');
      expect(xml).toContain('ODMVersion="1.3"');
      expect(xml).toContain('FileType="Snapshot"');
    });

    it('should use custom FileType', () => {
      const xml = generateODMRoot({ FileType: 'Transactional' });
      expect(xml).toContain('FileType="Transactional"');
    });
  });

  describe('generateODMWithClinicalData', () => {
    it('should generate ODM with ClinicalData element', () => {
      const xml = generateODMWithClinicalData('STUDY123');
      
      expect(xml).toContain('<ClinicalData');
      expect(xml).toContain('StudyOID="STUDY123"');
      expect(xml).toContain('</ClinicalData>');
    });
  });

  describe('generateODMMetadata', () => {
    it('should generate ODM metadata structure', () => {
      const xml = generateODMMetadata('STUDY123');
      
      expect(xml).toContain('<Study OID="STUDY123">');
      expect(xml).toContain('<MetaDataVersion');
      expect(xml).toContain('<StudyEventDef');
      expect(xml).toContain('<FormDef');
      expect(xml).toContain('<ItemDef');
    });
  });

  describe('generateSuccessResponse', () => {
    it('should generate success Response element', () => {
      const xml = generateSuccessResponse('1234');
      
      expect(xml).toContain('<Response');
      expect(xml).toContain('ReferenceNumber="1234"');
      expect(xml).toContain('IsTransactionSuccessful="1"');
    });
  });

  describe('generateErrorResponse', () => {
    it('should generate error Response with reason code', () => {
      const xml = generateErrorResponse('RWS00001', 'Test error');
      
      expect(xml).toContain('IsTransactionSuccessful="0"');
      expect(xml).toContain('ReasonCode="RWS00001"');
      expect(xml).toContain('ErrorDescription="Test error"');
    });
  });

  describe('validateODMXML', () => {
    it('should validate XML with ODM element', () => {
      const xml = '<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"></ODM>';
      expect(validateODMXML(xml)).toBe(true);
    });

    it('should validate XML with declaration', () => {
      const xml = '<?xml version="1.0"?><ODM></ODM>';
      expect(validateODMXML(xml)).toBe(true);
    });

    it('should reject non-XML content', () => {
      expect(validateODMXML('not xml')).toBe(false);
    });
  });
});

