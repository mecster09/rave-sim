# Rave RWS Test Harness API – Complete Requirements & Scenarios

> **Purpose**
>
>This document is a **self-contained, authoritative requirements specification** for building a **test harness API** that mimics selected Medidata Rave Web Services (RWS) production endpoints.
>
>**IMPORTANT:** Consumers of this document are assumed to have **no access** to the original Rave API reference. Therefore, *all required dependencies, parameters, behaviors, schemas, and examples are fully documented here*.
>
>**Primary goal:** Enable deterministic, production-faithful testing by exactly matching endpoint behavior, response codes, and XML (ODM 1.3) payloads based on request parameters.
>
>Refer to [docs/constitution.md](docs/constitution.md) for coding constraints, testing thresholds, and task-level governance that apply to every change.

---

## Scope of This Harness

This harness has two cooperating parts:

1. **RWS Parity Layer (Request/Response):** Implements the selected Rave RWS endpoints and returns deterministic, production-faithful XML.
2. **Simulator (Data Generation & Time):** Generates and persists study data (sites, subjects, visits/folders, forms/values) and controls when data becomes available to the parity endpoints.

### In-Scope Reference Sections (Production Parity Targets)
- **1.4.2** – ODM Operational Data Model Adapter
- **1.5.1.6** – Retrieve Clinical View Datasets as ODM
- **1.5.3.5** – Retrieve Admin Data with the Version Folders Dataset
- **1.5.7** – Clinical View metadata and extension dependencies
- **1.5.9** – Retrieve the List of Subjects in a Study

### Out of Scope
- Any write/update services (e.g., `PostODMClinicalData`)
- Non-ODM CSV datasets (unless explicitly added later)
- UI or workflow behaviors outside HTTP request/response semantics

---

# STEP 1 — COMPLETE REQUIREMENTS (SELF-CONTAINED)

---

# STEP 1A — SIMULATOR REQUIREMENTS (CONFIG, DATA GENERATION, TIME)

> **Objective:** Provide a configurable simulator that generates realistic clinical trial data and controls when it becomes visible through the parity endpoints. All simulator outputs must be deterministic and persist until reset.

## A1. Startup Configuration (Required)

The service must support **pre-run configuration** via either environment/config file values or a startup flag set.

### A1.1 Configuration Inputs

| Setting | Required | Type | Constraints | Description |
|---|---:|---|---|---|
| `studyName` | Yes | string | Non-empty | Study identifier used in endpoint paths and payloads (e.g., `Mediflex(Prod)` style) |
| `siteCount` | Yes | integer | >= 1 | Number of sites to generate |
| `subjectCount` | Yes | integer | >= 1 | Number of blinded subjects to generate |
| `visitCountPerSubject` | Yes | integer | >= 1 | Number of visits/folders per subject |
| `formDataPointsPerVisit` | Yes | integer | >= 1 | Number of form datapoints captured per visit |
| `simSpeedMinutesPerDay` | Yes | integer | 15..1440 in increments of 15 | Maps “1 study day” to N minutes of wall-clock time. Default 1440 (1 day = 1 day). Fastest 15 (1 day = 15 minutes). |
| `resetOnStartup` | No | boolean | default false | If true, clear all persisted generated data at startup |
| `truncateOdm` | No | boolean | default false | Truncates Clinical View datasets when the request opts into truncation |
| `forceClinicalViewStreamFailure` | No | boolean | default false | Forces Clinical View regular datasets to end without a closing `</ODM>` to simulate a streaming failure |

### A1.2 Derived/Implicit Simulator Behaviors
- The simulator must establish a **simulation clock** (see A4) and a “study day” concept.
- All generated entities (sites, subjects, visit schedules, forms/values) must be **persisted in memory** at minimum.
- If persistence across restarts is required, it must be explicitly enabled and documented (optional enhancement).

---

## A2. Persisted Entities & Data Model (Required)

### A2.1 Study
- Study is identified by `studyName` and is the root context.

### A2.2 Sites
**Generation Requirements**
- Generate `siteCount` sites with dynamic but realistic names.
- Each site must have a stable identifier usable in payloads:
  - `LocationOID` (string or numeric) and a human-readable display name.

**Persistence Rules**
- Site list must remain stable for the life of the service unless reset.

### A2.3 Subjects
**Generation Requirements**
- Generate `subjectCount` subjects.
- Subject identifiers must be **blinded**: numeric or numeric-looking strings (e.g., `100001`, `100002`, …).
- Each subject must be assigned to a site (distribution must be deterministic).

**Persistence Rules**
- Subject list, site assignment, and lifecycle state must remain stable unless reset.

### A2.4 Visits (Folders)
**Generation Requirements**
- For each subject, generate `visitCountPerSubject` visits.
- Visits must have:
  - A deterministic **sequence number** (1..N)
  - A deterministic **VisitOID/FolderOID** and display label
  - A **dependency on the previous visit** (visit N cannot become “complete/available” before visit N-1 reaches the required milestone)

**Persistence Rules**
- Visit schedule and completion state must persist unless reset.

### A2.5 Forms and Form Data Points
**Generation Requirements**
- For each visit, generate a deterministic set of form datapoints.
- “Datapoints” represent ItemData within ItemGroupData for the harness’ ODM outputs.
- The simulator must generate realistic values consistent with a typical clinical trial domain (see A3).

**Persistence Rules**
- Generated form values must persist unless reset.

---

## A3. Realism Rules (Required)

