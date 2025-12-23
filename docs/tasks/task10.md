Implement Clinical View snapshot endpoints.

Endpoints:
- /RaveWebServices/studies/:studyOid/datasets/regular
- /RaveWebServices/studies/:studyOid/datasets/regular/:formOid
- /RaveWebServices/studies/:studyOid/subjects/:subjectKey/datasets/regular

Behavior:
- Filter by form and subject.
- Only include currently available data per sim clock.

Testing:
- Functional tests assert time slicing, filtering, and deterministic output.
