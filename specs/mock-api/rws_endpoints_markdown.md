# Rave Web Services — API Endpoints (for AI agent)

> This file lists the principal RWS endpoints (HTTP method, path, required headers, parameters, response type) and the expected request/response object structure (ODM/CSV) so an AI agent can recreate the API surface (no data). It is **not** an implementation; it only describes endpoints, headers, parameters and object schema guidance.

---

## Notes for the implementer

* All requests use HTTPS. Port 443 is expected.
* Authentication: Basic HTTP Auth (Authorization: Basic ...) **or** Medidata MAuth (v1) signing. All requests must be authenticated. (RWS supports both methods.)
* Payloads that carry clinical/metadata are CDISC ODM 1.3 XML (UTF-8). Some dataset endpoints return CSV. Vendor extensions exist — follow ODM 1.3 ordering rules.
* The agent should reproduce response body formats (ODM XML or CSV) but **must return empty datasets** (no real clinical data).
* For any paged dataset, implement `next` link in headers and `per_page`/`startid` query params as documented.

---

## Common headers (required)

```
Authorization: Basic <base64(user:pass)>   # if using Basic auth
# OR (for MAuth)
X-MWS-Authentication: <mauth-signature/headers as required>
Content-Type: text/xml; charset=utf-8       # for ODM POST/PUT
Accept: text/xml                            # when expecting ODM
Accept: text/csv                            # when expecting CSV
Cache-Control: no-cache                     # optional to force fresh proxy results
```

(Implement both auth styles but default tests can accept Basic auth.)

---

## Endpoint: GET /RaveWebServices/version

- **Method**: GET
- **Path**: `/RaveWebServices/version`
- **Headers**: Authentication required (Basic or MAuth)
- **Query params**: none
- **Response type**: `text/plain` containing RWS version string (e.g. `1.8.0`)
- **Response body example**:

```text
1.8.0
```

---

## Endpoint: GET /RaveWebServices/WebService.aspx?CacheFlush

- **Method**: GET
- **Path**: `/RaveWebServices/WebService.aspx?CacheFlush`
- **Purpose**: flush RWS cache for immediate config changes
- **Headers**: Authentication required
- **Response**: empty 200 OK or status page. (Agent should return `200 OK` with JSON `{ "status": "cache flushed" }` for mock.)

---

## Dataset-style endpoints (pattern)

Many read-only exports use the pattern: `/RaveWebServices/datasets/{DatasetName}.{format}`

Common formats: `.odm` (ODM XML), `.csv` (CSV)

For each dataset implement:
- support for query string parameters described below
- correct Content-Type (application/xml or text/csv)
- paging (where applicable)

### Example: Clinical Audit Records

- **Method**: GET
- **Path**: `/RaveWebServices/datasets/ClinicalAuditRecords.odm`
- **Headers**: Auth required
- **Query params (supported versions)**:
  - `studyoid` (required): URL-escaped study OID string
  - `startid` (optional): starting audit ID for pagination
  - `per_page` (optional): number of records to return
  - `unicode` (optional): `true|false` — include Unicode in response (ODM adapter V2+)
  - `mode` (optional, Rave 2022.3.0+): `default|enhanced|all`
- **Response type**: `application/xml` (ODM 1.3 Snapshot or Transactional document)
- **Response structure**: ODM root `<ODM>` with `<ClinicalData>` and audit entries per ODM adapter schema. For a mock implement an `<ODM>` root with zero or sample `<ClinicalData>` and appropriate attributes (FileType, CreationDateTime, ODMVersion). Include empty or placeholder entries to show structure.

### Example: Subjects Calendar

- **Method**: GET
- **Path**: `/RaveWebServices/datasets/SubjectsCalendar.odm`
- **Query params**:
  - `studyoid` (required)
  - `StudySiteNumber` (optional)
  - `SubjectName` (optional)
- **Response type**: `application/xml` (ODM)
- **Response structure**: ODM with `<ClinicalData>` + `<SubjectData>` + visit dates.

### Example: Clinical View CSV

- **Method**: GET
- **Path**: `/RaveWebServices/datasets/{ClinicalViewName}.csv` (or a general `ClinicalView` endpoint)
- **Query params**: typically `studyoid` and dataset-specific filters
- **Response type**: `text/csv`
- **Response structure**: first row is header; subsequent rows are data rows. For a mock return only the header row and zero data rows.

---

## Metadata endpoints (ODM responses)

