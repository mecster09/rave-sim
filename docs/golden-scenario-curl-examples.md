# Golden Scenario Curl Examples

Use these sample commands to replay each golden scenario directly against a running simulator (default port 3000). Every capture follows the same pattern:

1. Apply the harness configuration with `applyMode: applyAndReset`.
2. Freeze the simulator clock at the configured study day.
3. Call the scenario endpoint with basic authentication and save the response.

Unless stated otherwise, the examples assume `test-user` / `test-pass` credentials and a Unix-like shell. On Windows PowerShell replace the here-doc blocks with temporary files.

## Default Study (`golden-scenarios/default/config.json`)

Apply harness:

```bash
curl -u test-user:test-pass \
  -X PUT http://localhost:3000/harness/config \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "applyMode": "applyAndReset",
  "config": {
    "studyName": "Default Study",
    "siteCount": 2,
    "subjectCount": 10,
    "visitCountPerSubject": 3,
    "formDataPointsPerVisit": 5,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 123456,
    "truncateOdm": false,
    "forceClinicalViewStreamFailure": false
  }
}
JSON
```

Freeze time:

```bash
curl -X PUT http://localhost:3000/harness/time \
  -H "Content-Type: application/json" \
  -d '{"simStudyDay":2.5,"freeze":true}'
```

Capture payloads:

```bash
curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/Default%20Study/datasets/regular" \
  -o golden-payloads/default/clinical-view/regular-dataset.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&per_page=5" \
  -o golden-payloads/default/audit/clinical-records.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&mode=enhanced&per_page=5" \
  -o golden-payloads/default/audit/clinical-records-enhanced.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/Default%20Study/datasets/raw?start=2023-12-31T22:30:00Z&decodesuffix=_DEC&rawsuffix=_RAW&versionitem=VERSION" \
  -o golden-payloads/default/datasets/raw-options.json

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/Default%20Study/versions/V1/datasets/regular?start=2023-12-31T22:30:00Z&decodesuffix=_DEC&versionitem=VERSION" \
  -o golden-payloads/default/datasets/versioned-regular.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/Default%20Study/versions/V1/datasets/raw?start=2023-12-31T22:30:00Z&decodesuffix=_DEC&rawsuffix=_RAW&versionitem=VERSION" \
  -o golden-payloads/default/datasets/versioned-raw.json
```

## Partial Enrollment (`golden-scenarios/partial-enrollment/config.json`)

Apply harness:

```bash
curl -u test-user:test-pass \
  -X PUT http://localhost:3000/harness/config \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "applyMode": "applyAndReset",
  "config": {
    "studyName": "RWS_PARTIAL_ENROLLMENT",
    "siteCount": 3,
    "subjectCount": 9,
    "visitCountPerSubject": 3,
    "formDataPointsPerVisit": 4,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 424242,
    "truncateOdm": false
  }
}
JSON
```

Freeze time:

```bash
curl -X PUT http://localhost:3000/harness/time \
  -H "Content-Type: application/json" \
  -d '{"simStudyDay":0.5,"freeze":true}'
```

Capture payloads:

```bash
curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_PARTIAL_ENROLLMENT/Subjects" \
  -o golden-payloads/partial-enrollment/subjects/active-only.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_PARTIAL_ENROLLMENT/Subjects?include=inactive" \
  -o golden-payloads/partial-enrollment/subjects/with-inactive.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_PARTIAL_ENROLLMENT/Subjects?include=inactive&status=all" \
  -o golden-payloads/partial-enrollment/subjects/status-all.xml
```

## High Subject Volume (`golden-scenarios/high-subject-volume/config.json`)

Apply harness:

```bash
curl -u test-user:test-pass \
  -X PUT http://localhost:3000/harness/config \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "applyMode": "applyAndReset",
  "config": {
    "studyName": "RWS_HIGH_SUBJECT_VOLUME",
    "siteCount": 5,
    "subjectCount": 80,
    "visitCountPerSubject": 4,
    "formDataPointsPerVisit": 5,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 314159,
    "truncateOdm": false
  }
}
JSON
```

