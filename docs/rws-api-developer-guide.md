# 🧩 Medidata Rave Web Services (RWS) — Full Developer API Guide

**Version:** October 2025  
**Audience:** AI and Engineering Agents — for API simulation, mocking, and integration tasks  
**Source:** Medidata Rave Web Services (RWS) Technical Reference  
**Purpose:** To provide a comprehensive, structured Markdown reference for programmatic understanding and recreation of Rave Web Services endpoints and logic.

---

## ⚙️ Overview

Medidata **Rave Web Services (RWS)** provides a set of REST-style APIs that allow authorized clients to interact with **Medidata Rave EDC** systems for retrieving clinical study data, metadata, and audit trail records in **CDISC ODM XML** format.

RWS is primarily used for:  
- Extracting metadata about studies, forms, and fields.  
- Retrieving clinical view data for subjects and CRFs.  
- Accessing clinical audit trail records for traceability and compliance.

All endpoints return **CDISC ODM 1.3 XML** documents and are accessible via secure HTTPS connections.

---

## 🔐 Authentication

Rave Web Services supports two authentication mechanisms:

### 1. Basic HTTP Authentication

**Description:** Uses a Rave username and password encoded as Base64.  
**Header Example:**
```
Authorization: Basic bXlVc2VyOm15UGFzcw==
```
**Notes:**
- Recommended only for manual or limited integrations.
- Rave user credentials must have study access.
- Subject to password expiry policies.

### 2. Medidata MAuth (Application Authentication)

**Description:** Uses cryptographic request signing with an application UUID and private key.  
**Headers Example:**
```
MAuth-Application: 123e4567-e89b-12d3-a456-426614174000
MAuth-Signature: abc123XYZSignature
MAuth-Time: 1734978420
```
**Notes:**
- Recommended for long-term or automated integrations.
- Each MAuth app is mapped to a Rave user role with defined permissions.
- Requires HTTPS (TLS 1.2 or higher).

---

## 🌍 Base URL Format

All endpoints share a common base path:

```
https://{host}/RaveWebServices
```

| Placeholder | Description | Example |
|--------------|-------------|----------|
| `{host}` | Rave organization host domain | `acme.mdsol.com` |

---

## 🧾 1. Retrieve Clinical Datasets Metadata as ODM

**Endpoint:**
```
GET /studies/{study-oid}/datasets/metadata/regular
```

### Description
Retrieves **clinical view dataset metadata** as **CDISC ODM XML**, including form, item, and dataset structures.

### Use Case
Used by ETL and data engineering systems to map CRFs and data structures before extracting subject data.

### Authentication
✅ Required — Basic or MAuth.

### Headers
| Name | Required | Description |
|------|-----------|-------------|
| `Authorization` | ✅ | Basic or MAuth |
| `Accept` | ❌ | Default: `application/xml` |
| `Content-Type` | ❌ | Default: `application/xml` |

### Path Parameters
| Name | Type | Required | Description |
|------|------|-----------|-------------|
| `study-oid` | string | ✅ | Study identifier (e.g., `Mediflex(Prod)`) |

### Query Parameters
| Name | Type | Required | Description |
|------|------|-----------|-------------|
| `versionitem` | string | ❌ | Include CRF version info |
| `decodesuffix` | string | ❌ | Add decoded values for coded fields |
| `codelistsuffix` | string | ❌ | Include code list OIDs |
| `rawsuffix` | string | ❌ | Include raw data field values |

### Example Request
```
GET https://acme.mdsol.com/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular?codelistsuffix=_CL&decodesuffix=_DECODE
```

### Example Success Response
```xml
<ODM>
  <Study OID="Mediflex(Prod)">
    <MetaDataVersion OID="2025-10-20T00:00:00Z">
      <FormDef OID="DM" Name="Demographics" />
      <ItemDef OID="DM.AGE" Name="AGE" DataType="integer" />
    </MetaDataVersion>
  </Study>
</ODM>
```

### Error Responses
| Code | Message | Cause |
|------|----------|-------|
| 401 | Unauthorized | Invalid credentials |
| 404 | Not Found | Study not found or user lacks access |
| 500 | Internal Server Error | Server-side ODM export issue |

---

## 🧾 2. Retrieve Clinical View Datasets as ODM

**Endpoint Variants:**
```
GET /studies/{study-oid}/datasets/{regular-or-raw}
GET /studies/{study-oid}/datasets/{regular-or-raw}/{form-oid}
GET /studies/{study-oid}/versions/{version-id}/datasets/{regular-or-raw}
GET /studies/{study-oid}/subjects/{subject-name}/datasets/{regular-or-raw}
```

### Description
Retrieves **clinical data** (regular or raw datasets) from Rave as **CDISC ODM XML**.  
Allows filtering by form, version, or subject.

### Authentication
✅ Required — Basic or MAuth.

### Headers
| Name | Required | Description |
|------|-----------|-------------|
| `Authorization` | ✅ | Basic or MAuth |
| `Accept` | ❌ | Default: `application/xml` |

### Path Parameters
| Name | Type | Required | Description |
|------|------|-----------|-------------|
| `study-oid` | string | ✅ | Study identifier |
| `regular-or-raw` | string | ✅ | Data type: `regular` or `raw` |
| `form-oid` | string | ❌ | Specific form identifier |
| `version-id` | string | ❌ | Study version identifier |
| `subject-name` | string | ❌ | Subject key |

