Add deterministic time control endpoints.

Endpoints (Basic Auth):
- GET /harness/time
- PUT /harness/time { simStudyDay, freeze }

Behavior:
- freeze=true pins simCurrentStudyDay.
- freeze=false resumes wall clock progression.

Testing:
- Functional test sets simStudyDay=2.5 freeze=true and verifies it remains constant.
- Negative tests for invalid input and missing auth.