### A3.1 Clinical Trial Domains (Minimum)
The simulator must generate realistic values for at least one coherent trial slice. Minimum recommended domains:
- **Demographics (DM):** sex, age, date of birth (or derived age), race (optional)
- **Vitals (VS):** systolic/diastolic BP, pulse, temperature, weight
- **Adverse Events (AE):** event term, start date, seriousness, relationship (sparingly)

### A3.2 Value Plausibility
- Values must be within plausible human ranges.
- Values must be internally consistent (e.g., age aligns with DOB if both are present).

### A3.3 Sparsity & Missingness
- Not all fields are always populated.
- The simulator must produce a realistic distribution of:
  - Null/missing values
  - Unchanged values across visits
  - Occasional new AE log lines

---

## A4. Time, Availability, and Release Cadence (Required)

### A4.1 Simulation Clock
- The simulator must maintain:
  - `simStartWallClock` (service start)
  - `simCurrentStudyDay` (float or integer)
  - `simSpeedMinutesPerDay`

### A4.2 Data Arrival
- Data must not appear all at once.
- For each subject and visit, the simulator must model:
  - Visit “scheduled day”
  - Visit “data entry window”
  - Visit “available in API” time

### A4.3 Visit Sequencing Dependency
- Visit N cannot become available before Visit N-1 reaches at least “available” (or “complete” if required).

### A4.4 Deterministic Scheduling
- For the same configuration, release times must be deterministic.
- Any randomness must be derived from a stable seed (implicit or explicit).

---

## A5. Reset Behavior (Required)

A reset must:
- Clear all generated entities and state (sites, subjects, visits, forms, audit streams)
- Re-initialize using the current or provided configuration
- Reset the simulation clock baseline

---

## A6. Integration with Parity Endpoints (Required)

The parity endpoints must query simulator state so that:
- **1.5.9 Subjects list** reflects generated subjects and filtering parameters
- **1.5.1.6 Clinical View ODM** returns only data that is “available” per simulator time
- **ClinicalAuditRecords.odm** emits transactions consistent with staged availability (optionally: one audit record per newly-available datapoint)

---

# STEP 1B — CONTROL PLANE API (NEW HARNESS ENDPOINTS)

> **Objective:** Provide endpoints to control speed, reset state, and query full simulator status.

## B1. Control Endpoints Summary

| Endpoint | Method | Purpose |
|---|---|---|
| `/harness/config` | GET | Return current configuration (effective values) |
| `/harness/config` | PUT | Update configuration (optionally resetting) |
| `/harness/speed` | GET | Get current speed mapping (minutes per study day) |
| `/harness/speed` | PUT | Set speed mapping (15..1440, step 15) |
| `/harness/reset` | POST | Reset simulator and parity state |
| `/harness/status` | GET | Return full status: config + generated persistent data + current time/state |

### B1.1 Common Requirements
- Control endpoints must not require ODM responses.
- Response format for control endpoints: **JSON** (recommended) or XML if required by platform.
- Control endpoints must be protected by Basic Auth (same as parity endpoints) unless explicitly configured for local-only use.

---

## B2. `/harness/config`

### GET Requirements
- Must return the effective configuration used by the simulator.

### PUT Requirements
- Accepts a configuration payload with any subset of A1.1 fields.
- Must support an `applyMode` field:
  - `apply` (apply to next cycle if possible)
  - `applyAndReset` (default) — applies changes and resets simulator

#### Example Request (JSON)
```json
{
  "studyName": "ExampleStudy(Prod)",
  "siteCount": 10,
  "subjectCount": 250,
  "visitCountPerSubject": 6,
  "formDataPointsPerVisit": 40,
  "simSpeedMinutesPerDay": 60,
  "applyMode": "applyAndReset"
}
```

---

## B3. `/harness/speed`

### PUT Requirements
- Accepts `simSpeedMinutesPerDay` only.
- Must reject invalid values with `400` and an error body.

---

## B4. `/harness/reset`

### POST Requirements
- Resets simulator and parity state per A5.
- Returns `200` with a status summary indicating new seed/time baseline.

---

## B5. `/harness/status`

### GET Requirements
Must return:
1. **Configuration** (A1.1)
2. **Clock state** (A4.1)
3. **Generated persistent entities**
   - Sites (IDs + names)
   - Subjects (IDs + site assignment + lifecycle state)
   - Visit schedule/state summary per subject (counts + current visit index)
   - Form definitions present and datapoint counts
4. **Availability summary**
   - How many subjects/visits/forms are currently visible via parity endpoints

#### Example Response Shape (JSON)
```json
{
  "config": { "studyName": "ExampleStudy(Prod)", "siteCount": 5, "subjectCount": 50, "visitCountPerSubject": 4, "formDataPointsPerVisit": 25, "simSpeedMinutesPerDay": 60 },
  "clock": { "simStartWallClock": "2026-01-01T12:00:00Z", "simCurrentStudyDay": 3.25 },
  "sites": [ { "locationOid": "100", "name": "SITE-100" } ],
  "subjects": [ { "subjectKey": "100001", "site": "100", "state": "Active" } ],
  "visits": { "perSubject": 4, "availableCounts": { "visits": 120, "forms": 480 } }
}
```

---

# STEP 1 — COMPLETE REQUIREMENTS (SELF-CONTAINED)

---

## 1. Global Dependencies (Applies to ALL Endpoints)

### 1.1 Authentication

**Type:** HTTP Basic Authentication

