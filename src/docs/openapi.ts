import { OpenAPIV3_1 } from 'openapi-types';

export const openApiSpec: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: {
    title: 'Rave Simulator API',
    version: '1.0.0',
    description:
      'Deterministic simulator that replays Rave Web Services responses for testing harness integrations.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development'
    }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Harness' },
    { name: 'Datasets' },
    { name: 'Subjects' },
    { name: 'Audit' },
    { name: 'Metadata' }
  ],
  security: [{ BasicAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health probe',
        security: [],
        responses: {
          '200': {
            description: 'Simulator is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' }
                  },
                  required: ['status']
                }
              }
            }
          }
        }
      }
    },
    '/protected-ping': {
      get: {
        tags: ['Health'],
        summary: 'Authenticated ping',
        responses: {
          '200': {
            description: 'Basic auth protected ping',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true }
                  },
                  required: ['ok']
                }
              }
            }
          },
          '401': {
            description: 'Missing or invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/harness/config': {
      get: {
        tags: ['Harness'],
        summary: 'Read harness configuration',
        responses: {
          '200': {
            description: 'Current harness configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    config: { $ref: '#/components/schemas/HarnessConfig' }
                  },
                  required: ['config']
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Harness'],
        summary: 'Update harness configuration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  applyMode: {
                    type: 'string',
                    enum: ['apply', 'applyAndReset'],
                    default: 'apply'
                  },
                  config: { $ref: '#/components/schemas/HarnessConfig' }
                },
                additionalProperties: false
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Configuration accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    config: { $ref: '#/components/schemas/HarnessConfig' },
                    applyMode: {
                      type: 'string',
                      enum: ['apply', 'applyAndReset']
                    }
                  },
                  required: ['config', 'applyMode']
                }
              }
            }
          },
          '400': {
            description: 'Payload validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/harness/speed': {
      get: {
        tags: ['Harness'],
        summary: 'Read simulation speed',
        responses: {
          '200': {
            description: 'Current minutes per study day',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HarnessSpeed' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Harness'],
        summary: 'Update simulation speed',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HarnessSpeed' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated speed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HarnessSpeed' }
              }
            }
          },
          '400': {
            description: 'Invalid speed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/harness/reset': {
      post: {
        tags: ['Harness'],
        summary: 'Reset simulator state',
        responses: {
          '200': {
            description: 'State reset and new snapshot generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResetResponse' }
              }
            }
          }
        }
      }
    },
    '/harness/status': {
      get: {
        tags: ['Harness'],
        summary: 'Describe simulator status',
        security: [],
        responses: {
          '200': {
            description: 'Current status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HarnessStatus' }
              }
            }
          }
        }
      }
    },
    '/harness/time': {
      get: {
        tags: ['Harness'],
        summary: 'Current simulation clock',
        security: [],
        responses: {
          '200': {
            description: 'Time state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HarnessTimeState' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Harness'],
        summary: 'Set simulation clock',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  simStudyDay: {
                    type: 'number',
                    minimum: 0
                  },
                  freeze: {
                    type: 'boolean'
                  }
                },
                required: ['simStudyDay', 'freeze'],
                additionalProperties: false
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated time state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HarnessTimeState' }
              }
            }
          },
          '400': {
            description: 'Invalid request body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/Subjects': {
      get: {
        tags: ['Subjects'],
        summary: 'Export subject roster',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/IncludeQuery' },
          { $ref: '#/components/parameters/StatusQuery' },
          { $ref: '#/components/parameters/TruncateQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot of subjects',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/datasets/regular': {
      get: {
        tags: ['Datasets'],
        summary: 'Clinical View regular dataset',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot of clinical data',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/datasets/regular/{formOid}': {
      get: {
        tags: ['Datasets'],
        summary: 'Clinical View regular dataset filtered by form',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/FormOidParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot of clinical data filtered by form',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/subjects/{subjectKey}/datasets/regular': {
      get: {
        tags: ['Datasets'],
        summary: 'Clinical View regular dataset filtered by subject',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/SubjectKeyParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot for a specific subject',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Subject not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/datasets/raw': {
      get: {
        tags: ['Datasets'],
        summary: 'Raw dataset (decoded)',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' },
          { $ref: '#/components/parameters/RawSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot of raw dataset',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/datasets/raw/{formOid}': {
      get: {
        tags: ['Datasets'],
        summary: 'Raw dataset filtered by form',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/FormOidParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' },
          { $ref: '#/components/parameters/RawSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot filtered by form',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/subjects/{subjectKey}/datasets/raw': {
      get: {
        tags: ['Datasets'],
        summary: 'Raw dataset filtered by subject',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/SubjectKeyParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' },
          { $ref: '#/components/parameters/RawSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot for a specific subject',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Subject not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/versions/{versionId}/datasets/regular': {
      get: {
        tags: ['Datasets'],
        summary: 'Versioned regular dataset',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/VersionIdParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot generated from deterministic version seed',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/versions/{versionId}/datasets/regular/{formOid}': {
      get: {
        tags: ['Datasets'],
        summary: 'Versioned regular dataset filtered by form',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/VersionIdParam' },
          { $ref: '#/components/parameters/FormOidParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot filtered by form',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/versions/{versionId}/subjects/{subjectKey}/datasets/regular': {
      get: {
        tags: ['Datasets'],
        summary: 'Versioned regular dataset filtered by subject',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/VersionIdParam' },
          { $ref: '#/components/parameters/SubjectKeyParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot filtered by subject',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Subject not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/versions/{versionId}/datasets/raw': {
      get: {
        tags: ['Datasets'],
        summary: 'Versioned raw dataset',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/VersionIdParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' },
          { $ref: '#/components/parameters/RawSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot generated from version seed',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/versions/{versionId}/datasets/raw/{formOid}': {
      get: {
        tags: ['Datasets'],
        summary: 'Versioned raw dataset filtered by form',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/VersionIdParam' },
          { $ref: '#/components/parameters/FormOidParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' },
          { $ref: '#/components/parameters/RawSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot filtered by form',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/studies/{studyOid}/versions/{versionId}/subjects/{subjectKey}/datasets/raw': {
      get: {
        tags: ['Datasets'],
        summary: 'Versioned raw dataset filtered by subject',
        parameters: [
          { $ref: '#/components/parameters/StudyOid' },
          { $ref: '#/components/parameters/VersionIdParam' },
          { $ref: '#/components/parameters/SubjectKeyParam' },
          { $ref: '#/components/parameters/TruncateQuery' },
          { $ref: '#/components/parameters/StartQuery' },
          { $ref: '#/components/parameters/VersionItemQuery' },
          { $ref: '#/components/parameters/DecodeSuffixQuery' },
          { $ref: '#/components/parameters/RawSuffixQuery' }
        ],
        responses: {
          '200': {
            description: 'ODM snapshot filtered by subject',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Subject not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/datasets/ClinicalAuditRecords.odm': {
      get: {
        tags: ['Audit'],
        summary: 'Transactional audit feed',
        parameters: [
          { $ref: '#/components/parameters/StudyOidQuery' },
          { $ref: '#/components/parameters/AuditStartIdQuery' },
          { $ref: '#/components/parameters/AuditPerPageQuery' },
          { $ref: '#/components/parameters/AuditModeQuery' },
          { $ref: '#/components/parameters/AuditUnicodeQuery' },
          { $ref: '#/components/parameters/TruncateQuery' }
        ],
        responses: {
          '200': {
            description: 'Audit ODM payload',
            headers: {
              Link: {
                description: 'Pagination link to the next page when available',
                schema: { type: 'string' }
              }
            },
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '503': {
            description: 'Backfill not complete in enhanced/all modes',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/datasets/VersionFolders.odm': {
      get: {
        tags: ['Datasets'],
        summary: 'Version folders export',
        parameters: [{ $ref: '#/components/parameters/StudyOidQuery' }],
        responses: {
          '200': {
            description: 'Version folders ODM payload',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Missing studyoid',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'No version folders available',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/RaveWebServices/metadata/studies/{studyName}/versions/{versionId}': {
      get: {
        tags: ['Metadata'],
        summary: 'Study metadata export',
        parameters: [
          { $ref: '#/components/parameters/StudyNameParam' },
          { $ref: '#/components/parameters/VersionIdParam' }
        ],
        responses: {
          '200': {
            description: 'Metadata ODM payload',
            content: {
              'application/xml': {
                schema: { $ref: '#/components/schemas/OdmXml' }
              }
            }
          },
          '400': {
            description: 'Invalid study or version identifier',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Study or metadata version not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Golden payload missing when requested',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BasicAuth: {
        type: 'http',
        scheme: 'basic'
      }
    },
    schemas: {
      HarnessConfig: {
        type: 'object',
        properties: {
          studyName: { type: 'string' },
          siteCount: { type: 'integer', minimum: 1 },
          subjectCount: { type: 'integer', minimum: 1 },
          visitCountPerSubject: { type: 'integer', minimum: 1 },
          formDataPointsPerVisit: { type: 'integer', minimum: 1 },
          simSpeedMinutesPerDay: { type: 'number', minimum: 1 },
          resetOnStartup: { type: 'boolean' },
          randomSeed: { type: 'integer', minimum: 1 },
          truncateOdm: { type: 'boolean' },
          forceClinicalViewStreamFailure: { type: 'boolean' },
          forceVersionFoldersStreamFailure: { type: 'boolean' }
        },
        required: [
          'studyName',
          'siteCount',
          'subjectCount',
          'visitCountPerSubject',
          'formDataPointsPerVisit',
          'simSpeedMinutesPerDay',
          'resetOnStartup',
          'randomSeed',
          'truncateOdm',
          'forceClinicalViewStreamFailure',
          'forceVersionFoldersStreamFailure'
        ]
      },
      HarnessSpeed: {
        type: 'object',
        properties: {
          simSpeedMinutesPerDay: { type: 'number', minimum: 1 }
        },
        required: ['simSpeedMinutesPerDay'],
        additionalProperties: false
      },
      HarnessStatus: {
        type: 'object',
        properties: {
          config: { $ref: '#/components/schemas/HarnessConfig' },
          simClock: { $ref: '#/components/schemas/SimClock' },
          freeze: { type: 'boolean' },
          counts: { $ref: '#/components/schemas/HarnessCounts' },
          availability: {
            type: 'array',
            items: { $ref: '#/components/schemas/HarnessAvailabilityEntry' }
          }
        },
        required: ['config', 'simClock', 'freeze', 'counts', 'availability']
      },
      HarnessCounts: {
        type: 'object',
        properties: {
          sites: { type: 'integer', minimum: 0 },
          subjects: { type: 'integer', minimum: 0 },
          visits: { type: 'integer', minimum: 0 },
          availableVisits: { type: 'integer', minimum: 0 },
          unavailableVisits: { type: 'integer', minimum: 0 },
          forms: { type: 'integer', minimum: 0 }
        },
        required: ['sites', 'subjects', 'visits', 'availableVisits', 'unavailableVisits', 'forms']
      },
      HarnessAvailabilityEntry: {
        type: 'object',
        properties: {
          subjectKey: { type: 'integer' },
          visits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                visitOid: { type: 'string' },
                sequenceNumber: { type: 'integer' },
                availableDay: { type: 'number' },
                isAvailable: { type: 'boolean' }
              },
              required: ['visitOid', 'sequenceNumber', 'availableDay', 'isAvailable']
            }
          }
        },
        required: ['subjectKey', 'visits']
      },
      HarnessTimeState: {
        type: 'object',
        properties: {
          simClock: { $ref: '#/components/schemas/SimClock' },
          freeze: { type: 'boolean' },
          frozenDay: {
            type: ['number', 'null']
          }
        },
        required: ['simClock', 'freeze', 'frozenDay']
      },
      SimClock: {
        type: 'object',
        properties: {
          simStartWallClock: { type: 'integer', description: 'Epoch milliseconds the simulation started' },
          simCurrentStudyDay: { type: 'number' },
          simSpeedMinutesPerDay: { type: 'number' }
        },
        required: ['simStartWallClock', 'simCurrentStudyDay', 'simSpeedMinutesPerDay']
      },
      ResetResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'reset' },
          counts: { $ref: '#/components/schemas/HarnessCounts' }
        },
        required: ['status', 'counts']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: ['array', 'null'],
            items: { type: 'string' }
          }
        },
        required: ['error'],
        additionalProperties: true
      },
      OdmXml: {
        type: 'string',
        description: 'ODM XML document'
      }
    },
    parameters: {
      StudyOid: {
        name: 'studyOid',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      StudyNameParam: {
        name: 'studyName',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      VersionIdParam: {
        name: 'versionId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Metadata or dataset version identifier'
      },
      IncludeQuery: {
        name: 'include',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          enum: ['inactive', 'inactiveAndDeleted']
        }
      },
      StatusQuery: {
        name: 'status',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          enum: ['all']
        }
      },
      TruncateQuery: {
        name: 'truncate',
        in: 'query',
        required: false,
        schema: {
          oneOf: [
            { type: 'boolean' },
            {
              type: 'string',
              enum: ['true', 'false', '1', '0'],
              description: 'Boolean accepted as string for compatibility'
            }
          ]
        }
      },
      FormOidParam: {
        name: 'formOid',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      SubjectKeyParam: {
        name: 'subjectKey',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Numeric subject identifier as a string'
      },
      StudyOidQuery: {
        name: 'studyoid',
        in: 'query',
        required: true,
        schema: { type: 'string' }
      },
      AuditStartIdQuery: {
        name: 'startid',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      },
      AuditPerPageQuery: {
        name: 'per_page',
        in: 'query',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 50
        }
      },
      AuditModeQuery: {
        name: 'mode',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          enum: ['default', 'normal', 'enhanced', 'all'],
          default: 'default'
        }
      },
      AuditUnicodeQuery: {
        name: 'unicode',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          enum: ['true', 'false']
        }
      },
      StartQuery: {
        name: 'start',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          format: 'date-time',
          description: 'Optional ISO-8601 timestamp to limit returned records'
        }
      },
      VersionItemQuery: {
        name: 'versionitem',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      },
      DecodeSuffixQuery: {
        name: 'decodesuffix',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      },
      RawSuffixQuery: {
        name: 'rawsuffix',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      }
    }
  }
};