### Retrieve Clinical Datasets Metadata as ODM

- **Method**: GET
- **Path**: `/RaveWebServices/datasets/ClinicalDatasets.odm`  *(agent: implement as `/RaveWebServices/datasets/ClinicalDatasets.odm?studyoid={study-oid}`)*
- **Headers**: Auth required
- **Query params**: `studyoid` (required)
- **Response type**: `application/xml` (ODM metadata describing MetaDataVersion, Study events, Forms, ItemGroups, ItemDefs)
- **Response structure**: ODM `<Study>` / `<MetaDataVersion>` elements describing CRF structure. For mock: include MetaDataVersion with a sample Form and ItemDef entries but no actual study data.

---

## Clinical data import (ODM POST)

- **Method**: POST
- **Path**: `/RaveWebServices` *(many clients post the full ODM document to the RaveWebServices base or an appropriate resource path — accept POST to `/RaveWebServices/` or `/RaveWebServices/ClinicalData` for the mock)*
- **Headers**:
  - `Authorization` (Basic or MAuth) required
  - `Content-Type: text/xml; charset=utf-8`
- **Body**: ODM 1.3 Transactional XML (FileType="Transactional") containing `<ClinicalData>` with `<SubjectData>`, `<StudyEventData>`, `<FormData>`, `<ItemGroupData>`, `<ItemData>`.
  - RWS supports the `TransactionType` attribute on many elements (Insert, Update, Upsert, Remove, Context)
- **Response type**: `application/xml` — an ODM `<Response>` or `<ODM mdsol:ErrorDescription=... />` in error cases.
- **Success response example (mock)**:
```xml
<Response ReferenceNumber="0000" InboundODMFileOID="mockFile" IsTransactionSuccessful="1">
</Response>
```
- **Error response**: ODM `<ODM mdsol:ErrorDescription="..." />` or `<Response IsTransactionSuccessful="0" ReasonCode="RWSxxxxx" ...>` following the documented error codes.

**Important:** The request body must be UTF-8 encoded and follow ODM 1.3 ordering rules. TransactionType semantics must be preserved. See ODM rules.

---

## Configurable / Admin datasets (examples to mock)

- **Users dataset**: `/RaveWebServices/datasets/Users.csv` or `.odm`
  - params: `studyoid` (optional for library-level), `per_page`, `startid`
  - response: CSV or ODM structure describing users
- **Sites dataset**: `/RaveWebServices/datasets/Sites.csv`
- **Signatures dataset**: `/RaveWebServices/datasets/Signatures.csv`
- **VersionFolders dataset**: `/RaveWebServices/datasets/VersionFolders.csv`

For these endpoints return header rows and empty content. Implement `per_page` and `startid` query parameters where applicable.

---

## Error handling

- Return proper HTTP status codes and include RWS reason codes when appropriate. The service returns many reason codes (e.g., `RWS00092 CRF version not found`). For a mock, implement a small subset of codes and map them to status codes (e.g., 401 Unauthorized, 404 Not Found, 409 Conflict, 400 Bad Request).
- Error response bodies can be either a small `<Response ... IsTransactionSuccessful="0" ReasonCode="RWS00092" ... />` or an `<ODM mdsol:ErrorDescription="..." />` document for parse or auth errors.

---

## Guidance for AI agent who will re-create the API

1. Reproduce the `datasets` path structure: `/RaveWebServices/datasets/{Name}.{ext}` and support `.odm` and `.csv` as needed.
2. Implement authentication enforcement. Support both Basic and a stubbed MAuth header verification.
3. For POST/import endpoints accept **ODM 1.3** XML and validate (lightweight): check for `<ODM>` root and required attributes. Return success `<Response>` for syntactically valid payloads.
4. For dataset GET endpoints return correct Content-Type and either:
   - ODM root with minimal metadata/empty `<ClinicalData>` for `.odm`, or
   - CSV header only (no rows) for `.csv` requests.
5. Implement paging query params: `startid`, `per_page`, and include `Link` header or `next` in response headers for multi-page.
6. Implement CacheFlush endpoint.
7. Provide seeded example responses (version string, sample ODM skeletons) so client tests can assert shape.

---

## Appendix: Relevant references

- CDISC ODM 1.3 is the canonical request/response schema for RWS XML payloads — follow element order and required attributes.
- RWS uses TransactionType attributes on clinical elements (Insert, Update, Upsert, Remove, Context). Use these in transactional POSTs.


---

_End of document._