**Requirements**
- All requests **must** include an `Authorization` header using HTTP Basic Auth
- Credentials represent a valid Rave user account
- Authorization failures return HTTP 4xx or 5xx (exact payload may be empty)

**Harness Behavior**
- The harness **must validate presence** of the Authorization header
- Credential values may be mocked but must support:
  - Authorized scenarios
  - Unauthorized scenarios

---

### 1.2 Content Types

| Direction | Value |
|---------|------|
| Request | `text/xml` or `text/xml; charset=UTF-8` |
| Response | `text/xml` |

---

### 1.3 XML Standard (Critical Dependency)

**Specification**
- All payloads conform to **CDISC ODM version 1.3**
- Vendor extensions use namespace:

```xml
xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata"
```

**Strict Rules**
- XML element ordering **must follow ODM schema rules**
- Invalid ordering = invalid payload
- Some attributes may be optional, but **structure must always be valid ODM**

---

### 1.4 Streaming & Partial Responses (Critical Quirk)

Some endpoints may return:
- **HTTP 200** with an **incomplete ODM document** (closing `</ODM>` missing)

**Harness MUST support:**
- Returning intentionally truncated XML for specific scenarios
- Differentiating between:
  1. HTTP 200 + complete ODM → success
  2. HTTP 200 + incomplete ODM → streaming failure
  3. HTTP 4xx/5xx → hard failure

---

### 1.5 Determinism Rules

- Identical request + parameters **must always return identical XML**
- IDs, timestamps, ordering, and pagination **must be stable**
- Randomization is **not permitted** unless explicitly scenario-controlled

---

## 2. Endpoint Requirements

---

## 2.1 ODM Adapter / Clinical Audit Records (Section 1.4.2)

> Note: Clinical Audit Records (CAR) is part of the ODM Adapter capabilities used for clinical transaction/audit extraction. Section **1.5.3.5** in the reference set is **not** CAR; it is the **Version Folders** dataset (see Section 2.2).

### Endpoint
```
GET /RaveWebServices/datasets/ClinicalAuditRecords.odm
```

---

### Query Parameters

| Name | Required | Description |
|----|--------|------------|
| `studyoid` | Yes | Study identifier including environment (URL-escaped) |
| `startid` | No | Audit ID to start extraction from |
| `per_page` | No | Number of audit records per page |
| `unicode` | No | `true` or `false` – include Unicode characters |
| `mode` | No | Controls audit subcategories returned |

**Allowed `mode` values**
- `default`
- `enhanced`
- `all`

---

### Response

- **HTTP 200**
- Payload: ODM 1.3 **transactional** document
- Pagination via response headers (`Link: rel=next`)

---

### Required Behaviors
- Auto-pagination support
- Mode-dependent inclusion of audit subcategories
- Error when requesting enhanced modes before data backfill

---

### Example (Success)
```xml
<ODM ODMVersion="1.3">
  <ClinicalData StudyOID="ExampleStudy(Prod)">
    <SubjectData SubjectKey="SUBJ001">
      <StudyEventData>
        <FormData>
          <ItemGroupData TransactionType="Insert">
            <ItemData ItemOID="AE.AEDESC" Value="BACK PAIN"/>
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

---

## 2.2 Retrieve Admin Data with the Version Folders Dataset (Section 1.5.3.5)

### Purpose
Retrieve a list of **all folders (visits/study events) across all matrices** for each **CRF version "in use"** for a specified study. This is typically used alongside ODM Adapter transaction feeds to interpret audit/transaction data.

### Endpoint
```
GET /RaveWebServices/datasets/VersionFolders.odm
```

### Query Parameters

| Name | Required | Description |
|----|--------|------------|
| `studyoid` | Yes | Study name and environment (URL-escaped), e.g., `Mediflex(Prod)` |

### Response Semantics

The request results in one of:
1. **SUCCESS:** `200 OK` with complete ODM (the `<ODM>` element is closed).
2. **FAIL:** `200 OK` with incomplete ODM (the `<ODM>` element is **not** closed).
3. **FAIL:** `4xx` or `5xx`; further details may be logged server-side.

### ODM Requirements
- Payload MUST be ODM and include `StudyEventDef` structures representing folders.
- Minimum ODM version required to support `StudyEventDef` elements with no child elements is **ODM 1.3.1**.

### Example Request
```
GET https://{host}/RaveWebServices/datasets/VersionFolders.odm?studyoid=Mediflex(Prod)
```

### Harness Requirements
- Must return deterministic folder lists for each CRF version "in use".
- Must preserve element ordering and schema validity (except intentional truncation scenarios).
- Must support streaming-failure (partial ODM) scenarios.

---

## 2.3 Retrieve Clinical View Datasets as ODM (Section 1.5.1.6)

### Endpoints
```
GET /RaveWebServices/studies/{study-oid}/datasets/regular
GET /RaveWebServices/studies/{study-oid}/datasets/regular/{form-oid}
GET /RaveWebServices/studies/{study-oid}/subjects/{subject-key}/datasets/regular
GET /RaveWebServices/studies/{study-oid}/versions/{version-id}/datasets/regular
GET /RaveWebServices/studies/{study-oid}/versions/{version-id}/datasets/regular/{form-oid}
GET /RaveWebServices/studies/{study-oid}/versions/{version-id}/subjects/{subject-key}/datasets/regular

