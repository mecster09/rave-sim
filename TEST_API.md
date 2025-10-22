# Quick API Test Guide

## Start the Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## Quick Tests (Copy & Paste)

### 1. Health Check (No Auth Required)
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### 2. Get Version (With Auth)
```bash
curl -u test:test123 http://localhost:3000/RaveWebServices/version
```

Expected response:
```
1.8.0
```

### 3. Cache Flush
```bash
curl -u test:test123 "http://localhost:3000/RaveWebServices/WebService.aspx?CacheFlush"
```

Expected response:
```json
{"status":"cache flushed"}
```

### 4. Get Clinical Audit Records (ODM)
```bash
curl -u test:test123 "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=STUDY001"
```

Expected response: ODM XML
```xml
<?xml version="1.0" encoding="utf-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     FileType="Snapshot"
     ...>
  <ClinicalData StudyOID="STUDY001" MetaDataVersionOID="1">
    <!-- Mock: empty clinical data -->
  </ClinicalData>
</ODM>
```

### 5. Get Metadata
```bash
curl -u test:test123 "http://localhost:3000/RaveWebServices/datasets/ClinicalDatasets.odm?studyoid=STUDY001"
```

Expected response: ODM XML with MetaDataVersion, Forms, ItemDefs

### 6. Get Users CSV
```bash
curl -u test:test123 http://localhost:3000/RaveWebServices/datasets/Users.csv
```

Expected response:
```csv
UserOID,Username,FirstName,LastName,Email,Active,Role
```

### 7. Import Clinical Data
```bash
curl -u test:test123 \
  -X POST http://localhost:3000/RaveWebServices \
  -H "Content-Type: text/xml; charset=utf-8" \
  -d '<?xml version="1.0" encoding="utf-8"?>
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

Expected response:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Response xmlns="http://www.cdisc.org/ns/odm/v1.3"
          ReferenceNumber="..."
          InboundODMFileOID="mockFile"
          IsTransactionSuccessful="1">
</Response>
```

### 8. Test Authentication Failure
```bash
curl http://localhost:3000/RaveWebServices/version
```

Expected response: 401 Unauthorized with ODM error XML

### 9. Test Missing Parameter
```bash
curl -u test:test123 http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm
```

Expected response: 400 Bad Request with error Response

### 10. Test MAuth (Stubbed)
```bash
curl -H "X-MWS-Authentication: mock-signature" \
  http://localhost:3000/RaveWebServices/version
```

Expected response:
```
1.8.0
```

## PowerShell Commands (Windows)

If using PowerShell, use these instead:

```powershell
# Health check
Invoke-WebRequest http://localhost:3000/health

# Version with auth
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("test:test123"))
Invoke-WebRequest -Uri "http://localhost:3000/RaveWebServices/version" `
  -Headers @{Authorization="Basic $base64Auth"}

# Clinical Audit Records
Invoke-WebRequest -Uri "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=STUDY001" `
  -Headers @{Authorization="Basic $base64Auth"}
```

## Using VS Code REST Client

1. Install "REST Client" extension
2. Open `examples/sample-requests.http`
3. Click "Send Request" above any request

## Using Postman

1. Import collection with base URL: `http://localhost:3000`
2. Set Auth Type: Basic Auth
   - Username: `test`
   - Password: `test123`
3. Test endpoints

## Run Automated Tests

```bash
npm test
```

All 45 tests should pass:
```
Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
```

## Common Issues

### Port 3000 Already in Use
```bash
# Use different port
PORT=4000 npm run dev
```

### Authentication Issues
- Ensure Basic Auth header is included: `-u test:test123`
- Or use MAuth header: `-H "X-MWS-Authentication: signature"`

### XML Format Issues
- Ensure Content-Type is `text/xml` for POST requests
- Verify ODM XML includes required attributes: FileType, ODMVersion, FileOID

## Success Criteria

✅ All curl commands return expected responses
✅ Authentication is enforced (401 without auth)
✅ Query parameter validation works (400 for missing studyoid)
✅ ODM XML responses are valid
✅ CSV responses have headers
✅ Import accepts valid ODM XML
✅ All tests pass

---

**Ready to test!** Start with the health check and work your way down the list.