### Query Parameters
| Name | Type | Description |
|------|------|-------------|
| `start` | datetime | Retrieve incremental changes since timestamp |
| `versionitem` | string | Include CRF version |
| `decodesuffix` | string | Include decoded dictionary values |
| `codelistsuffix` | string | Include code list OIDs |
| `rawsuffix` | string | Include raw data |
| `stdsuffix` | string | Include standardized/unit values |

### Example Request
```
GET https://acme.mdsol.com/RaveWebServices/studies/Mediflex(Prod)/datasets/regular/DM?versionitem=_VER
```

### Example Success Response
```xml
<ODM>
  <ClinicalData StudyOID="Mediflex(Prod)">
    <SubjectData SubjectKey="SUBJ001">
      <SiteRef LocationOID="001" />
      <StudyEventData StudyEventOID="SCREENING">
        <FormData FormOID="DM" FormRepeatKey="1">
          <ItemGroupData ItemGroupOID="DM" TransactionType="Insert">
            <ItemData ItemOID="DM.AGE" Value="34"/>
            <ItemData ItemOID="DM.SEX" Value="M"/>
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

### Error Responses
| Code | Message | Cause |
|------|----------|-------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Authentication failed |
| 404 | Not Found | Study or dataset inaccessible |
| 500 | Server Error | ODM data generation failure |

---

## 🧾 3. Retrieve Clinical Data with the Clinical Audit Records Dataset

**Endpoint:**
```
GET /datasets/ClinicalAuditRecords.odm
```

### Description
Retrieves **clinical audit trail data** (field, form, and record-level transactions) as ODM XML.  
Supports pagination via `startid` and `per_page` parameters.

### Authentication
✅ Required — Basic or MAuth.

### Headers
| Name | Required | Description |
|------|-----------|-------------|
| `Authorization` | ✅ | Basic or MAuth |
| `Accept` | ❌ | Default: `application/xml` |

### Query Parameters
| Name | Type | Required | Description |
|------|------|-----------|-------------|
| `studyoid` | string | ✅ | Study identifier |
| `startid` | integer | ✅ | Starting record ID |
| `per_page` | integer | ✅ | Number of records per response |
| `unicode` | boolean | ❌ | Enable Unicode output (Rave ≥2019.2) |
| `mode` | string | ❌ | Enhanced extraction (`enhanced`, `all`) |

### Example Request
```
GET https://acme.mdsol.com/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Mediflex(Prod)&startid=0&per_page=1000&unicode=true
```

### Example Success Response
```xml
<ODM>
  <ClinicalData StudyOID="Mediflex(Prod)">
    <AuditRecord ID="1234" User="jsmith" Action="Update" Timestamp="2025-10-20T09:00:00Z">
      <Field OID="AE.AEDESC" OldValue="HEADACHE" NewValue="MIGRAINE" />
    </AuditRecord>
  </ClinicalData>
</ODM>
```

### Error Responses
| Code | Message | Cause |
|------|----------|-------|
| 400 | Bad Request | Invalid or missing parameters |
| 401 | Unauthorized | Invalid credentials |
| 404 | Not Found | Study or dataset not found |
| 500 | Internal Server Error | ODM generation failed |

---

## 🔁 Common Response Headers

| Header | Description |
|--------|-------------|
| `X-MWS-CV-Last-Updated` | Timestamp when Clinical View was last updated |
| `X-Last-AuditStudiesBatch-Time` | Latest audit refresh timestamp |
| `Content-Type` | MIME type (`application/xml`) |
| `Date` | Server response timestamp |

---

## ⚠️ Error Handling Summary

| HTTP Code | Meaning | Typical Cause |
|------------|----------|----------------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid parameters or query syntax |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Study, dataset, or form not accessible |
| 429 | Too Many Requests | Rate-limiting (if enabled) |
| 500 | Internal Server Error | Rave backend or ODM export failure |

---

## 🧠 Implementation Best Practices

- Always use HTTPS with TLS 1.2+.  
- Prefer **MAuth** over Basic authentication for automated services.  
- URL-encode study identifiers like `(Prod)` → `%28Prod%29`.  
- Fetch **metadata first** to cache OIDs and structure for parsing datasets.  
- Implement **pagination** for large audit datasets (`startid`, `per_page`).  
- Use **incremental pulls** with `start` or timestamps for efficiency.  
- Implement **retries** with exponential backoff for transient 5xx errors.  
- Log ODM XML responses for traceability and compliance.  

---

## ✅ Summary of Core Endpoints

| Endpoint | Purpose | Method | Output Format |
|-----------|----------|--------|----------------|
| `/studies/{study-oid}/datasets/metadata/regular` | Retrieve dataset metadata | GET | ODM XML |
| `/studies/{study-oid}/datasets/{regular-or-raw}` | Retrieve clinical view datasets | GET | ODM XML |
| `/datasets/ClinicalAuditRecords.odm` | Retrieve clinical audit trail data | GET | ODM XML (paged) |

---

## 🧩 Example cURL Commands

**Retrieve Metadata**
```bash
curl -u user:pass "https://acme.mdsol.com/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular"
```

**Retrieve Clinical Data**
```bash
curl -u user:pass "https://acme.mdsol.com/RaveWebServices/studies/Mediflex(Prod)/datasets/regular/DM"
```

**Retrieve Audit Data**
```bash
curl -u user:pass "https://acme.mdsol.com/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Mediflex(Prod)&startid=0&per_page=1000"
```

---

*End of RWS Developer Guide.*