GET /RaveWebServices/studies/{study-oid}/datasets/raw
GET /RaveWebServices/studies/{study-oid}/datasets/raw/{form-oid}
GET /RaveWebServices/studies/{study-oid}/subjects/{subject-key}/datasets/raw
GET /RaveWebServices/studies/{study-oid}/versions/{version-id}/datasets/raw
GET /RaveWebServices/studies/{study-oid}/versions/{version-id}/datasets/raw/{form-oid}
GET /RaveWebServices/studies/{study-oid}/versions/{version-id}/subjects/{subject-key}/datasets/raw
```

---

### Query Parameters

| Name | Applies To | Description |
|----|------------|------------|
| `truncate` | Regular datasets | Boolean flag requesting ODM truncation while retaining HTTP 200 responses |
| `start` | Raw datasets, versioned datasets | ISO-8601 datetime indicating the lower bound for incremental extracts |
| `versionitem` | Raw datasets, versioned datasets | Adds CRF version item metadata to ItemData elements |
| `decodesuffix` | Raw datasets, versioned datasets | Adds decoded ItemData values using the provided suffix |
| `rawsuffix` | Raw datasets, versioned datasets | Adds raw ItemData values using the provided suffix; rejected on regular datasets |

---

### Response
- **HTTP 200**
- ODM 1.3 **snapshot** document by default (scenario harnesses may serialize JSON for certain raw captures used in regression testing)

---

### Required Behaviors
- Form-level filtering
- Subject-level filtering
- Optional inclusion of extension ItemData elements
 - Exact element ordering
 - Deterministic truncation when `truncate=true` or when `forceClinicalViewStreamFailure` is enabled via the harness configuration

---

## 2.3 Retrieve the List of Subjects in a Study (Section 1.5.9)

### Purpose
Retrieve a list of **all subjects accessible to the authenticated user** within a specified study. This endpoint is used as a discovery dependency for subject-level operations.

---

### Endpoint
```
GET /RaveWebServices/studies/{study-oid}/Subjects
```

---

### Path Parameters

| Name | Required | Description |
|----|--------|------------|
| `study-oid` | Yes | Study identifier including environment (URL-escaped) |

---

### Query Parameters

| Name | Required | Description |
|----|--------|------------|
| `status` | No | When set to `all`, returns subjects regardless of status |
| `include` | No | Controls inclusion of non-active subjects |

**Allowed `include` values**
- `inactive`
- `inactiveAndDeleted`

---

### Response Semantics

| Condition | HTTP | Body |
|--------|------|------|
| Success | 200 | Subject listing XML |
| Unauthorized | 4xx | Empty or error response |
| Error | 5xx | Empty or logged |

---

### Query Parameters

| Name | Required | Description |
|----|--------|------------|
| `studyoid` | Yes | Study identifier |
| `StudySiteNumber` | No | Site identifier |
| `SubjectName` | No | Subject identifier |

---

### Response Semantics

| Condition | HTTP | Body |
|--------|------|------|
| Success | 200 | Complete ODM |
| Streaming failure | 200 | Incomplete ODM |
| Error | 4xx/5xx | Empty or logged |

---

# STEP 2 — ENDPOINT-BY-ENDPOINT SCENARIO TABLES

> **Scenario philosophy:** Scenarios are deterministic, parameter-driven, and map to either (a) a golden payload file or (b) a simulator-derived response that is itself deterministic and can be snapshotted to golden files.
>
> Each scenario below includes:
> - **Inputs:** endpoint + parameters + simulator state/time
> - **Match rules:** how the harness selects the scenario
> - **Expected result:** HTTP code + payload characteristics
>
> **Time control:** Scenarios that depend on simulated time assume the harness clock is either:
> - advanced naturally by wall-clock + `simSpeedMinutesPerDay`, or
> - advanced by setting speed and waiting the required wall time.

---

## 2.1 ClinicalAuditRecords.odm Scenarios

| Scenario ID | Match Inputs | Simulator Preconditions | Expected Result | Golden Payload |
|-----------|--------------|------------------------|----------------|---------------|
| CAR-001 | `studyoid` only | Any config; at least 1 subject exists | 200 + first page transactional ODM | `ClinicalAuditRecords/CAR-001.xml` |
| CAR-002 | `studyoid`, `startid`, `per_page` | Audit stream has >= `per_page` records from `startid` | 200 + page-sized transactional ODM + pagination header | `ClinicalAuditRecords/CAR-002.xml` |
| CAR-003 | `mode=enhanced` (or `all`) | Backfill not complete (scenario toggle) | Error response (code/message) | `ClinicalAuditRecords/CAR-003.xml` |
| CAR-004 | `unicode=true` | At least one value contains non-ASCII characters | 200 + transactional ODM preserving Unicode | `ClinicalAuditRecords/CAR-004.xml` |
| CAR-005 | `studyoid` at StudyDay < 1.0 | Simulation time early; only first subject/visit datapoints available | 200 + transactional ODM containing only early-arriving records | `ClinicalAuditRecords/CAR-005.xml` |
| CAR-006 | `studyoid` at StudyDay >= 5.0 | Multiple visits across subjects available | 200 + transactional ODM containing additional inserts/updates | `ClinicalAuditRecords/CAR-006.xml` |

**Notes**
- CAR scenarios that depend on time must reflect the simulator’s **staged availability**: newly-available datapoints should create transactional records (e.g., `Insert`), and subsequent corrections may create `Update`.

---

## 2.2 VersionFolders.odm Scenarios (1.5.3.5)

| Scenario ID | Match Inputs | Simulator Preconditions | Expected Result | Golden Payload |
|-----------|--------------|------------------------|----------------|---------------|
| VF-001 | `studyoid` only | Study exists; at least one CRF version in use | 200 + complete ODM listing folders per in-use CRF version | `VersionFolders/VF-001.xml` |
| VF-002 | `studyoid` only | Streaming failure toggle enabled | 200 + **incomplete ODM** (ODM not closed) | `VersionFolders/VF-002.xml` |
| VF-003 | Unauthorized | Auth fails | 4xx | `VersionFolders/VF-003.xml` (if body required) |

---

## 2.3 Clinical View Datasets as ODM Scenarios

| Scenario ID | Endpoint Variant | Match Inputs | Simulator Preconditions | Expected Result | Golden Payload |
|-----------|------------------|-------------|------------------------|----------------|---------------|
| CV-001 | `/studies/{study}/datasets/regular` | none | Baseline config | 200 + snapshot ODM (all currently-available data) | `ClinicalViews/CV-001.xml` |
| CV-002 | `/.../datasets/regular/{form-oid}` | `form-oid=AE` | AE form exists in trial model | 200 + snapshot ODM filtered to form | `ClinicalViews/CV-002.xml` |
| CV-003 | `/studies/{study}/subjects/{subject}/datasets/regular` | subject scoped | Subject exists | 200 + snapshot ODM for subject only | `ClinicalViews/CV-003.xml` |
| CV-004 | any | `versionitem=VERSION` | Trial model includes VERSION item | 200 + snapshot ODM with VERSION ItemData included | `ClinicalViews/CV-004.xml` |
| CV-005 | any | `decodesuffix=_DEC` | Fields with dictionaries exist | 200 + snapshot ODM with decoded values | `ClinicalViews/CV-005.xml` |
| CV-006 | any | `rawsuffix=_RAW` | Raw values differ from standard in at least one field | 200 + snapshot ODM with raw values | `ClinicalViews/CV-006.xml` |
| CV-007 | `/studies/{study}/datasets/regular` | none | StudyDay < 1.0 | 200 + snapshot ODM where **only Visit 1** data is present for some subjects; later visits absent | `ClinicalViews/CV-007.xml` |
| CV-008 | `/studies/{study}/datasets/regular` | none | StudyDay between 2.0 and 3.0 | 200 + snapshot ODM with Visit 1 complete across most subjects; Visit 2 partially present | `ClinicalViews/CV-008.xml` |
| CV-009 | `/studies/{study}/datasets/regular` | none | StudyDay >= visitCountPerSubject schedule end | 200 + snapshot ODM with all visits present (subject lifecycle permitting) | `ClinicalViews/CV-009.xml` |

**Notes**
- “Availability” is controlled by the simulator clock and visit dependency rules: Visit N data must not appear before Visit N-1 is available.

---

## 2.3 Retrieve the List of Subjects in a Study Scenarios (1.5.9)

| Scenario ID | Match Inputs | Simulator Preconditions | Expected Result | Golden Payload |
|-----------|--------------|------------------------|----------------|---------------|
| SUBJ-001 | study-oid only | Subjects exist; default visibility rules | 200 + subjects list (Active only) | `Subjects/SUBJ-001.xml` |
| SUBJ-002 | `include=inactive` | At least one inactive subject exists in model | 200 + Active + Inactive subjects | `Subjects/SUBJ-002.xml` |
| SUBJ-003 | `include=inactiveAndDeleted` | Inactive and deleted subjects exist | 200 + Active + Inactive + Deleted | `Subjects/SUBJ-003.xml` |
| SUBJ-004 | Unauthorized | Auth fails or user not permitted | 4xx | `Subjects/SUBJ-004.xml` (if body required) |
| SUBJ-005 | `status=all` | Model supports multiple lifecycle states | 200 + all subjects regardless of status | `Subjects/SUBJ-005.xml` |
| SUBJ-006 | Time-based enrollment | StudyDay < 1.0 | 200 + partial enrollment (subset of subjects exist/visible) | `Subjects/SUBJ-006.xml` |

---

## 2.4 Control Plane Scenarios (NEW)

### 2.4.1 `/harness/config`

| Scenario ID | Method | Inputs | Expected Result |
|-----------|--------|--------|----------------|
| CFG-001 | GET | none | 200 + current effective configuration |
| CFG-002 | PUT | valid config + `applyMode=applyAndReset` | 200 + config echoed + simulator reset performed |
| CFG-003 | PUT | invalid values (e.g., `simSpeedMinutesPerDay=17`) | 400 + validation error |
| CFG-004 | PUT | apply without reset (`applyMode=apply`) | 200 + config updated; note: only safe fields updated without reset |

### 2.4.2 `/harness/speed`

| Scenario ID | Method | Inputs | Expected Result |
|-----------|--------|--------|----------------|
| SPD-001 | GET | none | 200 + current `simSpeedMinutesPerDay` |
| SPD-002 | PUT | `simSpeedMinutesPerDay=1440` | 200 + speed updated (1 day = 1 day) |
| SPD-003 | PUT | `simSpeedMinutesPerDay=15` | 200 + speed updated (max acceleration) |
| SPD-004 | PUT | invalid step (e.g., 20) | 400 + validation error |

### 2.4.3 `/harness/reset`

| Scenario ID | Method | Inputs | Expected Result |
|-----------|--------|--------|----------------|
| RST-001 | POST | none | 200 + reset performed; new clock baseline; entities regenerated |
| RST-002 | POST | with optional seed/config override (optional enhancement) | 200 + reset with specified seed |

### 2.4.4 `/harness/status`

| Scenario ID | Method | Inputs | Expected Result |
|-----------|--------|--------|----------------|
| STS-001 | GET | none | 200 + full status (config + clock + sites + subjects + visits + counts) |
| STS-002 | GET | after speed change | 200 + status reflects updated speed |
| STS-003 | GET | after reset | 200 + status reflects regenerated entities and reset clock |

---

## 2.5 Cross-Endpoint, Time-Driven Parity Scenarios (End-to-End)

These scenarios validate that simulator time impacts parity endpoints consistently.

| Scenario ID | Steps | Expected Result |
|-----------|-------|----------------|
| E2E-001 | Set speed to 60; wait 60 mins wall time (1 study day); call Subjects + CV regular | Subjects visible per enrollment schedule; CV contains Visit 1 data only |
| E2E-002 | With Visit dependency enabled: advance to study day 3; call CV regular | Visit 2 may be partial; Visit 3 must not appear if Visit 2 not complete |
| E2E-003 | Advance to study day >= final visit; call CV regular + CAR | CV includes all visits; CAR includes inserts/updates for staged arrival |
| E2E-004 | Reset; call status; call Subjects | Counts and IDs reset to initial deterministic baseline; Subjects list matches regenerated set |

---

# STEP 3 — IMPLEMENTATION NOTES

## 3.0 Golden Snapshot Generation (MANDATORY)

> **Purpose:** Golden snapshots are version-controlled, immutable payload fixtures produced from a **known simulator configuration + time state**. They enable byte-for-byte regression testing and deterministic parity.

### 3.0.1 Snapshot Inputs (Normative)
A golden snapshot MUST be uniquely determined by:

**A. Simulator configuration**
- `studyName`
- `siteCount`
- `subjectCount`
- `visitCountPerSubject`
- `formDataPointsPerVisit`
- `simSpeedMinutesPerDay`
- `seed` (MUST exist; if user does not supply, harness uses a documented constant default)

**B. Simulator time/state**
- `simStudyDay` (preferred) OR deterministic equivalent derived from elapsed time

**C. Endpoint request signature**
- Method
- Path (resolved path params)
- Query parameters (including defaults applied)
- Headers that affect response behavior

---

### 3.0.2 Determinism Requirements (Normative)
Golden generation MUST guarantee identical bytes when rerun with identical inputs.

- **Seeded generation:** All generators (sites, subjects, visit schedules, form values, audits, ordering) MUST use a stable PRNG seeded with `seed`.
- **Stable ordering:** Collections MUST be emitted in deterministic order:
  - Sites by `LocationOID`
  - Subjects by numeric `SubjectKey`
  - Visits by sequence
  - Forms by OID
  - ItemGroups by OID + repeat key
  - ItemData by column ordinal/OID
- **Stable date/time:** No “now” timestamps in payloads. All datetimes MUST be derived from a fixed `trialAnchorDate` + deterministic offsets.

---

### 3.0.3 Snapshot Generation Modes

**Mode A — Golden-by-Scenario (RECOMMENDED)**
- Generate one golden file per scenario in the scenario tables.

**Mode B — Golden-by-Time-Slice**
- Generate goldens for key time points (e.g., StudyDay 0.5, 1.0, 2.0, 5.0, end) and reference them across scenarios.

---

### 3.0.4 Snapshot Workflow (Normative)

**Step 0 — Initialize**
- Apply configuration and seed.
- Reset simulator (equivalent of `/harness/reset`).

**Step 1 — Set simulator time explicitly**
- Set `simStudyDay = X` and **freeze time** so the snapshot capture is stable.

**Step 2 — Execute request**
- Invoke the parity endpoint with the exact request signature.

**Step 3 — Serialization policy**
- Responses MUST be written with consistent encoding (UTF-8).
- Output normalization is allowed ONLY if applied identically at runtime.
  - If production parity is non-canonical, store as-emitted.

**Step 4 — Validate**
- XML well-formedness MUST pass.
- ODM 1.3 schema validation MUST pass for ODM endpoints.
  - Exception: intentional truncation scenarios (streaming failure) may skip schema validation.

**Step 5 — Persist**
Store under:

```
/golden-payloads/
  └── {endpoint-family}/
       └── {scenario-id}.xml
