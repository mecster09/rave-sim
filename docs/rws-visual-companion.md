# 🎯 RWS Visual Companion — Metadata → Clinical Data → Audit Logs &#40;GitHub-Compatible&#41;

**Purpose:** HTML-safe Markdown and GitHub-compatible Mermaid diagrams illustrating how the three RWS endpoints connect through the data lifecycle.  
**Endpoints covered:**
- `GET /studies/&#40;study-oid&#41;/datasets/metadata/regular` &#40;ODM metadata&#41;
- `GET /studies/&#40;study-oid&#41;/datasets/&#40;regular-or-raw&#41;/&#40;form-oid&#41;` &#40;ODM clinical data&#41;
- `GET /datasets/ClinicalAuditRecords.odm` &#40;ODM audit trail, paginated&#41;

---

## 1&#41; Big Picture: Data Lifecycle Map

```mermaid
flowchart LR
    subgraph Prep[Preparation]
      A[Authenticate &#40;Basic or MAuth&#41;]
      B[Select Study OID]
    end

    subgraph Meta[Metadata Extraction]
      M1[GET /studies/&#40;study-oid&#41;/datasets/metadata/regular]
      M2[ODM: Study → MetaDataVersion → Forms & Items]
    end

    subgraph Data[Clinical Data Extraction]
      D1[GET /studies/&#40;study-oid&#41;/datasets/&#40;regular or raw&#41;/&#40;form-oid&#41;]
      D2[ODM: ClinicalData → SubjectData → FormData → ItemData]
    end

    subgraph Audit[Audit Trail Extraction]
      A1[GET /datasets/ClinicalAuditRecords.odm?studyoid&startid&per_page]
      A2[ODM: ClinicalData → AuditRecord entries &#40;paged&#41;]
    end

    A --> B --> M1
    M1 --> M2 --> D1 --> D2 --> A1 --> A2
```

> **Why this order?**
> - **Metadata** defines form/item OIDs used to parse clinical & audit payloads.
> - **Clinical Data** delivers subject-level records using those OIDs.
> - **Audit Logs** provide transactional lineage for those values.

---

## 2&#41; Component View &#40;GitHub-Compatible&#41;

```mermaid
graph TD
  Client[Client / ETL / AI Agent] -->|HTTPS + Auth| RWS[Rave Web Services]

  subgraph Rave_EDC[Rave EDC]
    DB[&#40;Rave Database&#41;]
    ODM[ODM Adapter]
  end

  RWS --> ODM
  ODM --> DB

  RWS -->|/studies/&#40;study-oid&#41;/datasets/metadata/regular| Client
  RWS -->|/studies/&#40;study-oid&#41;/datasets/&#40;regular-or-raw&#41;/&#40;form-oid&#41;| Client
  RWS -->|/datasets/ClinicalAuditRecords.odm| Client
```

---

## 3&#41; End-to-End Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant RWS
    participant ODM as ODM Adapter
    participant DB as Rave DB

    Client->>RWS: GET metadata &#40;Auth&#41;
    RWS->>ODM: Resolve metadata
    ODM->>DB: Read Form/Item definitions
    ODM-->>RWS: ODM XML &#40;MetaDataVersion&#41;
    RWS-->>Client: 200 OK &#40;metadata&#41;

    Client->>RWS: GET clinical dataset &#40;Auth&#41;
    RWS->>ODM: Fetch dataset
    ODM->>DB: Read subject/form/item data
    ODM-->>RWS: ODM XML &#40;ClinicalData&#41;
    RWS-->>Client: 200 OK &#40;clinical data&#41;

    Client->>RWS: GET audit dataset &#40;Auth + pagination&#41;
    RWS->>ODM: Retrieve audit slice
    ODM->>DB: Read audit records
    ODM-->>RWS: ODM XML &#40;AuditRecord&#41;
    RWS-->>Client: 200 OK &#40;audit data&#41;
```

---

## 4&#41; Request/Response Mapping

### Metadata &#40;ODM&#41;
```
GET /RaveWebServices/studies/&#40;study-oid&#41;/datasets/metadata/regular
Authorization: Basic or MAuth
Accept: application/xml
```
**Response**
```xml
<ODM>
  <Study OID="Study&#40;Prod&#41;">
    <MetaDataVersion OID="2025-10-20T00:00:00Z">
      <FormDef OID="DM" Name="Demographics"/>
      <ItemDef OID="DM.AGE" Name="AGE" DataType="integer"/>
    </MetaDataVersion>
  </Study>
</ODM>
```

### Clinical Data &#40;ODM&#41;
```
GET /RaveWebServices/studies/&#40;study-oid&#41;/datasets/regular/&#40;form-oid&#41;
```
**Response**
```xml
<ODM>
  <ClinicalData StudyOID="Study&#40;Prod&#41;">
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

### Audit Data &#40;ODM&#41;
```
GET /RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Study&#40;Prod&#41;&startid=0&per_page=1000
```
**Response**
```xml
<ODM>
  <ClinicalData StudyOID="Study&#40;Prod&#41;">
    <AuditRecord ID="1234" User="jsmith" Action="Update" Timestamp="2025-10-20T09:00:00Z">
      <Field OID="AE.AEDESC" OldValue="HEADACHE" NewValue="MIGRAINE"/>
    </AuditRecord>
  </ClinicalData>
</ODM>
```

---

## 5&#41; Lifecycle State Map

```mermaid
stateDiagram-v2
    [*] --> Metadata
    Metadata --> ClinicalData: Uses Form/Item OIDs
    ClinicalData --> AuditTrail: Tracks changes over time
    AuditTrail --> ClinicalData: Reconcile data
    AuditTrail --> Metadata: Validate OID references
```

---

## 6&#41; Pagination Flow for Audits

```mermaid
flowchart LR
  S[startid = 0] --> Q[GET ClinicalAuditRecords?startid=&per_page=]
  Q -->|200 OK| P[Process AuditRecord nodes]
  P --> N[Compute next startid]
  N --> Q
  Q -->|4xx/5xx| E[Handle error/retry]
```

---

## 7&#41; Error Handling Flow

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

## 8&#41; Minimal cURL Examples

```bash
# Metadata
curl -u user:pass "https://{host}/RaveWebServices/studies/{study-oid}/datasets/metadata/regular"

# Clinical Data &#40;form-level&#41;
curl -u user:pass "https://{host}/RaveWebServices/studies/{study-oid}/datasets/regular/{form-oid}"

# Audit &#40;paged&#41;
curl -u user:pass "https://{host}/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid={study-oid}&startid=0&per_page=1000"
```

---

## 9&#41; Implementation Checklist

- [ ] Use HTTPS &#40;`Accept: application/xml`&#41;
- [ ] Prefer **MAuth** over Basic for services
- [ ] URL-encode `study-oid`
- [ ] Retrieve metadata first
- [ ] Pull clinical data &#40;decoded/raw/unit variants&#41;
- [ ] Stream/paginate audit datasets
- [ ] Implement retry logic &#40;HTTP 500/429&#41;
- [ ] Cache response headers for sync diagnostics

---

*End of GitHub-compatible RWS Visual Companion.*
