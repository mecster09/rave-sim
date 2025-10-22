import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { DatasetQuery } from '../types';
import {
  generateODMWithClinicalData,
  generateODMMetadata,
  generateErrorResponse
} from '../utils/odm';
import { generateCSV } from '../utils/csv';

export default async function datasetRoutes(fastify: FastifyInstance) {
  // Clinical Audit Records
  fastify.get(
    '/RaveWebServices/datasets/ClinicalAuditRecords.odm',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const query = request.query as DatasetQuery;
      
      if (!query.studyoid) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse('RWS00001', 'studyoid parameter is required'));
        return;
      }
      
      const xml = generateODMWithClinicalData(query.studyoid, { FileType: 'Snapshot' });
      
      // Add pagination headers if per_page is provided
      if (query.per_page) {
        reply.header('Link', '<>; rel="next"');
      }
      
      reply
        .code(200)
        .header('Content-Type', 'application/xml')
        .send(xml);
    }
  );

  // Subjects Calendar
  fastify.get(
    '/RaveWebServices/datasets/SubjectsCalendar.odm',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const query = request.query as DatasetQuery;
      
      if (!query.studyoid) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse('RWS00001', 'studyoid parameter is required'));
        return;
      }
      
      const xml = generateODMWithClinicalData(query.studyoid);
      
      reply
        .code(200)
        .header('Content-Type', 'application/xml')
        .send(xml);
    }
  );

  // Clinical Datasets Metadata
  fastify.get(
    '/RaveWebServices/datasets/ClinicalDatasets.odm',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const query = request.query as DatasetQuery;
      
      if (!query.studyoid) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse('RWS00001', 'studyoid parameter is required'));
        return;
      }
      
      const xml = generateODMMetadata(query.studyoid);
      
      reply
        .code(200)
        .header('Content-Type', 'application/xml')
        .send(xml);
    }
  );

  // Generic ODM dataset endpoint
  fastify.get(
    '/RaveWebServices/datasets/:dataset.odm',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const query = request.query as DatasetQuery;
      
      if (!query.studyoid) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse('RWS00001', 'studyoid parameter is required'));
        return;
      }
      
      const xml = generateODMWithClinicalData(query.studyoid);
      
      reply
        .code(200)
        .header('Content-Type', 'application/xml')
        .send(xml);
    }
  );

  // Users CSV
  fastify.get(
    '/RaveWebServices/datasets/Users.csv',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      const csv = generateCSV('Users');
      
      reply
        .code(200)
        .header('Content-Type', 'text/csv')
        .send(csv);
    }
  );

  // Sites CSV
  fastify.get(
    '/RaveWebServices/datasets/Sites.csv',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      const csv = generateCSV('Sites');
      
      reply
        .code(200)
        .header('Content-Type', 'text/csv')
        .send(csv);
    }
  );

  // Signatures CSV
  fastify.get(
    '/RaveWebServices/datasets/Signatures.csv',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      const csv = generateCSV('Signatures');
      
      reply
        .code(200)
        .header('Content-Type', 'text/csv')
        .send(csv);
    }
  );

  // Version Folders CSV
  fastify.get(
    '/RaveWebServices/datasets/VersionFolders.csv',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      const csv = generateCSV('VersionFolders');
      
      reply
        .code(200)
        .header('Content-Type', 'text/csv')
        .send(csv);
    }
  );

  // Generic CSV dataset endpoint
  fastify.get(
    '/RaveWebServices/datasets/:dataset.csv',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { dataset } = request.params as { dataset: string };
      const csv = generateCSV(dataset);
      
      reply
        .code(200)
        .header('Content-Type', 'text/csv')
        .send(csv);
    }
  );
}