```

**Step 6 — Manifest**
For each snapshot, record:
- scenario ID
- config hash
- seed
- simStudyDay
- request signature
- SHA-256 checksum

Store under:

```
/golden-payloads/manifest.json
```

---

### 3.0.5 Pagination Golden Rules
- Each page MUST be its own golden payload (e.g., `CAR-002-page-1.xml`).
- Pagination response headers MUST be captured either:
  - in a sidecar file (e.g., `CAR-002-page-1.headers.json`), or
  - as `responseHeaders` entries in the manifest.

---

### 3.0.6 Golden Drift Change Control
Golden snapshots MUST be regenerated only when:
- configuration defaults change
- simulation logic changes
- parity logic changes
- ODM schema constraints change

Any golden change MUST include:
- updated manifest entries
- a changelog note explaining why bytes changed

---

## 3.1 Control Plane Extension to Support Golden Generation

To support reproducible golden generation without waiting wall-clock time, the harness MUST add:

### `GET /harness/time`
Returns current simulator time state.

### `PUT /harness/time`
Sets `simStudyDay` explicitly and optionally freezes the clock.

Example:
```json
{ "simStudyDay": 2.5, "freeze": true }
```

---

## 3.2 Manifest Schema (Minimum)

The harness must produce a manifest file with entries similar to:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-01-01T12:00:00Z",
  "entries": [
    {
      "scenarioId": "CV-007",
      "endpoint": {
        "method": "GET",
        "path": "/RaveWebServices/studies/ExampleStudy(Prod)/datasets/regular",
        "query": {},
        "headers": { "Accept": "text/xml" }
      },
      "sim": {
        "seed": 12345,
        "simStudyDay": 0.75,
        "configHash": "sha256:..."
      },
      "artifact": {
        "file": "ClinicalViews/CV-007.xml",
        "sha256": "..."
      }
    }
  ]
}
```

