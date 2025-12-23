Add intentional ODM truncation support for test harness use.

Behavior:
- When enabled (config flag or query param), ODM responses:
  - return HTTP 200
  - are missing closing </ODM>

Testing:
- Functional test confirms 200 + invalid XML body.
