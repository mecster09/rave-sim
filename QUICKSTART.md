# Quick Start Guide

This guide will help you get the Rave Web Services Mock API up and running quickly.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

```bash
# Install dependencies
npm install
```

## Running the Server

### Development Mode (with hot reload)

```bash
npm run dev
```

The server will start at `http://localhost:3000` with automatic restart on file changes.

### Production Mode

```bash
# Build the project
npm run build

# Start the server
npm start
```

## Testing the API

### 1. Using cURL

**Get API Version:**
```bash
curl -u test:test123 http://localhost:3000/RaveWebServices/version
```

**Get Clinical Audit Records:**
```bash
curl -u test:test123 \
  "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=STUDY001" \
  -H "Accept: application/xml"
```

**Get Users CSV:**
```bash
curl -u test:test123 \
  http://localhost:3000/RaveWebServices/datasets/Users.csv \
  -H "Accept: text/csv"
```

**Import Clinical Data:**
```bash
curl -u test:test123 \
  -X POST http://localhost:3000/RaveWebServices \
  -H "Content-Type: text/xml; charset=utf-8" \
  -d @examples/sample-odm-import.xml
```

### 2. Using HTTP Client Files

If you're using VS Code with the REST Client extension:

1. Open `examples/sample-requests.http`
2. Click "Send Request" above any request

### 3. Using Postman

Import the following base configuration:

- Base URL: `http://localhost:3000`
- Auth Type: Basic Auth
  - Username: `test`
  - Password: `test123`

## Authentication

The API supports two authentication methods:

### 1. Basic Authentication (Recommended for testing)
```bash
# Username: test
# Password: test123

# Base64 encoded: dGVzdDp0ZXN0MTIz
curl -H "Authorization: Basic dGVzdDp0ZXN0MTIz" \
  http://localhost:3000/RaveWebServices/version
```

### 2. MAuth (Stubbed)
```bash
curl -H "X-MWS-Authentication: mock-signature" \
  http://localhost:3000/RaveWebServices/version
```

## Common Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (no auth required) |
| `/` | GET | API information (no auth required) |
| `/RaveWebServices/version` | GET | Get RWS version |
| `/RaveWebServices/WebService.aspx?CacheFlush` | GET | Flush cache |
| `/RaveWebServices/datasets/ClinicalAuditRecords.odm` | GET | Clinical audit records (ODM) |
| `/RaveWebServices/datasets/SubjectsCalendar.odm` | GET | Subjects calendar (ODM) |
| `/RaveWebServices/datasets/ClinicalDatasets.odm` | GET | Clinical metadata (ODM) |
| `/RaveWebServices/datasets/Users.csv` | GET | Users dataset (CSV) |
| `/RaveWebServices/datasets/Sites.csv` | GET | Sites dataset (CSV) |
| `/RaveWebServices` | POST | Import clinical data (ODM XML) |

## Query Parameters

Common query parameters for dataset endpoints:

- `studyoid` (required) - Study identifier
- `per_page` (optional) - Number of records per page
- `startid` (optional) - Starting ID for pagination
- `unicode` (optional) - Include Unicode (true/false)
- `mode` (optional) - Data mode (default/enhanced/all)

## Examples

### Get Clinical Data with Pagination
```bash
curl -u test:test123 \
  "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=STUDY001&per_page=100&startid=1000"
```

### Get Metadata
```bash
curl -u test:test123 \
  "http://localhost:3000/RaveWebServices/datasets/ClinicalDatasets.odm?studyoid=STUDY001"
```

### Import ODM XML
```bash
curl -u test:test123 \
  -X POST http://localhost:3000/RaveWebServices \
  -H "Content-Type: text/xml; charset=utf-8" \
  --data '<?xml version="1.0" encoding="utf-8"?>
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
</ODM>'
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Expected Responses

### Success Response (Version)
```
1.8.0
```

### Success Response (ODM Data)
```xml
<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     FileType="Snapshot"
     FileOID="mock-..."
     CreationDateTime="..."
     ODMVersion="1.3">
  <ClinicalData StudyOID="STUDY001" MetaDataVersionOID="1">
    <!-- Mock: empty clinical data -->
  </ClinicalData>
</ODM>
```

### Success Response (CSV Data)
```csv
UserOID,Username,FirstName,LastName,Email,Active,Role
```

### Success Response (Import)
```xml
<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="http://www.cdisc.org/ns/odm/v1.3"
          ReferenceNumber="1234"
          InboundODMFileOID="mockFile"
          IsTransactionSuccessful="1">
</Response>
```

### Error Response (401 Unauthorized)
```xml
<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     mdsol:ErrorDescription="Authentication required...">
</ODM>
```

### Error Response (400 Bad Request)
```xml
<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="http://www.cdisc.org/ns/odm/v1.3"
          IsTransactionSuccessful="0"
          ReasonCode="RWS00001"
          ErrorDescription="studyoid parameter is required">
</Response>
```

## Troubleshooting

### Port Already in Use
Change the port by setting the `PORT` environment variable:
```bash
PORT=4000 npm run dev
```

### Authentication Fails
- Ensure you're using Basic Auth with any non-empty username/password
- Or include the `X-MWS-Authentication` header for MAuth

### Tests Fail
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
npm test
```

## Next Steps

- Review the [API specification](specs/mock-api/rws_endpoints_markdown.md)
- Explore sample requests in `examples/sample-requests.http`
- Check the test files in `tests/` for more examples
- Read the main [README.md](README.md) for detailed documentation