---

## 3.3 Golden XML Payload Strategy (MANDATORY)

To achieve **production-grade parity**, each supported scenario **must** have an associated **golden XML payload**. These payloads are the authoritative source of truth for response bodies and are returned verbatim by the harness.

### Golden Payload Rules
- Golden files **must be byte-for-byte stable**
- XML **must validate against ODM 1.3**
- Element ordering **must exactly match** production behavior
- Timestamps, IDs, and ordering **must not be dynamically generated**
- One golden file per scenario (unless pagination explicitly requires multiple)

Golden payloads should be stored using the following convention:

```
/golden-payloads/
  └── {endpoint-name}/
       └── {scenario-id}.xml
```

---

## 3.4 Golden Payloads — ClinicalAuditRecords.odm

### Scenario CAR-001 — First Page of Audits
**File:** `ClinicalAuditRecords/CAR-001.xml`

```xml
<ODM ODMVersion="1.3" CreationDateTime="2024-01-01T00:00:00">
  <ClinicalData StudyOID="ExampleStudy(Prod)" mdsol:AuditSubCategoryName="Entered"
    xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata">
    <SubjectData SubjectKey="SUBJ001">
      <StudyEventData StudyEventOID="SUBJECT">
        <FormData FormOID="AE" FormRepeatKey="1">
          <ItemGroupData ItemGroupOID="AE_LOG_LINE" ItemGroupRepeatKey="1" TransactionType="Insert">
            <ItemData ItemOID="AE.AEDESC" Value="BACK PAIN" />
            <ItemData ItemOID="AE.AEYN" Value="YES" />
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

---

### Scenario CAR-003 — Enhanced Mode Before Backfill (Error)
**File:** `ClinicalAuditRecords/CAR-003.xml`

```xml
<ODM ODMVersion="1.3">
  <ClinicalData>
    <Error>
      <Code>CAR_BACKFILL_INCOMPLETE</Code>
      <Message>Additional audit subcategories are not yet available.</Message>
    </Error>
  </ClinicalData>
