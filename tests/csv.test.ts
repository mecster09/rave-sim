import { generateCSV, generateCSVHeader } from '../src/utils/csv';

describe('CSV Utils', () => {
  describe('generateCSVHeader', () => {
    it('should generate Users CSV header', () => {
      const header = generateCSVHeader('Users');
      expect(header).toContain('UserOID');
      expect(header).toContain('Username');
      expect(header).toContain('Email');
    });

    it('should generate Sites CSV header', () => {
      const header = generateCSVHeader('Sites');
      expect(header).toContain('StudyOID');
      expect(header).toContain('SiteNumber');
      expect(header).toContain('SiteName');
    });

    it('should use default header for unknown dataset', () => {
      const header = generateCSVHeader('Unknown');
      expect(header).toContain('StudyOID');
      expect(header).toContain('SubjectName');
    });
  });

  describe('generateCSV', () => {
    it('should generate CSV with header only', () => {
      const csv = generateCSV('Users', false);
      const lines = csv.split('\n');
      
      expect(lines[0]).toContain('UserOID');
      expect(lines.length).toBe(2); // Header + empty line
    });

    it('should generate empty CSV by default', () => {
      const csv = generateCSV('Sites');
      const lines = csv.split('\n').filter(line => line.trim());
      
      expect(lines.length).toBe(1); // Only header
    });
  });
});

