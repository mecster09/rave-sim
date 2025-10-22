import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import {
  validateODMXML,
  generateSuccessResponse,
  generateErrorResponse,
  generateODMError
} from '../utils/odm';

export default async function clinicalDataRoutes(fastify: FastifyInstance) {
  // Clinical Data Import - main endpoint
  fastify.post(
    '/RaveWebServices',
    { 
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const contentType = request.headers['content-type'];
      
      if (!contentType?.includes('text/xml')) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateODMError('Content-Type must be text/xml'));
        return;
      }
      
      const body = request.body as string;
      
      if (!validateODMXML(body)) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse(
            'RWS00003',
            'Invalid ODM XML. Must contain <ODM> root element'
          ));
        return;
      }
      
      // Check for basic ODM structure
      if (!body.includes('ODMVersion') || !body.includes('FileType')) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse(
            'RWS00004',
            'ODM XML must include ODMVersion and FileType attributes'
          ));
        return;
      }
      
      // Success response
      const referenceNumber = Date.now().toString().slice(-4);
      reply
        .code(200)
        .header('Content-Type', 'application/xml')
        .send(generateSuccessResponse(referenceNumber));
    }
  );

  // Alternative endpoint for clinical data
  fastify.post(
    '/RaveWebServices/ClinicalData',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const contentType = request.headers['content-type'];
      
      if (!contentType?.includes('text/xml')) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateODMError('Content-Type must be text/xml'));
        return;
      }
      
      const body = request.body as string;
      
      if (!validateODMXML(body)) {
        reply
          .code(400)
          .header('Content-Type', 'application/xml')
          .send(generateErrorResponse(
            'RWS00003',
            'Invalid ODM XML. Must contain <ODM> root element'
          ));
        return;
      }
      
      const referenceNumber = Date.now().toString().slice(-4);
      reply
        .code(200)
        .header('Content-Type', 'application/xml')
        .send(generateSuccessResponse(referenceNumber));
    }
  );
}