</ODM>
```

---

## 3.5 Golden Payloads — VersionFolders.odm

### Scenario VF-001 — Version Folders Export (Complete ODM)
**File:** `VersionFolders/VF-001.xml`

```xml
<ODM ODMVersion="1.3.1" CreationDateTime="2024-01-01T00:00:00">
  <Study OID="ExampleStudy(Prod)">
    <GlobalVariables>
      <StudyName>ExampleStudy(Prod)</StudyName>
      <ProtocolName>ExampleStudy</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="18" Name="1" mdsol:PrimaryFormOID="EN" xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata">
      <Protocol>
        <StudyEventRef StudyEventOID="SCREEN" OrderNumber="1" Mandatory="No" mdsol:StudyEventDefName="Screening" />
        <StudyEventRef StudyEventOID="VISIT1" OrderNumber="2" Mandatory="No" mdsol:StudyEventDefName="Visit 1" />
      </Protocol>
      <StudyEventDef OID="SCREEN" Name="Screening" Repeating="No" Type="Common" />
      <StudyEventDef OID="VISIT1" Name="Visit 1" Repeating="No" Type="Common" />
    </MetaDataVersion>
    <!-- More MetaDataVersion elements - one for each CRF version "in use" -->
  </Study>
</ODM>
```

---

### Scenario VF-002 — Partial ODM (Streaming Failure)
**File:** `VersionFolders/VF-002.xml`

```xml
<ODM ODMVersion="1.3.1">
  <Study OID="ExampleStudy(Prod)">
    <MetaDataVersion OID="18" Name="1">
      <Protocol>
        <StudyEventRef StudyEventOID="SCREEN" OrderNumber="1" Mandatory="No" />
```

**NOTE:** The ODM element is intentionally **not closed** to emulate streaming failure behavior.

---

## 3.6 Golden Payloads — Clinical View Datasets as ODM

### Scenario CV-001 — Regular Dataset (All Subjects)
**File:** `ClinicalViews/CV-001.xml`

```xml
<ODM ODMVersion="1.3">
  <ClinicalData StudyOID="ExampleStudy(Prod)" MetaDataVersionOID="30">
    <SubjectData SubjectKey="SUBJ001">
      <SiteRef LocationOID="12345" />
      <StudyEventData StudyEventOID="SCREEN" StudyEventRepeatKey="1">
        <FormData FormOID="DM" FormRepeatKey="1">
          <ItemGroupData ItemGroupOID="DM">
            <ItemData ItemOID="DM.SEX" Value="MALE" />
            <ItemData ItemOID="DM.AGE" IsNull="Yes" />
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

---

### Scenario CV-004 — Include CRF Version
**File:** `ClinicalViews/CV-004.xml`

