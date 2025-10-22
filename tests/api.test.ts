import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';

describe('API Integration Tests', () => {
  let app: FastifyInstance;
  const authHeader = 'Basic ' + Buffer.from('test:test123').toString('base64');

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root and Health Endpoints', () => {
    it('GET / should return API information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toContain('Rave Web Services');
      expect(body.version).toBe('1.8.0');
    });

    it('GET /health should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Version Endpoint', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/version',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return version with Basic Auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/version',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('1.8.0');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should accept MAuth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/version',
        headers: {
          'X-MWS-Authentication': 'mock-signature',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Cache Flush Endpoint', () => {
    it('should flush cache with authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/WebService.aspx?CacheFlush',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cache flushed');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/WebService.aspx?CacheFlush',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Dataset Endpoints - ODM', () => {
    it('should return Clinical Audit Records', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=STUDY001',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.body).toContain('<ODM');
      expect(response.body).toContain('StudyOID="STUDY001"');
    });

    it('should require studyoid parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('studyoid parameter is required');
    });

    it('should return Subjects Calendar', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/SubjectsCalendar.odm?studyoid=STUDY001',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<ClinicalData');
    });

    it('should return Clinical Datasets metadata', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/ClinicalDatasets.odm?studyoid=STUDY001',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<MetaDataVersion');
      expect(response.body).toContain('<StudyEventDef');
    });

    it('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=STUDY001&per_page=100&startid=1000',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers.link).toBeDefined();
    });
  });

  describe('Dataset Endpoints - CSV', () => {
    it('should return Users CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/Users.csv',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.body).toContain('UserOID');
      expect(response.body).toContain('Username');
    });

    it('should return Sites CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/Sites.csv',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('SiteNumber');
    });

    it('should return Signatures CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/Signatures.csv',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('SignatureDate');
    });

    it('should return VersionFolders CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/VersionFolders.csv',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('FolderOID');
    });

    it('should handle generic CSV datasets', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/datasets/CustomView.csv',
        headers: {
          Authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Clinical Data Import', () => {
    const validODM = `<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     FileType="Transactional"
     FileOID="import-001"
     CreationDateTime="2024-01-01T00:00:00"
     ODMVersion="1.3">
  <ClinicalData StudyOID="STUDY001" MetaDataVersionOID="1">
    <SubjectData SubjectKey="001" TransactionType="Insert">
      <StudyEventData StudyEventOID="SCREENING">
        <FormData FormOID="DM">
          <ItemGroupData ItemGroupOID="DM_IG">
            <ItemData ItemOID="SUBJID" Value="001"/>
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>`;

    it('should accept valid ODM XML', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/RaveWebServices',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'text/xml; charset=utf-8',
        },
        payload: validODM,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<Response');
      expect(response.body).toContain('IsTransactionSuccessful="1"');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/RaveWebServices',
        headers: {
          'Content-Type': 'text/xml',
        },
        payload: validODM,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require text/xml Content-Type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/RaveWebServices',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        payload: validODM,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate ODM structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/RaveWebServices',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'text/xml',
        },
        payload: '<Invalid>XML</Invalid>',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid ODM XML');
    });

    it('should validate required ODM attributes', async () => {
      const invalidODM = '<ODM><ClinicalData/></ODM>';
      
      const response = await app.inject({
        method: 'POST',
        url: '/RaveWebServices',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'text/xml',
        },
        payload: invalidODM,
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('ODMVersion');
    });

    it('should accept POST to /RaveWebServices/ClinicalData', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/RaveWebServices/ClinicalData',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'text/xml',
        },
        payload: validODM,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('IsTransactionSuccessful="1"');
    });
  });
});

