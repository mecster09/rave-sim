# Configuration Guide

## Overview

The Rave Web Services Mock API uses YAML-based configuration files to manage all mock data, test scenarios, and runtime settings. This makes it easy to customize behavior without changing code.

## Configuration Files

### `config/test.yaml`
Contains all configuration and mock data used during testing:
- Test credentials
- Test study definitions
- ODM metadata structures
- CSV dataset headers
- Error codes and messages
- Test scenarios

### `config/production.yaml`
Contains runtime configuration for development/production:
- Server settings
- Authentication modes
- Default metadata structures
- CSV dataset definitions
- Response templates
- Feature flags

## File Structure

```yaml
# Server Configuration
server:
  port: 3000
  host: "0.0.0.0"
  bodyLimit: 10485760

# RWS Version
rws:
  version: "1.8.0"

# Authentication
auth:
  test_credentials:
    - username: "test"
      password: "test123"
  mauth:
    enabled: true

# ODM Configuration
odm:
  namespace:
    odm: "http://www.cdisc.org/ns/odm/v1.3"
    mdsol: "http://www.mdsol.com/ns/odm/metadata"
  version: "1.3"
  default_file_type: "Snapshot"
  
  # Study definitions
  test_studies:
    - study_oid: "STUDY001"
      study_name: "Mock Study 001"
      protocol_name: "MOCK-001"
  
  # Study events, forms, items
  study_events: [...]
  forms: [...]
  items: [...]

# CSV Dataset Headers
csv_datasets:
  Users:
    - "UserOID"
    - "Username"
    - "Email"

# Response Configuration
responses:
  success:
    reference_number_default: "0000"
  error_codes:
    RWS00001:
      message: "studyoid parameter is required"
      http_status: 400
```

## Usage

### Loading Configuration

The configuration is automatically loaded based on `NODE_ENV`:

```typescript
import { loadConfig, getConfig } from './config';

// Load specific environment
const testConfig = loadConfig('test');
const prodConfig = loadConfig('production');

// Auto-detect from NODE_ENV
const config = getConfig();
```

### In Tests

Tests automatically use `config/test.yaml`:

```bash
NODE_ENV=test npm test
```

### In Production

Production/development uses `config/production.yaml`:

```bash
NODE_ENV=production npm start
# or
npm run dev
```

## Configuration Sections

### Server Configuration

```yaml
server:
  port: 3000              # HTTP port
  host: "0.0.0.0"        # Bind address
  bodyLimit: 10485760    # Max request body size (bytes)
```

**Environment variables override:**
- `PORT` - Override server port
- `HOST` - Override bind address

### Authentication

```yaml
auth:
  # Test credentials (test.yaml only)
  test_credentials:
    - username: "test"
      password: "test123"
  
  # Basic Auth settings (production.yaml)
  basic_auth:
    enabled: true
    allow_any_credentials: true  # For mock purposes
  
  # MAuth settings
  mauth:
    enabled: true
    stub_mode: true              # Don't verify signatures
    test_signature: "mock-sig"   # Test value
```

### ODM Configuration

#### Study Definitions

```yaml
odm:
  test_studies:
    - study_oid: "STUDY001"
      study_name: "Mock Study 001"
      study_description: "Mock study metadata"
      protocol_name: "MOCK-001"
```

#### Study Events

```yaml
study_events:
  - oid: "SCREENING"
    name: "Screening"
    type: "Scheduled"
    repeating: false
    order: 1
```

#### Forms

```yaml
forms:
  - oid: "DM"
    name: "Demographics"
    repeating: false
    item_group: "DM_IG"
```

#### Item Definitions

```yaml
items:
  - oid: "SUBJID"
    name: "Subject ID"
    data_type: "text"
    question: "Subject ID"
    mandatory: true
```

### CSV Datasets

Define CSV headers for each dataset:

```yaml
csv_datasets:
  Users:
    - "UserOID"
    - "Username"
    - "FirstName"
    - "LastName"
    - "Email"
  
  Sites:
    - "StudyOID"
    - "SiteNumber"
    - "SiteName"
```

**Usage:**
- Automatically generates CSV headers
- Returns header-only responses (no data rows)
- Configurable per dataset type

### Response Templates

```yaml
responses:
  success:
    reference_number_default: "0000"
    inbound_file_oid: "mockFile"
    is_transaction_successful: "1"
  
  error:
    reference_number: "error"
    is_transaction_successful: "0"
  
  error_codes:
    RWS00001:
      message: "studyoid parameter is required"
      http_status: 400
    
    RWS00003:
      message: "Invalid ODM XML"
      http_status: 400
```

## Customizing Configuration

### Adding Test Studies

Edit `config/test.yaml`:

```yaml
odm:
  test_studies:
    - study_oid: "NEWSTUDY"
      study_name: "My New Study"
      study_description: "Custom test study"
      protocol_name: "PROTO-001"
```

### Adding CSV Datasets

```yaml
csv_datasets:
  MyCustomDataset:
    - "Column1"
    - "Column2"
    - "Column3"
```

