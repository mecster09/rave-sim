Implement ClinicalAuditRecords endpoint.

Endpoint:
GET /RaveWebServices/datasets/ClinicalAuditRecords.odm

Behavior:
- Transactional ODM output.
- Pagination via startid/per_page with Link header.
- mode=enhanced|all gated by backfillComplete flag.
- unicode=true preserves non-ASCII.

Testing:
- Functional tests for pagination, mode gating, unicode behavior.