```xml
<ItemData ItemOID="DM.VERSION" Value="5" />
```

*(Included in each FormData block when `versionitem=VERSION` is supplied)*

---

## 3.6 Golden Payloads — Retrieve List of Subjects

### Scenario SUBJ-003 — Include Inactive and Deleted Subjects
**File:** `Subjects/SUBJ-003.xml`

```xml
<Subjects>
  <Subject SubjectKey="SUBJ001" Status="Active" />
  <Subject SubjectKey="SUBJ002" Status="Inactive" />
  <Subject SubjectKey="SUBJ003" Status="Deleted" />
</Subjects>
```

---

## 3.7 Harness Enforcement Requirements

The harness **must**:
- Select the golden payload strictly by:
  - Endpoint
  - Scenario ID
  - Parameter match
- Return payloads **verbatim** (no transformation)
- Fail fast if a golden payload is missing

---

## Validation Checklist (MUST PASS)
- XML validates against ODM 1.3 schema (except intentional truncation cases)
- Element order preserved
- HTTP codes match scenario
- Deterministic replay verified

---

**END OF REQUIREMENTS DOCUMENT**

## 3.1 Golden XML Payload Strategy (MANDATORY)

To achieve **production-grade parity**, each supported scenario **must** have an associated **golden XML payload**. These payloads are the authoritative source of truth for response bodies and are returned verbatim by the harness.

### Golden Payload Rules
- Golden files **must be byte-for-byte stable**
- XML **must validate against ODM 1.3**
- Element ordering **must exactly match** production behavior
- Timestamps, IDs, and ordering **must not be dynamically generated**
- One golden file per scenario (unless pagination explicitly requires multiple)

Golden payloads should be stored using the following convention:

```
/golden-payloads/
  └── {endpoint-name}/
       └── {scenario-id}.xml
```

---

## 3.2 Golden Payloads — ClinicalAuditRecords.odm

### Scenario CAR-001 — First Page of Audits
**File:** `ClinicalAuditRecords/CAR-001.xml`

```xml
<ODM ODMVersion="1.3" CreationDateTime="2024-01-01T00:00:00">
  <ClinicalData StudyOID="ExampleStudy(Prod)" mdsol:AuditSubCategoryName="Entered"
    xmlns:mdsol="http://www.mdsol.com/ns/odm/metadata">
    <SubjectData SubjectKey="SUBJ001">
      <StudyEventData StudyEventOID="SUBJECT">
        <FormData FormOID="AE" FormRepeatKey="1">
          <ItemGroupData ItemGroupOID="AE_LOG_LINE" ItemGroupRepeatKey="1" TransactionType="Insert">
            <ItemData ItemOID="AE.AEDESC" Value="BACK PAIN" />
            <ItemData ItemOID="AE.AEYN" Value="YES" />
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

---

### Scenario CAR-003 — Enhanced Mode Before Backfill (Error)
**File:** `ClinicalAuditRecords/CAR-003.xml`

```xml
<ODM ODMVersion="1.3">
  <ClinicalData>
    <Error>
      <Code>CAR_BACKFILL_INCOMPLETE</Code>
      <Message>Additional audit subcategories are not yet available.</Message>
    </Error>
  </ClinicalData>
</ODM>
```

---

## 3.3 Golden Payloads — Clinical View Datasets as ODM

### Scenario CV-001 — Regular Dataset (All Subjects)
**File:** `ClinicalViews/CV-001.xml`

```xml
<ODM ODMVersion="1.3">
  <ClinicalData StudyOID="ExampleStudy(Prod)" MetaDataVersionOID="30">
    <SubjectData SubjectKey="SUBJ001">
      <SiteRef LocationOID="12345" />
      <StudyEventData StudyEventOID="SCREEN" StudyEventRepeatKey="1">
        <FormData FormOID="DM" FormRepeatKey="1">
          <ItemGroupData ItemGroupOID="DM">
            <ItemData ItemOID="DM.SEX" Value="MALE" />
            <ItemData ItemOID="DM.AGE" IsNull="Yes" />
          </ItemGroupData>
        </FormData>
      </StudyEventData>
    </SubjectData>
  </ClinicalData>
</ODM>
```

---

### Scenario CV-004 — Include CRF Version
**File:** `ClinicalViews/CV-004.xml`

```xml
<ItemData ItemOID="DM.VERSION" Value="5" />
```

*(Included in each FormData block when `versionitem=VERSION` is supplied)*

---

## 3.4 Golden Payloads — Retrieve List of Subjects

### Scenario SUBJ-003 — Include Inactive and Deleted Subjects
**File:** `Subjects/SUBJ-003.xml`

```xml
<Subjects>
  <Subject SubjectKey="SUBJ001" Status="Active" />
  <Subject SubjectKey="SUBJ002" Status="Inactive" />
  <Subject SubjectKey="SUBJ003" Status="Deleted" />
</Subjects>
```

---

## 3.5 Harness Enforcement Requirements

The harness **must**:
- Select the golden payload strictly by:
  - Endpoint
  - Scenario ID
  - Parameter match
- Return payloads **verbatim** (no transformation)
- Fail fast if a golden payload is missing

---

## Validation Checklist (MUST PASS)
- XML validates against ODM 1.3 schema (except intentional truncation cases)
- Element order preserved
- HTTP codes match scenario
- Deterministic replay verified

---

**END OF REQUIREMENTS DOCUMENT**