The dataset will be available at:
```
GET /RaveWebServices/datasets/MyCustomDataset.csv
```

### Adding Error Codes

```yaml
responses:
  error_codes:
    RWS00099:
      message: "Custom error message"
      http_status: 422
```

### Customizing Study Metadata

Edit the ODM configuration sections:

```yaml
odm:
  study_events:
    - oid: "MY_EVENT"
      name: "My Custom Event"
      type: "Scheduled"
      repeating: true
      order: 5
  
  forms:
    - oid: "MY_FORM"
      name: "My Custom Form"
      repeating: false
      item_group: "MY_GROUP"
  
  item_groups:
    - oid: "MY_GROUP"
      name: "My Group"
      repeating: false
      items:
        - "ITEM1"
        - "ITEM2"
  
  items:
    - oid: "ITEM1"
      name: "My Item"
      data_type: "text"
      question: "Enter value"
      mandatory: true
```

## Best Practices

### For Tests

1. **Use test.yaml** for all test-specific data
2. **Don't hardcode** mock data in test files
3. **Reference config** instead of literals:
   ```typescript
   const config = loadConfig('test');
   const studyOID = config.odm.test_studies[0].study_oid;
   ```

### For Production

1. **Use production.yaml** for runtime defaults
2. **Override with environment variables** when needed
3. **Keep secrets separate** (don't store real credentials)

### General

1. **Document changes** when adding new configuration
2. **Validate YAML** syntax before committing
3. **Keep both files in sync** for shared settings
4. **Version control** both configuration files

## Environment Variables

Override configuration with environment variables:

```bash
# Server
export PORT=4000
export HOST=127.0.0.1

# Environment
export NODE_ENV=production

# Start server
npm start
```

## Configuration API

### TypeScript Interface

```typescript
interface Config {
  server: {
    port: number;
    host: string;
    bodyLimit: number;
  };
  rws: {
    version: string;
  };
  odm: {
    namespace: { odm: string; mdsol: string };
    version: string;
    default_file_type: string;
    test_studies?: Array<Study>;
    study_events: Array<StudyEvent>;
    forms: Array<Form>;
    items: Array<Item>;
  };
  csv_datasets: Record<string, string[]>;
  responses: {
    success: { ... };
    error: { ... };
    error_codes: Record<string, ErrorCode>;
  };
}
```

### Loading in Code

```typescript
import { loadConfig } from './config';

// In utilities
export function myFunction() {
  const config = loadConfig(
    process.env.NODE_ENV === 'test' ? 'test' : 'production'
  );
  
  // Use configuration
  const version = config.rws.version;
  const studyName = config.odm.default_study.study_name;
}
```

### Accessing from Routes

```typescript
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';

export default async function myRoute(fastify: FastifyInstance) {
  fastify.get('/my-endpoint', async (request, reply) => {
    const config = loadConfig(
      process.env.NODE_ENV === 'test' ? 'test' : 'production'
    );
    
    // Use config values
    reply.send({ version: config.rws.version });
  });
}
```

## Troubleshooting

### Configuration Not Found

```
Error: Configuration file not found or invalid
```

**Solution:** Ensure `config/test.yaml` and `config/production.yaml` exist

### YAML Syntax Error

```
Error: bad indentation of a mapping entry
```

**Solution:** Validate YAML syntax at https://www.yamllint.com/

### Config Not Updating

**Solution:** Configuration is cached. Restart the server after changes.

### Wrong Environment

```bash
# Check environment
echo $NODE_ENV

# Set explicitly
NODE_ENV=test npm test
NODE_ENV=production npm start
```

## Migration from Hardcoded Values

### Before (Hardcoded)

```typescript
const studyName = "Mock Study";
const version = "1.8.0";
```

### After (Config-based)

```typescript
import { loadConfig } from './config';

const config = loadConfig('test');
const studyName = config.odm.default_study.study_name;
const version = config.rws.version;
```

## Examples

### Example 1: Custom Test Study

```yaml
# config/test.yaml
odm:
  test_studies:
    - study_oid: "COVID-001"
      study_name: "COVID-19 Vaccine Study"
      study_description: "Phase 3 vaccine trial"
      protocol_name: "VAX-COVID-001"
```

Test:
```typescript
const config = loadConfig('test');
const study = config.odm.test_studies.find(
  s => s.study_oid === 'COVID-001'
);
expect(study.study_name).toBe('COVID-19 Vaccine Study');
```

### Example 2: Custom Error Code

```yaml
# config/production.yaml
responses:
  error_codes:
    RWS00200:
      message: "Subject not found"
      http_status: 404
```

Usage:
```typescript
const config = loadConfig('production');
const errorCode = config.responses.error_codes.RWS00200;
reply.status(errorCode.http_status).send({
  error: errorCode.message
});
```

## Summary

- ✅ All mock data in YAML files
- ✅ Separate test and production configs
- ✅ Type-safe configuration interface
- ✅ Easy customization without code changes
- ✅ Environment-based loading
- ✅ Comprehensive test and study definitions

For more examples, see the test files and configuration files in the project.

