# 🎯 RWS Visual Companion — Metadata → Clinical Data → Audit Logs (GitHub-Compatible)

**Purpose:** HTML-safe Markdown and GitHub-compatible Mermaid diagrams illustrating how the three RWS endpoints connect through the data lifecycle.  
**Endpoints covered:**
- `GET /studies/(study-oid)/datasets/metadata/regular` (ODM metadata)
- `GET /studies/(study-oid)/datasets/(regular-or-raw)/(form-oid)` (ODM clinical data)
- `GET /datasets/ClinicalAuditRecords.odm` (ODM audit trail, paginated)

---

## 1) Big Picture: Data Lifecycle Map

```mermaid
flowchart LR
    subgraph Prep[Preparation]
      A[Authenticate (Basic or MAuth)]
      B[Select Study OID]
    end

    subgraph Meta[Metadata Extraction]
      M1[GET /studies/(study-oid)/datasets/metadata/regular]
      M2[ODM: Study → MetaDataVersion → Forms & Items]
    end

    subgraph Data[Clinical Data Extraction]
      D1[GET /studies/(study-oid)/datasets/(regular or raw)/(form-oid)]
      D2[ODM: ClinicalData → SubjectData → FormData → ItemData]
    end

    subgraph Audit[Audit Trail Extraction]
      A1[GET /datasets/ClinicalAuditRecords.odm?studyoid&startid&per_page]
      A2[ODM: ClinicalData → AuditRecord entries (paged)]
    end

    A --> B --> M1
    M1 --> M2 --> D1 --> D2 --> A1 --> A2
```

> **Why this order?**
> - **Metadata** defines form/item OIDs used to parse clinical & audit payloads.
> - **Clinical Data** delivers subject-level records using those OIDs.
> - **Audit Logs** provide transactional lineage for those values.

---

## 2) Component View (GitHub-Compatible)

```mermaid
graph TD
  Client[Client / ETL / AI Agent] -->|HTTPS + Auth| RWS[Rave Web Services]

  subgraph Rave_EDC[Rave EDC]
    DB[(Rave Database)]
    ODM[ODM Adapter]
  end

  RWS --> ODM
  ODM --> DB

  RWS -->|/studies/(study-oid)/datasets/metadata/regular| Client
  RWS -->|/studies/(study-oid)/datasets/(regular-or-raw)/(form-oid)| Client
  RWS -->|/datasets/ClinicalAuditRecords.odm| Client
```

---

## 3) End-to-End Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant RWS
    participant ODM as ODM Adapter
    participant DB as Rave DB

    Client->>RWS: GET metadata (Auth)
    RWS->>ODM: Resolve metadata
    ODM->>DB: Read Form/Item definitions
    ODM-->>RWS: ODM XML (MetaDataVersion)
    RWS-->>Client: 200 OK (metadata)

    Client->>RWS: GET clinical dataset (Auth)
    RWS->>ODM: Fetch dataset
    ODM->>DB: Read subject/form/item data
    ODM-->>RWS: ODM XML (ClinicalData)
    RWS-->>Client: 200 OK (clinical data)

    Client->>RWS: GET audit dataset (Auth + pagination)
    RWS->>ODM: Retrieve audit slice
    ODM->>DB: Read audit records
    ODM-->>RWS: ODM XML (AuditRecord)
    RWS-->>Client: 200 OK (audit data)
```

---

## 4) Request/Response Mapping

### Metadata (ODM)
```
GET /RaveWebServices/studies/(study-oid)/datasets/metadata/regular
Authorization: Basic or MAuth
Accept: application/xml
```
**Response**
```xml
<ODM>
  <Study OID="Study(Prod)">
    <MetaDataVersion OID="2025-10-20T00:00:00Z">
      <FormDef OID="DM" Name="Demographics"/>
      <ItemDef OID="DM.AGE" Name="AGE" DataType="integer"/>
    </MetaDataVersion>
  </Study>
</ODM>
```

### Clinical Data (ODM)
```
GET /RaveWebServices/studies/(study-oid)/datasets/regular/(form-oid)
```
**Response**
```xml
<ODM>
  <ClinicalData StudyOID="Study(Prod)">
    <SubjectData SubjectKey="SUBJ001">
      <FormData FormOID="DM">
        <ItemGroupData ItemGroupOID="DM">
          <ItemData ItemOID="DM.AGE" Value="34"/>
        </ItemGroupData>
      </FormData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

### Audit Data (ODM)
```
GET /RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Study(Prod)&startid=0&per_page=1000
```
**Response**
```xml
<ODM>
  <ClinicalData StudyOID="Study(Prod)">
    <AuditRecord ID="1234" User="jsmith" Action="Update" Timestamp="2025-10-20T09:00:00Z">
      <Field OID="AE.AEDESC" OldValue="HEADACHE" NewValue="MIGRAINE"/>
    </AuditRecord>
  </ClinicalData>
</ODM>
```

---

## 5) Lifecycle State Map

```mermaid
stateDiagram-v2
    [*] --> Metadata
    Metadata --> ClinicalData: Uses Form/Item OIDs
    ClinicalData --> AuditTrail: Tracks changes over time
    AuditTrail --> ClinicalData: Reconcile data
    AuditTrail --> Metadata: Validate OID references
```

---

## 6) Pagination Flow for Audits

```mermaid
flowchart LR
  S[startid = 0] --> Q[GET ClinicalAuditRecords?startid=&per_page=]
  Q -->|200 OK| P[Process AuditRecord nodes]
  P --> N[Compute next startid]
  N --> Q
  Q -->|4xx/5xx| E[Handle error/retry]
```

---

## 7) Error Handling Flow

```mermaid
flowchart TD
    C[Call RWS] --> V{Validate Inputs}
    V -->|Missing| E400[400 Bad Request]
    V -->|OK| A[Authenticate]
    A -->|Fail| E401[401 Unauthorized]
    A -->|Pass| P[Process Request]
    P -->|Not Found| E404[404 Not Found]
    P -->|OK| R[200 OK]
    P -->|Unexpected| E500[500 Internal Server Error]
```

---

## 8) Minimal cURL Examples

```bash
# Metadata
curl -u user:pass "https://{host}/RaveWebServices/studies/{study-oid}/datasets/metadata/regular"

# Clinical Data (form-level)
curl -u user:pass "https://{host}/RaveWebServices/studies/{study-oid}/datasets/regular/{form-oid}"

# Audit (paged)
curl -u user:pass "https://{host}/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid={study-oid}&startid=0&per_page=1000"
```

---

## 9) Implementation Checklist

- [ ] Use HTTPS (`Accept: application/xml`)
- [ ] Prefer **MAuth** over Basic for services
- [ ] URL-encode `study-oid`
- [ ] Retrieve metadata first
- [ ] Pull clinical data (decoded/raw/unit variants)
- [ ] Stream/paginate audit datasets
- [ ] Implement retry logic (HTTP 500/429)
- [ ] Cache response headers for sync diagnostics

---

*End of GitHub-compatible RWS Visual Companion.*