Freeze time:

```bash
curl -X PUT http://localhost:3000/harness/time \
  -H "Content-Type: application/json" \
  -d '{"simStudyDay":1.25,"freeze":true}'
```

Capture payloads:

```bash
curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_HIGH_SUBJECT_VOLUME/Subjects?include=inactive&status=all" \
  -o golden-payloads/high-subject-volume/subjects/all-status.xml

curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_HIGH_SUBJECT_VOLUME/datasets/regular" \
  -o golden-payloads/high-subject-volume/datasets/regular-snapshot.xml
```

## High Visit Volume (`golden-scenarios/high-visit-volume/config.json`)

Apply harness:

```bash
curl -u test-user:test-pass \
  -X PUT http://localhost:3000/harness/config \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "applyMode": "applyAndReset",
  "config": {
    "studyName": "RWS_HIGH_VISIT_VOLUME",
    "siteCount": 4,
    "subjectCount": 24,
    "visitCountPerSubject": 12,
    "formDataPointsPerVisit": 5,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 987654,
    "truncateOdm": false
  }
}
JSON
```

Freeze time:

```bash
curl -X PUT http://localhost:3000/harness/time \
  -H "Content-Type: application/json" \
  -d '{"simStudyDay":9.5,"freeze":true}'
```

Capture payload:

```bash
curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_HIGH_VISIT_VOLUME/datasets/regular" \
  -o golden-payloads/high-visit-volume/datasets/high-visit-snapshot.xml
```

## High Form Data (`golden-scenarios/high-form-data/config.json`)

Apply harness:

```bash
curl -u test-user:test-pass \
  -X PUT http://localhost:3000/harness/config \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "applyMode": "applyAndReset",
  "config": {
    "studyName": "RWS_HIGH_FORM_DATA",
    "siteCount": 3,
    "subjectCount": 20,
    "visitCountPerSubject": 4,
    "formDataPointsPerVisit": 18,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 246810,
    "truncateOdm": false
  }
}
JSON
```

Freeze time:

```bash
curl -X PUT http://localhost:3000/harness/time \
  -H "Content-Type: application/json" \
  -d '{"simStudyDay":2.75,"freeze":true}'
```

Capture payload:

```bash
curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/RWS_HIGH_FORM_DATA/datasets/regular" \
  -o golden-payloads/high-form-data/datasets/high-form-snapshot.xml
```

## Streaming Failure Clinical View (`golden-scenarios/streaming-failure/config.json`)

Apply harness:

```bash
curl -u test-user:test-pass \
  -X PUT http://localhost:3000/harness/config \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "applyMode": "applyAndReset",
  "config": {
    "studyName": "Default Study",
    "siteCount": 2,
    "subjectCount": 10,
    "visitCountPerSubject": 3,
    "formDataPointsPerVisit": 5,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 123456,
    "truncateOdm": false,
    "forceClinicalViewStreamFailure": true
  }
}
JSON
```

Freeze time:

```bash
curl -X PUT http://localhost:3000/harness/time \
  -H "Content-Type: application/json" \
  -d '{"simStudyDay":2.5,"freeze":true}'
```

Capture truncated payload:

```bash
curl -u test-user:test-pass \
  "http://localhost:3000/RaveWebServices/studies/Default%20Study/datasets/regular" \
  -o golden-payloads/streaming-failure/clinical-view/streaming-failure.xml

tail -n 20 golden-payloads/streaming-failure/clinical-view/streaming-failure.xml
# Confirm the closing </ODM> tag is intentionally missing
```

## Tips

- Use `curl -v` to troubleshoot authorization or network issues.
- Swap `-o <path>` for `| xmllint --format -` if you only need to inspect the response without saving it.
- After replaying scenarios, call `curl -u test-user:test-pass -X POST http://localhost:3000/harness/reset` to clear simulator state.
