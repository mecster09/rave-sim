# Rave Web Services Mock API

A mock implementation of Medidata Rave Web Services (RWS) API built with Fastify, TypeScript, and Jest.

## Features

- ✅ Fastify-based REST API
- ✅ TypeScript for type safety
- ✅ Basic Auth & MAuth (stubbed) support
- ✅ ODM 1.3 XML responses
- ✅ CSV dataset responses
- ✅ Pagination support
- ✅ Comprehensive test suite with Jest

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Build

```bash
npm run build
npm start
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Authentication

The API supports two authentication methods:

1. **Basic Auth**: Include `Authorization: Basic <base64(user:pass)>` header
2. **MAuth** (stubbed): Include `X-MWS-Authentication` header

Default credentials for testing:
- Username: `test`
- Password: `test123`

## Endpoints

### Version
- `GET /RaveWebServices/version` - Returns RWS version

### Cache Management
- `GET /RaveWebServices/WebService.aspx?CacheFlush` - Flush cache

### Dataset Endpoints
- `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm`
- `GET /RaveWebServices/datasets/SubjectsCalendar.odm`
- `GET /RaveWebServices/datasets/ClinicalDatasets.odm`
- `GET /RaveWebServices/datasets/{ViewName}.csv`
- `GET /RaveWebServices/datasets/Users.csv`
- `GET /RaveWebServices/datasets/Sites.csv`
- `GET /RaveWebServices/datasets/Signatures.csv`
- `GET /RaveWebServices/datasets/VersionFolders.csv`

### Clinical Data Import
- `POST /RaveWebServices` - Import ODM clinical data

## Query Parameters

Common parameters:
- `studyoid` (required for most endpoints)
- `startid` - For pagination
- `per_page` - Records per page
- `unicode` - Include Unicode (true/false)
- `mode` - Data mode (default/enhanced/all)

## License

MIT

