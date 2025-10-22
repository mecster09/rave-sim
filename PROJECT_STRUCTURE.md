# Project Structure

```
rave-sim/
├── src/                          # Source code
│   ├── middleware/               # Middleware functions
│   │   └── auth.ts              # Authentication middleware
│   ├── routes/                  # API route handlers
│   │   ├── cache.ts            # Cache flush endpoint
│   │   ├── clinical-data.ts    # Clinical data import endpoints
│   │   ├── datasets.ts         # Dataset endpoints (ODM & CSV)
│   │   └── version.ts          # Version endpoint
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts            # Common types
│   ├── utils/                   # Utility functions
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── csv.ts              # CSV generation utilities
│   │   └── odm.ts              # ODM XML generation utilities
│   ├── app.ts                   # Fastify app builder (for testing)
│   └── server.ts                # Main server entry point
│
├── tests/                        # Test files
│   ├── api.test.ts              # Integration tests
│   ├── auth.test.ts             # Authentication tests
│   ├── csv.test.ts              # CSV utility tests
│   └── odm.test.ts              # ODM utility tests
│
├── examples/                     # Example files
│   ├── sample-requests.http     # HTTP request examples
│   └── sample-odm-import.xml    # Sample ODM XML for import
│
├── specs/                        # Specifications
│   └── mock-api/
│       ├── rave_web_services.pdf
│       └── rws_endpoints_markdown.md  # API specification
│
├── dist/                         # Compiled JavaScript (generated)
│
├── coverage/                     # Test coverage reports (generated)
│
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest test configuration
├── README.md                     # Project documentation
├── QUICKSTART.md                 # Quick start guide
└── PROJECT_STRUCTURE.md          # This file
```

## Key Components

### Authentication (`src/middleware/auth.ts`, `src/utils/auth.ts`)
- Basic HTTP Authentication
- MAuth header verification (stubbed)
- Credential validation

### Routes
- **Version** - RWS version endpoint
- **Cache** - Cache flush functionality
- **Datasets** - ODM and CSV dataset endpoints
- **Clinical Data** - ODM XML import endpoints

### Utilities
- **ODM** - Generate ODM 1.3 XML responses
- **CSV** - Generate CSV dataset responses
- **Auth** - Authentication helpers

### Types (`src/types/index.ts`)
- TypeScript interfaces for requests/responses
- Query parameter types
- ODM metadata types

## API Endpoints Summary

### Core Endpoints
- `GET /health` - Health check
- `GET /` - API information
- `GET /RaveWebServices/version` - RWS version

### Dataset Endpoints (ODM)
- `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm`
- `GET /RaveWebServices/datasets/SubjectsCalendar.odm`
- `GET /RaveWebServices/datasets/ClinicalDatasets.odm`
- `GET /RaveWebServices/datasets/:dataset.odm`

### Dataset Endpoints (CSV)
- `GET /RaveWebServices/datasets/Users.csv`
- `GET /RaveWebServices/datasets/Sites.csv`
- `GET /RaveWebServices/datasets/Signatures.csv`
- `GET /RaveWebServices/datasets/VersionFolders.csv`
- `GET /RaveWebServices/datasets/:dataset.csv`

### Import Endpoints
- `POST /RaveWebServices` - Import ODM clinical data
- `POST /RaveWebServices/ClinicalData` - Alternative import endpoint

### Management Endpoints
- `GET /RaveWebServices/WebService.aspx?CacheFlush` - Flush cache

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Language**: TypeScript 5.x
- **Testing**: Jest 29.x
- **Logging**: Pino

## Development Workflow

1. **Development**: `npm run dev` - Hot reload with tsx
2. **Build**: `npm run build` - Compile TypeScript
3. **Test**: `npm test` - Run Jest tests
4. **Start**: `npm start` - Run production build

## Code Organization Principles

1. **Separation of Concerns**: Routes, middleware, and utilities are separated
2. **Type Safety**: Full TypeScript coverage
3. **Testability**: App builder pattern for easy testing
4. **Standards Compliance**: Follows ODM 1.3 and RWS specifications
5. **Mock Data**: Returns structured but empty datasets as specified

