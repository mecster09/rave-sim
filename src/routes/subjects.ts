import { FastifyInstance } from 'fastify';
import { HarnessConfig } from '../services/config';
import { buildSnapshotODM } from '../services/odmBuilder';
import { SimulatorState, SubjectStatus } from '../services/simulatorState';
import { computeGeneratedAt } from '../services/simulatorHelpers';
import { parseTruncateFlag } from '../utils/flags';

export interface SubjectsRouteDeps {
  getConfig(): HarnessConfig;
  getSimulatorState(): SimulatorState;
}

export function registerSubjectRoutes(app: FastifyInstance, deps: SubjectsRouteDeps) {
  app.get('/RaveWebServices/studies/:studyOid/Subjects', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const query = request.query as { include?: unknown; status?: unknown; truncate?: unknown };

    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    const include = typeof query.include === 'string' ? query.include : undefined;
    const status = typeof query.status === 'string' ? query.status : undefined;
    const truncateFlag = parseTruncateFlag(query.truncate);

    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }

    const allowedIncludes = new Set(['inactive', 'inactiveAndDeleted']);
    if (include && !allowedIncludes.has(include)) {
      return reply.code(400).send({ error: 'Invalid include parameter' });
    }

    if (status && status !== 'all') {
      return reply.code(400).send({ error: 'Invalid status parameter' });
    }

    let allowedStatuses: SubjectStatus[] = ['Active'];
    if (status === 'all' || include === 'inactiveAndDeleted') {
      allowedStatuses = ['Active', 'Inactive', 'Deleted'];
    } else if (include === 'inactive') {
      allowedStatuses = ['Active', 'Inactive'];
    }

    const simulatorState = deps.getSimulatorState();
    const snapshot = simulatorState.getSnapshot();
    const metadataVersionOid = simulatorState.getPrimaryMetadataVersionOid();
    const filteredSubjects = snapshot.subjects
      .filter(subject => allowedStatuses.includes(subject.subjectStatus))
      .map(subject => ({
        subjectKey: String(subject.subjectKey),
        siteLocationOid: subject.siteLocationOid,
        subjectStatus: subject.subjectStatus,
        visits: subject.visits.map(visit => ({
          visitOid: visit.visitOid,
          forms: visit.forms.map(form => ({
            formOid: form.formOid,
            data: { ...form.data }
          }))
        }))
      }));

    const { generatedAt } = computeGeneratedAt(simulatorState);

    const shouldTruncate = deps.getConfig().truncateOdm || truncateFlag.requested;

    const xml = buildSnapshotODM({
      studyOid,
      metadataVersionOid,
      generatedAt,
      subjects: filteredSubjects,
      truncate: shouldTruncate
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });
}
