# Feralis Manufacturing Platform
# Comprehensive Data Dictionary

## Document Version: 1.0.0
## Created: January 2026
## Database: PostgreSQL 16 with TimescaleDB Extension

---

# TABLE OF CONTENTS

1. [Overview](#overview)
2. [Naming Conventions](#naming-conventions)
3. [Common Field Patterns](#common-field-patterns)
4. [Enumeration Types](#enumeration-types)
5. [Core System Tables](#core-system-tables)
6. [Customer Tables](#customer-tables)
7. [Part Tables](#part-tables)
8. [Order Tables](#order-tables)
9. [Quote Tables](#quote-tables)
10. [Production Tables](#production-tables)
11. [Machine Tables](#machine-tables)
12. [Telemetry Tables](#telemetry-tables)
13. [Inventory Tables](#inventory-tables)
14. [Tooling Tables](#tooling-tables)
15. [Quality Tables](#quality-tables)
16. [Finishing Tables](#finishing-tables)
17. [Packaging Tables](#packaging-tables)
18. [Shipping Tables](#shipping-tables)
19. [Analytics Tables](#analytics-tables)

---

# OVERVIEW

## Database Architecture

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary Database | PostgreSQL 16 | Transactional data |
| Time-Series | TimescaleDB | Machine telemetry |
| Full-Text Search | PostgreSQL tsvector + Elasticsearch | Search functionality |
| Caching | Redis 7 | Session, real-time status, query cache |
| File Storage | MinIO (S3-compatible) | Documents, CAD files, images |

## Schema Organization

| Schema | Purpose | Table Count |
|--------|---------|-------------|
| `public` | Core system tables | 12 |
| `customers` | Customer and contact data | 6 |
| `parts` | Part master and engineering | 8 |
| `orders` | Sales order management | 10 |
| `quotes` | Quotation and estimating | 12 |
| `production` | Work orders and execution | 10 |
| `machines` | Equipment management | 6 |
| `telemetry` | Time-series machine data | 5 |
| `inventory` | Materials and stock | 12 |
| `tooling` | Tool crib management | 6 |
| `quality` | Inspection and NCR | 10 |
| `finishing` | Surface treatment | 8 |
| `packaging` | Pack and ship prep | 6 |
| `shipping` | Logistics and delivery | 10 |
| `analytics` | Reporting and BI | 6 |
| `audit` | Audit trail | 2 |

---

# NAMING CONVENTIONS

## Table Names
- Singular form: `order` not `orders`
- Snake_case: `order_line`, `work_order`
- Descriptive prefixes: `order`, `order_line`, `order_document`

## Column Names
- Snake_case: `created_at`, `customer_id`
- Foreign keys: `{table}_id` (e.g., `customer_id`)
- Boolean: `is_` or `has_` prefix (e.g., `is_active`)
- Timestamps: `_at` suffix (e.g., `created_at`)
- Dates: `_date` suffix (e.g., `due_date`)

## Primary Keys
- All tables use UUID primary keys named `id`
- Generated using UUID v4

---

# COMMON FIELD PATTERNS

## Audit Fields (All Tables)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `created_by` | UUID | YES | | User who created record |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |
| `updated_by` | UUID | YES | | User who last updated |
| `deleted_at` | TIMESTAMPTZ | YES | | Soft delete timestamp |
| `deleted_by` | UUID | YES | | User who deleted |

## Multi-Tenant Fields

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `organization_id` | UUID | NO | Owning organization (required) |
| `facility_id` | UUID | YES | Specific facility (if applicable) |

---

# ENUMERATION TYPES

## Priority Levels
```sql
CREATE TYPE priority_level AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');
```

## Order Status
```sql
CREATE TYPE order_status AS ENUM (
  'DRAFT', 'CONFIRMED', 'QUEUED', 'IN_PRODUCTION', 
  'FINISHING', 'PACKAGING', 'READY_TO_SHIP', 
  'SHIPPED', 'COMPLETED', 'CANCELLED', 'ON_HOLD'
);
```

## Quote Status
```sql
CREATE TYPE quote_status AS ENUM (
  'DRAFT', 'ANALYZING', 'PENDING_APPROVAL', 'APPROVED',
  'SENT', 'FOLLOW_UP', 'REVISION_REQUESTED', 'ACCEPTED',
  'DECLINED', 'EXPIRED', 'CONVERTED'
);
```

## Work Order Status
```sql
CREATE TYPE work_order_status AS ENUM (
  'CREATED', 'RELEASED', 'IN_PROGRESS', 
  'ON_HOLD', 'COMPLETE', 'CLOSED', 'CANCELLED'
);
```

## Operation Status
```sql
CREATE TYPE operation_status AS ENUM (
  'PENDING', 'QUEUED', 'SCHEDULED', 'IN_SETUP',
  'RUNNING', 'COMPLETE', 'ON_HOLD', 'CANCELLED'
);
```

## Machine Status
```sql
CREATE TYPE machine_status AS ENUM (
  'RUNNING', 'IDLE', 'SETUP', 'MAINTENANCE', 'ALARM', 'OFFLINE'
);
```

## Inspection Result
```sql
CREATE TYPE inspection_result AS ENUM (
  'PENDING', 'PASS', 'FAIL', 'CONDITIONAL', 'WAIVED'
);
```

## Disposition Type
```sql
CREATE TYPE disposition_type AS ENUM (
  'USE_AS_IS', 'REWORK', 'REPAIR', 'SCRAP', 
  'RETURN_TO_SUPPLIER', 'SORT', 'CUSTOMER_REVIEW'
);
```

## Shipment Status
```sql
CREATE TYPE shipment_status AS ENUM (
  'PENDING', 'PACKED', 'PICKED_UP', 'IN_TRANSIT',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED'
);
```

---

# CORE SYSTEM TABLES

## organization

**Purpose**: Multi-tenant root entity

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `name` | VARCHAR(255) | NO | | Organization name |
| `legal_name` | VARCHAR(255) | YES | | Legal entity name |
| `code` | VARCHAR(20) | NO | | Short code (unique) |
| `tax_id` | VARCHAR(50) | YES | | Tax identification |
| `website` | VARCHAR(255) | YES | | Website URL |
| `logo_url` | VARCHAR(500) | YES | | Logo URL |
| `primary_email` | VARCHAR(255) | NO | | Primary email |
| `primary_phone` | VARCHAR(50) | YES | | Primary phone |
| `address_line1` | VARCHAR(255) | YES | | Street address |
| `city` | VARCHAR(100) | YES | | City |
| `state` | VARCHAR(100) | YES | | State/Province |
| `postal_code` | VARCHAR(20) | YES | | Postal code |
| `country` | VARCHAR(3) | YES | 'USA' | ISO country code |
| `timezone` | VARCHAR(50) | NO | 'America/New_York' | Default timezone |
| `currency` | VARCHAR(3) | NO | 'USD' | Default currency |
| `settings` | JSONB | YES | '{}' | Additional settings |
| `is_active` | BOOLEAN | NO | TRUE | Active status |

**Indexes**: PRIMARY KEY (`id`), UNIQUE (`code`)

---

## facility

**Purpose**: Physical locations/plants within organization

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `name` | VARCHAR(255) | NO | | Facility name |
| `code` | VARCHAR(20) | NO | | Short code |
| `type` | VARCHAR(50) | YES | 'MANUFACTURING' | Facility type |
| `address_line1` | VARCHAR(255) | YES | | Street address |
| `city` | VARCHAR(100) | YES | | City |
| `state` | VARCHAR(100) | YES | | State/Province |
| `postal_code` | VARCHAR(20) | YES | | Postal code |
| `country` | VARCHAR(3) | YES | 'USA' | ISO country code |
| `timezone` | VARCHAR(50) | YES | | Facility timezone |
| `manager_id` | UUID | YES | | → user.id |
| `is_active` | BOOLEAN | NO | TRUE | Active status |

**Indexes**: PRIMARY KEY (`id`), UNIQUE (`organization_id`, `code`)

---

## user

**Purpose**: System users (employees, admins, customer portal)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `email` | VARCHAR(255) | NO | | Email (login) |
| `password_hash` | VARCHAR(255) | YES | | Bcrypt hash |
| `first_name` | VARCHAR(100) | NO | | First name |
| `last_name` | VARCHAR(100) | NO | | Last name |
| `display_name` | VARCHAR(200) | YES | | Display name |
| `phone` | VARCHAR(50) | YES | | Phone |
| `mobile` | VARCHAR(50) | YES | | Mobile |
| `avatar_url` | VARCHAR(500) | YES | | Profile picture |
| `job_title` | VARCHAR(100) | YES | | Job title |
| `department` | VARCHAR(100) | YES | | Department |
| `employee_id` | VARCHAR(50) | YES | | Employee number |
| `manager_id` | UUID | YES | | → user.id |
| `user_type` | VARCHAR(20) | NO | 'INTERNAL' | INTERNAL/CUSTOMER/API |
| `default_facility_id` | UUID | YES | | → facility.id |
| `timezone` | VARCHAR(50) | YES | | User timezone |
| `locale` | VARCHAR(10) | YES | 'en-US' | Language |
| `mfa_enabled` | BOOLEAN | NO | FALSE | MFA enabled |
| `mfa_secret` | VARCHAR(255) | YES | | TOTP secret |
| `last_login_at` | TIMESTAMPTZ | YES | | Last login |
| `failed_login_count` | INTEGER | NO | 0 | Failed attempts |
| `locked_until` | TIMESTAMPTZ | YES | | Lock expiration |
| `is_active` | BOOLEAN | NO | TRUE | Active status |
| `is_verified` | BOOLEAN | NO | FALSE | Email verified |
| `settings` | JSONB | YES | '{}' | User preferences |

**Indexes**: PRIMARY KEY (`id`), UNIQUE (`organization_id`, `email`)

---

## role

**Purpose**: Named permission collections

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | YES | | → organization.id (NULL=system) |
| `name` | VARCHAR(100) | NO | | Role name |
| `code` | VARCHAR(50) | NO | | Role code |
| `description` | TEXT | YES | | Description |
| `is_system` | BOOLEAN | NO | FALSE | System-defined |
| `is_active` | BOOLEAN | NO | TRUE | Active status |

---

## permission

**Purpose**: Individual permissions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `code` | VARCHAR(100) | NO | | Permission code |
| `name` | VARCHAR(200) | NO | | Display name |
| `description` | TEXT | YES | | Description |
| `module` | VARCHAR(50) | NO | | Module |
| `action` | VARCHAR(50) | NO | | Action type |
| `resource` | VARCHAR(50) | YES | | Resource scope |

**Permission Format**: `{module}.{action}.{scope}`
- Example: `orders.create`, `orders.view.own`, `production.clockin`

---

## role_permission

**Purpose**: Role-permission assignments

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `role_id` | UUID | NO | → role.id |
| `permission_id` | UUID | NO | → permission.id |
| `created_at` | TIMESTAMPTZ | NO | Assignment time |

**Primary Key**: (`role_id`, `permission_id`)

---

## user_role

**Purpose**: User-role assignments

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `user_id` | UUID | NO | → user.id |
| `role_id` | UUID | NO | → role.id |
| `facility_id` | UUID | YES | Scope to facility |
| `granted_at` | TIMESTAMPTZ | NO | Grant time |
| `granted_by` | UUID | YES | → user.id |
| `expires_at` | TIMESTAMPTZ | YES | Expiration |

**Primary Key**: (`user_id`, `role_id`, `facility_id`)

---

## audit_log

**Purpose**: Immutable audit trail

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | YES | | Organization |
| `user_id` | UUID | YES | | Acting user |
| `action` | VARCHAR(100) | NO | | Action performed |
| `entity_type` | VARCHAR(100) | NO | | Entity type |
| `entity_id` | UUID | YES | | Entity ID |
| `entity_name` | VARCHAR(255) | YES | | Entity name |
| `old_values` | JSONB | YES | | Previous values |
| `new_values` | JSONB | YES | | New values |
| `metadata` | JSONB | YES | | Additional context |
| `ip_address` | INET | YES | | Client IP |
| `user_agent` | TEXT | YES | | Client user agent |
| `request_id` | VARCHAR(100) | YES | | Request trace ID |
| `timestamp` | TIMESTAMPTZ | NO | NOW() | Event time |

**Partitioning**: By month on `timestamp`
**Retention**: 7 years

---

## notification

**Purpose**: User notifications

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | Organization |
| `user_id` | UUID | NO | | Target user |
| `type` | VARCHAR(50) | NO | | Notification type |
| `title` | VARCHAR(255) | NO | | Title |
| `message` | TEXT | NO | | Body |
| `severity` | VARCHAR(20) | NO | 'INFO' | INFO/WARNING/ERROR |
| `entity_type` | VARCHAR(50) | YES | | Related entity type |
| `entity_id` | UUID | YES | | Related entity |
| `action_url` | VARCHAR(500) | YES | | Click URL |
| `channels` | TEXT[] | NO | '{IN_APP}' | Delivery channels |
| `is_read` | BOOLEAN | NO | FALSE | Read status |
| `read_at` | TIMESTAMPTZ | YES | | Read time |
| `is_dismissed` | BOOLEAN | NO | FALSE | Dismissed |

---

## file_attachment

**Purpose**: File metadata (files in object storage)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | Organization |
| `entity_type` | VARCHAR(50) | NO | | Parent type |
| `entity_id` | UUID | NO | | Parent ID |
| `file_name` | VARCHAR(255) | NO | | Original filename |
| `file_type` | VARCHAR(50) | NO | | MIME type |
| `file_size` | BIGINT | NO | | Size in bytes |
| `file_extension` | VARCHAR(20) | YES | | Extension |
| `storage_path` | VARCHAR(500) | NO | | Storage path |
| `storage_bucket` | VARCHAR(100) | NO | | Bucket name |
| `document_type` | VARCHAR(50) | YES | | Document classification |
| `description` | TEXT | YES | | Description |
| `revision` | VARCHAR(20) | YES | | Document revision |
| `is_customer_visible` | BOOLEAN | NO | FALSE | Portal visible |
| `checksum` | VARCHAR(64) | YES | | SHA-256 |
| `thumbnail_path` | VARCHAR(500) | YES | | Thumbnail path |
| `uploaded_by` | UUID | NO | | Uploading user |

---

# CUSTOMER TABLES

## customer

**Purpose**: Customer companies

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `code` | VARCHAR(20) | NO | | Customer code |
| `name` | VARCHAR(255) | NO | | Company name |
| `legal_name` | VARCHAR(255) | YES | | Legal name |
| `customer_type` | VARCHAR(50) | NO | 'COMMERCIAL' | Classification |
| `industry` | VARCHAR(100) | YES | | Industry |
| `website` | VARCHAR(255) | YES | | Website |
| `tax_id` | VARCHAR(50) | YES | | Tax ID (encrypted) |
| `duns_number` | VARCHAR(20) | YES | | D-U-N-S |
| `cage_code` | VARCHAR(10) | YES | | CAGE code |
| `primary_contact_id` | UUID | YES | | → customer_contact.id |
| `billing_contact_id` | UUID | YES | | → customer_contact.id |
| `default_ship_to_id` | UUID | YES | | → customer_address.id |
| `default_bill_to_id` | UUID | YES | | → customer_address.id |
| `payment_terms` | VARCHAR(50) | NO | 'NET30' | Payment terms |
| `credit_limit` | DECIMAL(15,2) | YES | | Credit limit |
| `credit_hold` | BOOLEAN | NO | FALSE | On credit hold |
| `pricing_tier` | VARCHAR(50) | YES | | Pricing tier |
| `discount_percent` | DECIMAL(5,2) | YES | 0 | Default discount |
| `tax_exempt` | BOOLEAN | NO | FALSE | Tax exempt |
| `currency` | VARCHAR(3) | NO | 'USD' | Currency |
| `assigned_sales_rep_id` | UUID | YES | | → user.id |
| `portal_enabled` | BOOLEAN | NO | FALSE | Portal access |
| `requires_po` | BOOLEAN | NO | TRUE | Requires PO |
| `certifications_required` | TEXT[] | YES | | Required certs |
| `notes` | TEXT | YES | | Internal notes |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## customer_contact

**Purpose**: Contacts at customer organizations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `customer_id` | UUID | NO | | → customer.id |
| `first_name` | VARCHAR(100) | NO | | First name |
| `last_name` | VARCHAR(100) | NO | | Last name |
| `title` | VARCHAR(100) | YES | | Job title |
| `department` | VARCHAR(100) | YES | | Department |
| `email` | VARCHAR(255) | YES | | Email |
| `phone` | VARCHAR(50) | YES | | Phone |
| `mobile` | VARCHAR(50) | YES | | Mobile |
| `contact_type` | VARCHAR(50)[] | YES | | Types (PURCHASING, etc.) |
| `is_primary` | BOOLEAN | NO | FALSE | Primary contact |
| `portal_user_id` | UUID | YES | | → user.id |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## customer_address

**Purpose**: Ship-to and bill-to addresses

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `customer_id` | UUID | NO | | → customer.id |
| `name` | VARCHAR(255) | NO | | Address name |
| `address_type` | VARCHAR(20)[] | NO | | SHIP_TO/BILL_TO |
| `attention` | VARCHAR(255) | YES | | Attention line |
| `company_name` | VARCHAR(255) | YES | | Company name |
| `address_line1` | VARCHAR(255) | NO | | Street |
| `address_line2` | VARCHAR(255) | YES | | Line 2 |
| `city` | VARCHAR(100) | NO | | City |
| `state` | VARCHAR(100) | NO | | State |
| `postal_code` | VARCHAR(20) | NO | | Postal code |
| `country` | VARCHAR(3) | NO | 'USA' | Country |
| `phone` | VARCHAR(50) | YES | | Phone |
| `special_instructions` | TEXT | YES | | Delivery instructions |
| `is_default_ship` | BOOLEAN | NO | FALSE | Default ship |
| `is_default_bill` | BOOLEAN | NO | FALSE | Default bill |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## customer_requirement

**Purpose**: Customer-specific requirements

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `customer_id` | UUID | NO | | → customer.id |
| `requirement_type` | VARCHAR(50) | NO | | Type |
| `category` | VARCHAR(50) | NO | | DOCUMENTATION/QUALITY/etc. |
| `name` | VARCHAR(255) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `value` | JSONB | YES | | Configuration |
| `is_mandatory` | BOOLEAN | NO | TRUE | Must satisfy |
| `effective_date` | DATE | YES | | Start date |
| `expiration_date` | DATE | YES | | End date |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

# PART TABLES

## part

**Purpose**: Part master record

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `part_number` | VARCHAR(100) | NO | | Part number |
| `description` | VARCHAR(500) | NO | | Description |
| `customer_id` | UUID | YES | | → customer.id |
| `customer_part_number` | VARCHAR(100) | YES | | Customer's P/N |
| `current_revision` | VARCHAR(20) | NO | 'A' | Current rev |
| `part_type` | VARCHAR(50) | NO | 'MANUFACTURED' | Type |
| `process_type` | VARCHAR(50) | YES | | CNC/SHEET_METAL/etc. |
| `material_spec` | VARCHAR(100) | YES | | Default material |
| `weight` | DECIMAL(12,4) | YES | | Weight |
| `weight_unit` | VARCHAR(10) | YES | 'LB' | Weight unit |
| `unit_of_measure` | VARCHAR(20) | NO | 'EA' | UOM |
| `lead_time_days` | INTEGER | YES | | Lead time |
| `minimum_order_qty` | INTEGER | YES | 1 | Min order qty |
| `price_each` | DECIMAL(15,4) | YES | | Standard price |
| `cost_each` | DECIMAL(15,4) | YES | | Standard cost |
| `is_first_article_required` | BOOLEAN | NO | TRUE | FAI required |
| `last_order_date` | DATE | YES | | Last ordered |
| `total_quantity_ordered` | INTEGER | NO | 0 | Lifetime qty |
| `scrap_rate_percent` | DECIMAL(5,2) | YES | | Scrap rate |
| `notes` | TEXT | YES | | Notes |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## part_revision

**Purpose**: Version-controlled revisions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `part_id` | UUID | NO | | → part.id |
| `revision` | VARCHAR(20) | NO | | Revision ID |
| `description` | TEXT | YES | | Change description |
| `effective_date` | DATE | YES | | Effective date |
| `obsolete_date` | DATE | YES | | Obsolete date |
| `drawing_number` | VARCHAR(100) | YES | | Drawing number |
| `drawing_revision` | VARCHAR(20) | YES | | Drawing rev |
| `model_file_id` | UUID | YES | | → file_attachment.id |
| `drawing_file_id` | UUID | YES | | → file_attachment.id |
| `geometry_analysis_id` | UUID | YES | | CAD analysis ref |
| `change_reason` | VARCHAR(50) | YES | | Reason code |
| `approved_by` | UUID | YES | | → user.id |
| `approved_at` | TIMESTAMPTZ | YES | | Approval time |
| `status` | VARCHAR(20) | NO | 'DRAFT' | Status |
| `is_current` | BOOLEAN | NO | FALSE | Current rev |

---

## part_operation

**Purpose**: Standard routing operations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `part_revision_id` | UUID | NO | | → part_revision.id |
| `sequence` | INTEGER | NO | | Sequence number |
| `operation_number` | INTEGER | NO | | Op number (10,20..) |
| `name` | VARCHAR(200) | NO | | Operation name |
| `description` | TEXT | YES | | Description |
| `work_center_id` | UUID | NO | | → work_center.id |
| `setup_time_minutes` | DECIMAL(10,2) | NO | 0 | Setup time |
| `run_time_minutes` | DECIMAL(10,2) | NO | 0 | Run time/piece |
| `pieces_per_cycle` | INTEGER | NO | 1 | Parts/cycle |
| `is_outside_process` | BOOLEAN | NO | FALSE | Outside |
| `outside_vendor_id` | UUID | YES | | → supplier.id |
| `nc_program_id` | UUID | YES | | NC program ref |
| `inspection_required` | BOOLEAN | NO | FALSE | Inspect after |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## part_material

**Purpose**: Bill of materials

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `part_revision_id` | UUID | NO | | → part_revision.id |
| `material_id` | UUID | NO | | → material.id |
| `quantity` | DECIMAL(15,6) | NO | | Qty per part |
| `unit_of_measure` | VARCHAR(20) | NO | | UOM |
| `scrap_factor` | DECIMAL(5,4) | YES | 1.00 | Scrap allowance |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

# ORDER TABLES

## order

**Purpose**: Sales order header

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | YES | | → facility.id |
| `order_number` | VARCHAR(50) | NO | | Order number |
| `customer_id` | UUID | NO | | → customer.id |
| `customer_po` | VARCHAR(100) | YES | | Customer PO |
| `customer_po_date` | DATE | YES | | PO date |
| `quote_id` | UUID | YES | | → quote.id |
| `status` | order_status | NO | 'DRAFT' | Status |
| `priority` | priority_level | NO | 'NORMAL' | Priority |
| `order_date` | DATE | NO | CURRENT_DATE | Order date |
| `due_date` | DATE | NO | | Due date |
| `promised_date` | DATE | YES | | Promised date |
| `ship_date` | DATE | YES | | Actual ship date |
| `ship_to_address_id` | UUID | YES | | → customer_address.id |
| `bill_to_address_id` | UUID | YES | | → customer_address.id |
| `contact_id` | UUID | YES | | → customer_contact.id |
| `sales_rep_id` | UUID | YES | | → user.id |
| `payment_terms` | VARCHAR(50) | YES | | Payment terms |
| `shipping_method` | VARCHAR(100) | YES | | Ship method |
| `currency` | VARCHAR(3) | NO | 'USD' | Currency |
| `subtotal` | DECIMAL(15,2) | NO | 0 | Subtotal |
| `discount_amount` | DECIMAL(15,2) | NO | 0 | Discount |
| `tax_amount` | DECIMAL(15,2) | NO | 0 | Tax |
| `shipping_amount` | DECIMAL(15,2) | NO | 0 | Shipping |
| `total` | DECIMAL(15,2) | NO | 0 | Total |
| `estimated_cost` | DECIMAL(15,2) | YES | | Est. cost |
| `actual_cost` | DECIMAL(15,2) | YES | | Actual cost |
| `line_count` | INTEGER | NO | 0 | Line items |
| `has_hold` | BOOLEAN | NO | FALSE | Has hold |
| `notes` | TEXT | YES | | External notes |
| `internal_notes` | TEXT | YES | | Internal notes |
| `confirmed_at` | TIMESTAMPTZ | YES | | Confirmed |
| `shipped_at` | TIMESTAMPTZ | YES | | Shipped |
| `completed_at` | TIMESTAMPTZ | YES | | Completed |
| `cancelled_at` | TIMESTAMPTZ | YES | | Cancelled |
| `cancellation_reason` | TEXT | YES | | Cancel reason |

---

## order_line

**Purpose**: Order line items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `order_id` | UUID | NO | | → order.id |
| `line_number` | INTEGER | NO | | Line number |
| `part_id` | UUID | NO | | → part.id |
| `part_revision_id` | UUID | YES | | → part_revision.id |
| `quote_line_id` | UUID | YES | | → quote_line.id |
| `customer_part_number` | VARCHAR(100) | YES | | Customer P/N |
| `description` | VARCHAR(500) | YES | | Description |
| `status` | order_line_status | NO | 'PENDING' | Status |
| `quantity_ordered` | INTEGER | NO | | Qty ordered |
| `quantity_shipped` | INTEGER | NO | 0 | Qty shipped |
| `quantity_cancelled` | INTEGER | NO | 0 | Qty cancelled |
| `unit_of_measure` | VARCHAR(20) | NO | 'EA' | UOM |
| `unit_price` | DECIMAL(15,4) | NO | | Unit price |
| `discount_percent` | DECIMAL(5,2) | YES | 0 | Discount % |
| `line_total` | DECIMAL(15,2) | NO | | Line total |
| `requested_date` | DATE | YES | | Requested date |
| `promised_date` | DATE | YES | | Promised date |
| `work_order_id` | UUID | YES | | → work_order.id |
| `progress_percent` | INTEGER | NO | 0 | Progress % |
| `notes` | TEXT | YES | | Notes |

---

## order_milestone

**Purpose**: Order lifecycle milestones

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `order_id` | UUID | NO | | → order.id |
| `milestone_type` | VARCHAR(50) | NO | | Milestone type |
| `sequence` | INTEGER | NO | | Display sequence |
| `name` | VARCHAR(100) | NO | | Name |
| `planned_date` | DATE | YES | | Planned date |
| `actual_date` | DATE | YES | | Actual date |
| `status` | VARCHAR(20) | NO | 'PENDING' | Status |
| `completed_by` | UUID | YES | | → user.id |
| `notes` | TEXT | YES | | Notes |

---

## order_hold

**Purpose**: Order holds

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `order_id` | UUID | NO | | → order.id |
| `hold_type` | VARCHAR(50) | NO | | Hold type |
| `reason` | TEXT | NO | | Reason |
| `status` | VARCHAR(20) | NO | 'ACTIVE' | ACTIVE/RELEASED |
| `placed_by` | UUID | NO | | → user.id |
| `placed_at` | TIMESTAMPTZ | NO | NOW() | Placed time |
| `released_by` | UUID | YES | | → user.id |
| `released_at` | TIMESTAMPTZ | YES | | Released time |
| `resolution` | TEXT | YES | | Resolution |
| `disposition` | disposition_type | YES | | Disposition |

---

## order_change

**Purpose**: Change order tracking

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `order_id` | UUID | NO | | → order.id |
| `change_number` | VARCHAR(50) | NO | | Change order # |
| `change_type` | VARCHAR(50) | NO | | QUANTITY/SPEC/etc. |
| `status` | VARCHAR(20) | NO | 'PENDING' | Status |
| `description` | TEXT | NO | | Description |
| `requested_by` | UUID | NO | | → user.id |
| `requested_at` | TIMESTAMPTZ | NO | NOW() | Request time |
| `approved_by` | UUID | YES | | → user.id |
| `approved_at` | TIMESTAMPTZ | YES | | Approval time |
| `cost_impact` | DECIMAL(15,2) | YES | | Cost delta |
| `schedule_impact_days` | INTEGER | YES | | Schedule delta |

---

# QUOTE TABLES

## quote

**Purpose**: Quote header

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `quote_number` | VARCHAR(50) | NO | | Quote number |
| `customer_id` | UUID | NO | | → customer.id |
| `contact_id` | UUID | YES | | → customer_contact.id |
| `rfq_reference` | VARCHAR(100) | YES | | Customer RFQ |
| `status` | quote_status | NO | 'DRAFT' | Status |
| `version` | INTEGER | NO | 1 | Version number |
| `quote_date` | DATE | NO | CURRENT_DATE | Quote date |
| `valid_until` | DATE | NO | | Expiration date |
| `currency` | VARCHAR(3) | NO | 'USD' | Currency |
| `total_value` | DECIMAL(15,2) | YES | | Total value |
| `assigned_to` | UUID | YES | | → user.id |
| `win_probability` | INTEGER | YES | | Win % estimate |
| `notes` | TEXT | YES | | External notes |
| `internal_notes` | TEXT | YES | | Internal notes |
| `sent_at` | TIMESTAMPTZ | YES | | Sent time |
| `accepted_at` | TIMESTAMPTZ | YES | | Accepted time |
| `converted_order_id` | UUID | YES | | → order.id |

---

## quote_line

**Purpose**: Quote line items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `quote_id` | UUID | NO | | → quote.id |
| `line_number` | INTEGER | NO | | Line number |
| `part_id` | UUID | YES | | → part.id (if exists) |
| `part_name` | VARCHAR(200) | NO | | Part name |
| `part_number` | VARCHAR(100) | YES | | Part number |
| `description` | TEXT | YES | | Description |
| `material` | VARCHAR(100) | YES | | Material spec |
| `process_type` | VARCHAR(50) | YES | | Process type |
| `quantity` | INTEGER | NO | | Quantity |
| `unit_price` | DECIMAL(15,4) | NO | | Unit price |
| `line_total` | DECIMAL(15,2) | NO | | Line total |
| `lead_time_days` | INTEGER | YES | | Lead time |
| `geometry_analysis_id` | UUID | YES | | CAD analysis |
| `toolpath_id` | UUID | YES | | Toolpath data |
| `nesting_id` | UUID | YES | | Nesting data |
| `simulation_id` | UUID | YES | | Simulation data |

---

## quote_geometry_analysis

**Purpose**: CAD geometry analysis results

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `quote_line_id` | UUID | NO | | → quote_line.id |
| `cad_file_id` | UUID | NO | | → file_attachment.id |
| `process_type` | VARCHAR(50) | NO | | CNC/SHEET_METAL |
| `status` | VARCHAR(20) | NO | 'PENDING' | Analysis status |
| `bounding_box` | JSONB | YES | | Dimensions |
| `volume` | DECIMAL(15,6) | YES | | Volume |
| `surface_area` | DECIMAL(15,6) | YES | | Surface area |
| `weight_estimate` | JSONB | YES | | Weight by material |
| `features` | JSONB | YES | | Extracted features |
| `tolerances` | JSONB | YES | | Tolerance info |
| `manufacturability_score` | INTEGER | YES | | 0-100 score |
| `manufacturability_issues` | JSONB | YES | | DFM issues |
| `stock_recommendation` | JSONB | YES | | Stock size |
| `processed_at` | TIMESTAMPTZ | YES | | Processing time |
| `processing_time_ms` | INTEGER | YES | | Processing duration |

---

## quote_toolpath

**Purpose**: Generated toolpath data

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `quote_line_id` | UUID | NO | | → quote_line.id |
| `geometry_analysis_id` | UUID | NO | | → quote_geometry_analysis.id |
| `status` | VARCHAR(20) | NO | 'PENDING' | Generation status |
| `machine_type` | VARCHAR(50) | NO | | Target machine type |
| `material` | VARCHAR(100) | NO | | Material spec |
| `operations` | JSONB | YES | | Operation list |
| `tool_list` | JSONB | YES | | Tools required |
| `total_cycle_time` | DECIMAL(10,2) | YES | | Cycle time mins |
| `total_setup_time` | DECIMAL(10,2) | YES | | Setup time mins |
| `nc_program_size` | INTEGER | YES | | Program size bytes |
| `nc_program_url` | VARCHAR(500) | YES | | Program storage |
| `processed_at` | TIMESTAMPTZ | YES | | Processing time |

---

## quote_nesting

**Purpose**: Sheet metal nesting results

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `quote_line_id` | UUID | NO | | → quote_line.id |
| `geometry_analysis_id` | UUID | NO | | → quote_geometry_analysis.id |
| `status` | VARCHAR(20) | NO | 'PENDING' | Nesting status |
| `material` | VARCHAR(100) | NO | | Material |
| `thickness` | DECIMAL(10,4) | NO | | Thickness |
| `quantity` | INTEGER | NO | | Parts to nest |
| `sheets_required` | INTEGER | YES | | Sheets needed |
| `sheet_size` | JSONB | YES | | Sheet dimensions |
| `utilization_percent` | DECIMAL(5,2) | YES | | Material utilization |
| `total_cut_length` | DECIMAL(15,4) | YES | | Cut length |
| `total_cut_time` | DECIMAL(10,2) | YES | | Cut time mins |
| `sheet_layouts` | JSONB | YES | | Layout data |
| `processed_at` | TIMESTAMPTZ | YES | | Processing time |

---

## quote_simulation

**Purpose**: 3D process simulation data

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `quote_line_id` | UUID | NO | | → quote_line.id |
| `simulation_type` | VARCHAR(50) | NO | | CNC/LASER/PRESS_BRAKE |
| `status` | VARCHAR(20) | NO | 'PENDING' | Status |
| `duration_seconds` | DECIMAL(10,2) | YES | | Animation duration |
| `frame_count` | INTEGER | YES | | Total frames |
| `webgl_scene_url` | VARCHAR(500) | YES | | Scene data URL |
| `video_url` | VARCHAR(500) | YES | | MP4 URL |
| `thumbnail_url` | VARCHAR(500) | YES | | Thumbnail URL |
| `chapters` | JSONB | YES | | Animation chapters |
| `processed_at` | TIMESTAMPTZ | YES | | Processing time |

---

## quote_cost_breakdown

**Purpose**: Detailed cost breakdown

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `quote_line_id` | UUID | NO | | → quote_line.id |
| `quantity` | INTEGER | NO | | For quantity |
| `material_cost` | DECIMAL(15,2) | NO | 0 | Material |
| `machining_cost` | DECIMAL(15,2) | NO | 0 | Machining |
| `setup_cost` | DECIMAL(15,2) | NO | 0 | Setup |
| `tooling_cost` | DECIMAL(15,2) | NO | 0 | Tooling |
| `finishing_cost` | DECIMAL(15,2) | NO | 0 | Finishing |
| `secondary_cost` | DECIMAL(15,2) | NO | 0 | Secondary ops |
| `packaging_cost` | DECIMAL(15,2) | NO | 0 | Packaging |
| `overhead_cost` | DECIMAL(15,2) | NO | 0 | Overhead |
| `total_cost` | DECIMAL(15,2) | NO | 0 | Total cost |
| `margin_percent` | DECIMAL(5,2) | NO | 0 | Margin % |
| `unit_price` | DECIMAL(15,4) | NO | 0 | Price per unit |
| `total_price` | DECIMAL(15,2) | NO | 0 | Total price |

---

# PRODUCTION TABLES

## work_center

**Purpose**: Production work center groupings

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | NO | | → facility.id |
| `code` | VARCHAR(50) | NO | | Work center code |
| `name` | VARCHAR(200) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `hourly_rate` | DECIMAL(10,2) | YES | | Cost per hour |
| `setup_rate` | DECIMAL(10,2) | YES | | Setup rate |
| `capacity_hours_day` | DECIMAL(5,2) | YES | | Daily capacity |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## work_order

**Purpose**: Production work orders

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | NO | | → facility.id |
| `work_order_number` | VARCHAR(50) | NO | | WO number |
| `order_line_id` | UUID | YES | | → order_line.id |
| `part_id` | UUID | NO | | → part.id |
| `part_revision_id` | UUID | NO | | → part_revision.id |
| `status` | work_order_status | NO | 'CREATED' | Status |
| `priority` | priority_level | NO | 'NORMAL' | Priority |
| `quantity_ordered` | INTEGER | NO | | Qty to produce |
| `quantity_complete` | INTEGER | NO | 0 | Qty complete |
| `quantity_scrapped` | INTEGER | NO | 0 | Qty scrapped |
| `due_date` | DATE | NO | | Due date |
| `scheduled_start` | DATE | YES | | Scheduled start |
| `scheduled_complete` | DATE | YES | | Scheduled complete |
| `actual_start` | TIMESTAMPTZ | YES | | Actual start |
| `actual_complete` | TIMESTAMPTZ | YES | | Actual complete |
| `estimated_hours` | DECIMAL(10,2) | YES | | Est. hours |
| `actual_hours` | DECIMAL(10,2) | YES | | Actual hours |
| `operation_count` | INTEGER | NO | 0 | Num operations |
| `current_operation` | INTEGER | YES | | Current op # |
| `notes` | TEXT | YES | | Notes |
| `released_at` | TIMESTAMPTZ | YES | | Release time |
| `closed_at` | TIMESTAMPTZ | YES | | Close time |

---

## work_order_operation

**Purpose**: Work order operations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `work_order_id` | UUID | NO | | → work_order.id |
| `sequence` | INTEGER | NO | | Sequence |
| `operation_number` | INTEGER | NO | | Op number |
| `name` | VARCHAR(200) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `work_center_id` | UUID | NO | | → work_center.id |
| `machine_id` | UUID | YES | | → machine.id |
| `status` | operation_status | NO | 'PENDING' | Status |
| `setup_time_standard` | DECIMAL(10,2) | NO | 0 | Std setup mins |
| `run_time_standard` | DECIMAL(10,2) | NO | 0 | Std run mins/pc |
| `setup_time_actual` | DECIMAL(10,2) | YES | | Actual setup |
| `run_time_actual` | DECIMAL(10,2) | YES | | Actual run |
| `quantity_complete` | INTEGER | NO | 0 | Qty complete |
| `quantity_scrapped` | INTEGER | NO | 0 | Qty scrapped |
| `scheduled_start` | TIMESTAMPTZ | YES | | Scheduled start |
| `scheduled_end` | TIMESTAMPTZ | YES | | Scheduled end |
| `actual_start` | TIMESTAMPTZ | YES | | Actual start |
| `actual_end` | TIMESTAMPTZ | YES | | Actual end |
| `nc_program_id` | UUID | YES | | NC program ref |

---

## labor_entry

**Purpose**: Time tracking on operations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `work_order_id` | UUID | NO | | → work_order.id |
| `operation_id` | UUID | NO | | → work_order_operation.id |
| `machine_id` | UUID | YES | | → machine.id |
| `operator_id` | UUID | NO | | → user.id |
| `activity_type` | VARCHAR(20) | NO | | SETUP/RUN/REWORK |
| `start_time` | TIMESTAMPTZ | NO | | Start time |
| `end_time` | TIMESTAMPTZ | YES | | End time |
| `duration_minutes` | DECIMAL(10,2) | GENERATED | | Duration |
| `quantity_good` | INTEGER | YES | 0 | Good parts |
| `quantity_scrap` | INTEGER | YES | 0 | Scrap parts |
| `scrap_reason_code` | VARCHAR(20) | YES | | Scrap reason |
| `labor_cost` | DECIMAL(12,2) | YES | | Cost |
| `notes` | TEXT | YES | | Notes |

---

## scrap_record

**Purpose**: Scrap tracking

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `work_order_id` | UUID | NO | | → work_order.id |
| `operation_id` | UUID | NO | | → work_order_operation.id |
| `labor_entry_id` | UUID | YES | | → labor_entry.id |
| `quantity` | INTEGER | NO | | Scrap qty |
| `reason_code` | VARCHAR(20) | NO | | Reason code |
| `reason_detail` | TEXT | YES | | Detail |
| `root_cause` | TEXT | YES | | Root cause |
| `material_cost` | DECIMAL(12,2) | YES | | Material cost |
| `labor_cost` | DECIMAL(12,2) | YES | | Labor cost |
| `total_cost` | DECIMAL(12,2) | YES | | Total cost |
| `ncr_id` | UUID | YES | | → nonconformance.id |
| `reported_by` | UUID | NO | | → user.id |
| `reported_at` | TIMESTAMPTZ | NO | NOW() | Report time |

---

## production_schedule

**Purpose**: Scheduled production slots

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | NO | | → facility.id |
| `machine_id` | UUID | NO | | → machine.id |
| `operation_id` | UUID | NO | | → work_order_operation.id |
| `scheduled_start` | TIMESTAMPTZ | NO | | Start time |
| `scheduled_end` | TIMESTAMPTZ | NO | | End time |
| `setup_minutes` | INTEGER | YES | | Setup time |
| `run_minutes` | INTEGER | YES | | Run time |
| `priority` | INTEGER | YES | | Schedule priority |
| `is_locked` | BOOLEAN | NO | FALSE | Locked slot |
| `scheduled_by` | UUID | YES | | → user.id |

---

# MACHINE TABLES

## machine

**Purpose**: Production equipment

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | NO | | → facility.id |
| `work_center_id` | UUID | YES | | → work_center.id |
| `machine_code` | VARCHAR(50) | NO | | Machine code |
| `name` | VARCHAR(200) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `manufacturer` | VARCHAR(100) | YES | | Manufacturer |
| `model` | VARCHAR(100) | YES | | Model |
| `serial_number` | VARCHAR(100) | YES | | Serial # |
| `machine_type` | VARCHAR(50) | NO | | Type |
| `control_type` | VARCHAR(50) | YES | | Controller |
| `purchase_date` | DATE | YES | | Purchase date |
| `status` | machine_status | NO | 'IDLE' | Current status |
| `status_since` | TIMESTAMPTZ | YES | | Status time |
| `current_operator_id` | UUID | YES | | → user.id |
| `current_work_order_id` | UUID | YES | | → work_order.id |
| `hourly_rate` | DECIMAL(10,2) | YES | | Cost/hour |
| `location_x` | DECIMAL(10,2) | YES | | Floor X |
| `location_y` | DECIMAL(10,2) | YES | | Floor Y |
| `telemetry_enabled` | BOOLEAN | NO | FALSE | Telemetry on |
| `telemetry_endpoint` | VARCHAR(255) | YES | | Adapter URL |
| `maintenance_interval_days` | INTEGER | YES | | PM interval |
| `next_maintenance_date` | DATE | YES | | Next PM |
| `specifications` | JSONB | YES | '{}' | Specs |
| `capabilities` | JSONB | YES | '{}' | Capabilities |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## machine_alarm

**Purpose**: Machine alarm history

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `machine_id` | UUID | NO | | → machine.id |
| `alarm_code` | VARCHAR(50) | NO | | Alarm code |
| `alarm_text` | VARCHAR(500) | NO | | Alarm message |
| `severity` | VARCHAR(20) | NO | | FAULT/WARNING/INFO |
| `state` | VARCHAR(20) | NO | | ACTIVE/CLEARED |
| `triggered_at` | TIMESTAMPTZ | NO | | Trigger time |
| `cleared_at` | TIMESTAMPTZ | YES | | Clear time |
| `acknowledged_by` | UUID | YES | | → user.id |
| `acknowledged_at` | TIMESTAMPTZ | YES | | Ack time |
| `notes` | TEXT | YES | | Notes |

---

## machine_maintenance

**Purpose**: Maintenance records

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `machine_id` | UUID | NO | | → machine.id |
| `maintenance_type` | VARCHAR(50) | NO | | PM/REPAIR/etc. |
| `description` | TEXT | NO | | Description |
| `scheduled_date` | DATE | YES | | Scheduled |
| `completed_date` | DATE | YES | | Completed |
| `performed_by` | UUID | YES | | → user.id |
| `duration_minutes` | INTEGER | YES | | Duration |
| `cost` | DECIMAL(12,2) | YES | | Cost |
| `parts_replaced` | JSONB | YES | | Parts list |
| `notes` | TEXT | YES | | Notes |
| `status` | VARCHAR(20) | NO | 'SCHEDULED' | Status |

---

## machine_downtime

**Purpose**: Downtime tracking

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `machine_id` | UUID | NO | | → machine.id |
| `downtime_type` | VARCHAR(50) | NO | | PLANNED/UNPLANNED |
| `reason_code` | VARCHAR(50) | NO | | Reason code |
| `description` | TEXT | YES | | Description |
| `start_time` | TIMESTAMPTZ | NO | | Start |
| `end_time` | TIMESTAMPTZ | YES | | End |
| `duration_minutes` | DECIMAL(10,2) | GENERATED | | Duration |
| `reported_by` | UUID | YES | | → user.id |

---

# TELEMETRY TABLES (TimescaleDB)

## machine_telemetry

**Purpose**: Time-series telemetry (hypertable)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `time` | TIMESTAMPTZ | NO | | Timestamp |
| `machine_id` | UUID | NO | | Machine ref |
| `data_item` | VARCHAR(50) | NO | | Data item ID |
| `value_numeric` | DOUBLE PRECISION | YES | | Numeric value |
| `value_text` | VARCHAR(255) | YES | | Text value |
| `unit` | VARCHAR(20) | YES | | Unit |
| `quality` | VARCHAR(20) | YES | 'GOOD' | Data quality |

**Hypertable**: Chunked by day
**Compression**: After 7 days
**Retention**: 90 days raw

---

## telemetry_aggregate_1h

**Purpose**: Hourly aggregations (continuous aggregate)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `bucket` | TIMESTAMPTZ | NO | Hour bucket |
| `machine_id` | UUID | NO | Machine |
| `data_item` | VARCHAR(50) | NO | Data item |
| `avg_value` | DOUBLE PRECISION | YES | Average |
| `min_value` | DOUBLE PRECISION | YES | Minimum |
| `max_value` | DOUBLE PRECISION | YES | Maximum |
| `count` | BIGINT | YES | Sample count |

---

## telemetry_aggregate_1d

**Purpose**: Daily aggregations

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `bucket` | DATE | NO | Day |
| `machine_id` | UUID | NO | Machine |
| `data_item` | VARCHAR(50) | NO | Data item |
| `avg_value` | DOUBLE PRECISION | YES | Average |
| `min_value` | DOUBLE PRECISION | YES | Minimum |
| `max_value` | DOUBLE PRECISION | YES | Maximum |
| `count` | BIGINT | YES | Sample count |

---

# INVENTORY TABLES

## material

**Purpose**: Material master

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `material_code` | VARCHAR(50) | NO | | Material code |
| `name` | VARCHAR(200) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `material_type` | VARCHAR(50) | NO | | Type |
| `specification` | VARCHAR(100) | YES | | Spec (AMS, ASTM) |
| `form` | VARCHAR(50) | YES | | BAR/PLATE/SHEET |
| `unit_of_measure` | VARCHAR(20) | NO | | UOM |
| `unit_cost` | DECIMAL(15,4) | YES | | Cost per unit |
| `density` | DECIMAL(10,6) | YES | | Density |
| `reorder_point` | DECIMAL(15,4) | YES | | Reorder point |
| `reorder_quantity` | DECIMAL(15,4) | YES | | Reorder qty |
| `lead_time_days` | INTEGER | YES | | Lead time |
| `preferred_supplier_id` | UUID | YES | | → supplier.id |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## material_lot

**Purpose**: Lot/batch tracking

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `material_id` | UUID | NO | | → material.id |
| `lot_number` | VARCHAR(100) | NO | | Lot number |
| `heat_number` | VARCHAR(100) | YES | | Heat number |
| `supplier_id` | UUID | YES | | → supplier.id |
| `supplier_lot` | VARCHAR(100) | YES | | Supplier lot |
| `received_date` | DATE | NO | | Received |
| `expiration_date` | DATE | YES | | Expiration |
| `quantity_received` | DECIMAL(15,4) | NO | | Qty received |
| `quantity_on_hand` | DECIMAL(15,4) | NO | | Current qty |
| `unit_cost` | DECIMAL(15,4) | YES | | Actual cost |
| `certification_id` | UUID | YES | | → file_attachment.id |
| `status` | VARCHAR(20) | NO | 'AVAILABLE' | Status |
| `notes` | TEXT | YES | | Notes |

---

## inventory_location

**Purpose**: Storage locations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | NO | | → facility.id |
| `location_code` | VARCHAR(50) | NO | | Location code |
| `name` | VARCHAR(200) | YES | | Name |
| `zone` | VARCHAR(50) | YES | | Zone |
| `aisle` | VARCHAR(20) | YES | | Aisle |
| `rack` | VARCHAR(20) | YES | | Rack |
| `bin` | VARCHAR(20) | YES | | Bin |
| `location_type` | VARCHAR(50) | YES | | Type |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## inventory_balance

**Purpose**: Current inventory levels

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `material_lot_id` | UUID | NO | | → material_lot.id |
| `location_id` | UUID | NO | | → inventory_location.id |
| `quantity_on_hand` | DECIMAL(15,4) | NO | 0 | On hand |
| `quantity_reserved` | DECIMAL(15,4) | NO | 0 | Reserved |
| `quantity_available` | DECIMAL(15,4) | GENERATED | | Available |
| `last_count_date` | DATE | YES | | Last counted |
| `last_count_quantity` | DECIMAL(15,4) | YES | | Count qty |

---

## inventory_transaction

**Purpose**: Stock movement history

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `transaction_type` | VARCHAR(50) | NO | | RECEIVE/ISSUE/etc. |
| `material_lot_id` | UUID | NO | | → material_lot.id |
| `from_location_id` | UUID | YES | | From location |
| `to_location_id` | UUID | YES | | To location |
| `quantity` | DECIMAL(15,4) | NO | | Quantity |
| `unit_cost` | DECIMAL(15,4) | YES | | Unit cost |
| `reference_type` | VARCHAR(50) | YES | | Ref type |
| `reference_id` | UUID | YES | | Ref ID |
| `work_order_id` | UUID | YES | | → work_order.id |
| `reason_code` | VARCHAR(50) | YES | | Reason |
| `notes` | TEXT | YES | | Notes |
| `transacted_by` | UUID | NO | | → user.id |
| `transacted_at` | TIMESTAMPTZ | NO | NOW() | Time |

---

## inventory_reservation

**Purpose**: Material reservations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `material_lot_id` | UUID | NO | | → material_lot.id |
| `location_id` | UUID | NO | | → inventory_location.id |
| `quantity` | DECIMAL(15,4) | NO | | Reserved qty |
| `reservation_type` | VARCHAR(20) | NO | 'HARD' | HARD/SOFT |
| `order_id` | UUID | YES | | → order.id |
| `work_order_id` | UUID | YES | | → work_order.id |
| `reserved_by` | UUID | NO | | → user.id |
| `reserved_at` | TIMESTAMPTZ | NO | NOW() | Time |
| `expires_at` | TIMESTAMPTZ | YES | | Expiration |
| `status` | VARCHAR(20) | NO | 'ACTIVE' | Status |

---

## supplier

**Purpose**: Material suppliers

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `code` | VARCHAR(20) | NO | | Supplier code |
| `name` | VARCHAR(255) | NO | | Name |
| `contact_name` | VARCHAR(200) | YES | | Contact |
| `email` | VARCHAR(255) | YES | | Email |
| `phone` | VARCHAR(50) | YES | | Phone |
| `address_line1` | VARCHAR(255) | YES | | Address |
| `city` | VARCHAR(100) | YES | | City |
| `state` | VARCHAR(100) | YES | | State |
| `country` | VARCHAR(3) | YES | 'USA' | Country |
| `payment_terms` | VARCHAR(50) | YES | | Terms |
| `lead_time_days` | INTEGER | YES | | Lead time |
| `quality_rating` | DECIMAL(3,2) | YES | | 0-5 rating |
| `delivery_rating` | DECIMAL(3,2) | YES | | 0-5 rating |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## purchase_order

**Purpose**: Material purchase orders

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `po_number` | VARCHAR(50) | NO | | PO number |
| `supplier_id` | UUID | NO | | → supplier.id |
| `status` | VARCHAR(20) | NO | 'DRAFT' | Status |
| `order_date` | DATE | NO | CURRENT_DATE | Order date |
| `expected_date` | DATE | YES | | Expected delivery |
| `ship_to_facility_id` | UUID | YES | | → facility.id |
| `subtotal` | DECIMAL(15,2) | NO | 0 | Subtotal |
| `tax_amount` | DECIMAL(15,2) | NO | 0 | Tax |
| `shipping_amount` | DECIMAL(15,2) | NO | 0 | Shipping |
| `total` | DECIMAL(15,2) | NO | 0 | Total |
| `notes` | TEXT | YES | | Notes |
| `created_by` | UUID | NO | | → user.id |
| `approved_by` | UUID | YES | | → user.id |
| `approved_at` | TIMESTAMPTZ | YES | | Approval time |

---

## purchase_order_line

**Purpose**: PO line items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `purchase_order_id` | UUID | NO | | → purchase_order.id |
| `line_number` | INTEGER | NO | | Line number |
| `material_id` | UUID | NO | | → material.id |
| `description` | VARCHAR(500) | YES | | Description |
| `quantity_ordered` | DECIMAL(15,4) | NO | | Qty ordered |
| `quantity_received` | DECIMAL(15,4) | NO | 0 | Qty received |
| `unit_of_measure` | VARCHAR(20) | NO | | UOM |
| `unit_price` | DECIMAL(15,4) | NO | | Unit price |
| `line_total` | DECIMAL(15,2) | NO | | Line total |
| `expected_date` | DATE | YES | | Expected |
| `work_order_id` | UUID | YES | | Linked WO |

---

# QUALITY TABLES

## inspection_plan

**Purpose**: Inspection plan definitions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `plan_number` | VARCHAR(50) | NO | | Plan number |
| `name` | VARCHAR(200) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `part_id` | UUID | YES | | → part.id |
| `part_revision_id` | UUID | YES | | → part_revision.id |
| `inspection_type` | VARCHAR(50) | NO | | IN_PROCESS/FINAL/etc. |
| `sample_size` | INTEGER | YES | | Sample size |
| `sample_frequency` | VARCHAR(50) | YES | | Frequency |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## inspection_plan_item

**Purpose**: Inspection characteristics

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `inspection_plan_id` | UUID | NO | | → inspection_plan.id |
| `sequence` | INTEGER | NO | | Sequence |
| `characteristic` | VARCHAR(200) | NO | | Characteristic name |
| `specification` | VARCHAR(200) | YES | | Specification |
| `nominal` | DECIMAL(15,6) | YES | | Nominal value |
| `upper_limit` | DECIMAL(15,6) | YES | | Upper limit |
| `lower_limit` | DECIMAL(15,6) | YES | | Lower limit |
| `unit_of_measure` | VARCHAR(20) | YES | | UOM |
| `gauge_type` | VARCHAR(100) | YES | | Gauge type |
| `is_critical` | BOOLEAN | NO | FALSE | Critical char |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## inspection_record

**Purpose**: Inspection results

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `inspection_plan_id` | UUID | YES | | → inspection_plan.id |
| `work_order_id` | UUID | YES | | → work_order.id |
| `operation_id` | UUID | YES | | → work_order_operation.id |
| `material_lot_id` | UUID | YES | | → material_lot.id |
| `inspection_type` | VARCHAR(50) | NO | | Type |
| `result` | inspection_result | NO | 'PENDING' | Result |
| `quantity_inspected` | INTEGER | NO | | Qty inspected |
| `quantity_accepted` | INTEGER | NO | 0 | Qty accepted |
| `quantity_rejected` | INTEGER | NO | 0 | Qty rejected |
| `inspector_id` | UUID | NO | | → user.id |
| `inspected_at` | TIMESTAMPTZ | NO | NOW() | Time |
| `notes` | TEXT | YES | | Notes |

---

## inspection_measurement

**Purpose**: Individual measurements

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `inspection_record_id` | UUID | NO | | → inspection_record.id |
| `plan_item_id` | UUID | NO | | → inspection_plan_item.id |
| `sample_number` | INTEGER | NO | | Sample # |
| `measured_value` | DECIMAL(15,6) | NO | | Value |
| `result` | inspection_result | NO | | PASS/FAIL |
| `deviation` | DECIMAL(15,6) | YES | | Deviation |
| `notes` | TEXT | YES | | Notes |

---

## nonconformance

**Purpose**: NCR records

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `ncr_number` | VARCHAR(50) | NO | | NCR number |
| `status` | ncr_status | NO | 'OPEN' | Status |
| `source` | VARCHAR(50) | NO | | INTERNAL/SUPPLIER/etc. |
| `work_order_id` | UUID | YES | | → work_order.id |
| `part_id` | UUID | YES | | → part.id |
| `inspection_record_id` | UUID | YES | | → inspection_record.id |
| `quantity_affected` | INTEGER | NO | | Qty affected |
| `description` | TEXT | NO | | Description |
| `defect_code` | VARCHAR(50) | YES | | Defect code |
| `root_cause` | TEXT | YES | | Root cause |
| `disposition` | disposition_type | YES | | Disposition |
| `disposition_by` | UUID | YES | | → user.id |
| `disposition_at` | TIMESTAMPTZ | YES | | Disposition time |
| `disposition_notes` | TEXT | YES | | Notes |
| `cost_impact` | DECIMAL(12,2) | YES | | Cost |
| `reported_by` | UUID | NO | | → user.id |
| `reported_at` | TIMESTAMPTZ | NO | NOW() | Time |
| `closed_by` | UUID | YES | | → user.id |
| `closed_at` | TIMESTAMPTZ | YES | | Close time |

---

## corrective_action

**Purpose**: CAPA records

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `capa_number` | VARCHAR(50) | NO | | CAPA number |
| `capa_type` | VARCHAR(20) | NO | | CORRECTIVE/PREVENTIVE |
| `status` | VARCHAR(20) | NO | 'OPEN' | Status |
| `ncr_id` | UUID | YES | | → nonconformance.id |
| `problem_description` | TEXT | NO | | Problem |
| `root_cause_analysis` | TEXT | YES | | Root cause |
| `corrective_action` | TEXT | YES | | Action |
| `due_date` | DATE | YES | | Due date |
| `completed_date` | DATE | YES | | Completed |
| `verified_effective` | BOOLEAN | YES | | Effective? |
| `verified_by` | UUID | YES | | → user.id |
| `verified_at` | TIMESTAMPTZ | YES | | Verify time |
| `assigned_to` | UUID | YES | | → user.id |
| `created_by` | UUID | NO | | → user.id |

---

## calibration

**Purpose**: Gauge calibration

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `gauge_id` | VARCHAR(50) | NO | | Gauge ID |
| `gauge_name` | VARCHAR(200) | NO | | Name |
| `gauge_type` | VARCHAR(100) | YES | | Type |
| `manufacturer` | VARCHAR(100) | YES | | Manufacturer |
| `serial_number` | VARCHAR(100) | YES | | Serial # |
| `calibration_interval_days` | INTEGER | NO | | Interval |
| `last_calibration_date` | DATE | YES | | Last cal |
| `next_calibration_date` | DATE | YES | | Next cal |
| `calibration_vendor` | VARCHAR(200) | YES | | Cal vendor |
| `status` | VARCHAR(20) | NO | 'ACTIVE' | Status |
| `location` | VARCHAR(100) | YES | | Location |
| `certificate_id` | UUID | YES | | → file_attachment.id |

---

# FINISHING TABLES

## finishing_process

**Purpose**: Finishing process definitions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `process_code` | VARCHAR(50) | NO | | Process code |
| `name` | VARCHAR(200) | NO | | Name |
| `process_type` | VARCHAR(50) | NO | | ANODIZE/PLATE/etc. |
| `description` | TEXT | YES | | Description |
| `is_outside` | BOOLEAN | NO | FALSE | Outside process |
| `preferred_vendor_id` | UUID | YES | | → supplier.id |
| `standard_lead_time` | INTEGER | YES | | Lead time days |
| `cost_per_sqft` | DECIMAL(10,4) | YES | | Cost/sqft |
| `cost_per_piece` | DECIMAL(10,4) | YES | | Cost/piece |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## finishing_batch

**Purpose**: Finishing batches

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `batch_number` | VARCHAR(50) | NO | | Batch number |
| `process_id` | UUID | NO | | → finishing_process.id |
| `status` | VARCHAR(20) | NO | 'PENDING' | Status |
| `work_order_ids` | UUID[] | NO | | Work orders |
| `total_parts` | INTEGER | NO | 0 | Total parts |
| `scheduled_start` | TIMESTAMPTZ | YES | | Scheduled |
| `actual_start` | TIMESTAMPTZ | YES | | Actual start |
| `actual_end` | TIMESTAMPTZ | YES | | Actual end |
| `operator_id` | UUID | YES | | → user.id |
| `notes` | TEXT | YES | | Notes |

---

## chemical_bath

**Purpose**: Bath management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `facility_id` | UUID | NO | | → facility.id |
| `bath_number` | VARCHAR(50) | NO | | Bath number |
| `name` | VARCHAR(200) | NO | | Name |
| `bath_type` | VARCHAR(50) | NO | | Type |
| `process_id` | UUID | YES | | → finishing_process.id |
| `capacity_gallons` | DECIMAL(10,2) | YES | | Capacity |
| `temperature_min` | DECIMAL(6,2) | YES | | Min temp |
| `temperature_max` | DECIMAL(6,2) | YES | | Max temp |
| `status` | VARCHAR(20) | NO | 'ACTIVE' | Status |
| `last_analysis_date` | DATE | YES | | Last analysis |
| `next_analysis_date` | DATE | YES | | Next analysis |

---

## bath_analysis

**Purpose**: Bath chemistry records

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `bath_id` | UUID | NO | | → chemical_bath.id |
| `analysis_date` | DATE | NO | | Date |
| `performed_by` | UUID | NO | | → user.id |
| `temperature` | DECIMAL(6,2) | YES | | Temperature |
| `ph` | DECIMAL(4,2) | YES | | pH |
| `concentration` | DECIMAL(8,4) | YES | | Concentration |
| `results` | JSONB | YES | | All results |
| `action_taken` | TEXT | YES | | Actions |
| `pass_fail` | VARCHAR(10) | YES | | PASS/FAIL |

---

## outside_processing_order

**Purpose**: OSP tracking

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `osp_number` | VARCHAR(50) | NO | | OSP number |
| `supplier_id` | UUID | NO | | → supplier.id |
| `process_id` | UUID | NO | | → finishing_process.id |
| `status` | VARCHAR(20) | NO | 'PENDING' | Status |
| `work_order_id` | UUID | NO | | → work_order.id |
| `quantity` | INTEGER | NO | | Quantity |
| `ship_date` | DATE | YES | | Ship date |
| `expected_return` | DATE | YES | | Expected return |
| `actual_return` | DATE | YES | | Actual return |
| `tracking_out` | VARCHAR(100) | YES | | Outbound tracking |
| `tracking_in` | VARCHAR(100) | YES | | Inbound tracking |
| `cost` | DECIMAL(12,2) | YES | | Cost |

---

# PACKAGING TABLES

## packaging_specification

**Purpose**: Packaging specs by customer/part

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `customer_id` | UUID | YES | | → customer.id |
| `part_id` | UUID | YES | | → part.id |
| `name` | VARCHAR(200) | NO | | Name |
| `description` | TEXT | YES | | Description |
| `packaging_type` | VARCHAR(50) | NO | | Type |
| `parts_per_package` | INTEGER | YES | | Qty/package |
| `materials_required` | JSONB | YES | | Materials |
| `instructions` | TEXT | YES | | Instructions |
| `special_requirements` | TEXT | YES | | Requirements |
| `is_default` | BOOLEAN | NO | FALSE | Default |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## packaging_record

**Purpose**: Packaging completion

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `order_id` | UUID | NO | | → order.id |
| `order_line_id` | UUID | YES | | → order_line.id |
| `spec_id` | UUID | YES | | → packaging_specification.id |
| `quantity_packed` | INTEGER | NO | | Qty packed |
| `package_count` | INTEGER | NO | | # packages |
| `total_weight` | DECIMAL(10,2) | YES | | Weight |
| `packed_by` | UUID | NO | | → user.id |
| `packed_at` | TIMESTAMPTZ | NO | NOW() | Time |
| `verified_by` | UUID | YES | | → user.id |
| `notes` | TEXT | YES | | Notes |

---

## label_template

**Purpose**: Label definitions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `customer_id` | UUID | YES | | → customer.id |
| `name` | VARCHAR(200) | NO | | Name |
| `label_type` | VARCHAR(50) | NO | | PART/BOX/SHIPPING |
| `template_data` | JSONB | NO | | Template def |
| `width_inches` | DECIMAL(6,3) | YES | | Width |
| `height_inches` | DECIMAL(6,3) | YES | | Height |
| `is_default` | BOOLEAN | NO | FALSE | Default |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

# SHIPPING TABLES

## shipment

**Purpose**: Shipment records

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `shipment_number` | VARCHAR(50) | NO | | Shipment # |
| `order_id` | UUID | NO | | → order.id |
| `status` | shipment_status | NO | 'PENDING' | Status |
| `carrier_id` | UUID | YES | | → carrier.id |
| `service_level` | VARCHAR(100) | YES | | Service |
| `tracking_number` | VARCHAR(100) | YES | | Tracking # |
| `ship_to_address_id` | UUID | NO | | → customer_address.id |
| `ship_date` | DATE | YES | | Ship date |
| `expected_delivery` | DATE | YES | | Expected |
| `actual_delivery` | DATE | YES | | Actual |
| `package_count` | INTEGER | NO | 1 | # packages |
| `total_weight` | DECIMAL(10,2) | YES | | Weight |
| `total_weight_unit` | VARCHAR(10) | YES | 'LB' | Unit |
| `shipping_cost` | DECIMAL(12,2) | YES | | Cost |
| `billing_type` | VARCHAR(20) | YES | | PREPAID/COLLECT |
| `customer_account` | VARCHAR(100) | YES | | Customer acct |
| `notes` | TEXT | YES | | Notes |
| `shipped_by` | UUID | YES | | → user.id |

---

## shipment_line

**Purpose**: Shipment line items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `shipment_id` | UUID | NO | | → shipment.id |
| `order_line_id` | UUID | NO | | → order_line.id |
| `quantity_shipped` | INTEGER | NO | | Qty shipped |
| `serial_numbers` | TEXT[] | YES | | Serial #s |
| `lot_numbers` | TEXT[] | YES | | Lot #s |

---

## shipment_package

**Purpose**: Package details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `shipment_id` | UUID | NO | | → shipment.id |
| `package_number` | INTEGER | NO | | Package # |
| `tracking_number` | VARCHAR(100) | YES | | Package tracking |
| `weight` | DECIMAL(10,2) | YES | | Weight |
| `length` | DECIMAL(10,2) | YES | | Length |
| `width` | DECIMAL(10,2) | YES | | Width |
| `height` | DECIMAL(10,2) | YES | | Height |
| `dim_unit` | VARCHAR(10) | YES | 'IN' | Dimension unit |

---

## shipment_tracking

**Purpose**: Tracking events

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `shipment_id` | UUID | NO | | → shipment.id |
| `event_time` | TIMESTAMPTZ | NO | | Event time |
| `event_type` | VARCHAR(50) | NO | | Event type |
| `description` | VARCHAR(500) | NO | | Description |
| `location` | VARCHAR(200) | YES | | Location |
| `source` | VARCHAR(50) | NO | | API/MANUAL |

---

## carrier

**Purpose**: Shipping carriers

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `code` | VARCHAR(20) | NO | | Carrier code |
| `name` | VARCHAR(200) | NO | | Name |
| `carrier_type` | VARCHAR(50) | NO | | PARCEL/LTL/etc. |
| `api_enabled` | BOOLEAN | NO | FALSE | API enabled |
| `api_credentials` | JSONB | YES | | Credentials |
| `account_number` | VARCHAR(100) | YES | | Account # |
| `is_active` | BOOLEAN | NO | TRUE | Active |

---

## rma

**Purpose**: Return authorizations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_v4() | Primary key |
| `organization_id` | UUID | NO | | → organization.id |
| `rma_number` | VARCHAR(50) | NO | | RMA number |
| `customer_id` | UUID | NO | | → customer.id |
| `order_id` | UUID | YES | | → order.id |
| `status` | VARCHAR(20) | NO | 'PENDING' | Status |
| `reason_code` | VARCHAR(50) | NO | | Reason code |
| `description` | TEXT | NO | | Description |
| `quantity` | INTEGER | NO | | Qty |
| `requested_at` | TIMESTAMPTZ | NO | NOW() | Request time |
| `received_at` | TIMESTAMPTZ | YES | | Received |
| `disposition` | disposition_type | YES | | Disposition |
| `credit_amount` | DECIMAL(12,2) | YES | | Credit |
| `replacement_order_id` | UUID | YES | | → order.id |
| `notes` | TEXT | YES | | Notes |

---

# DATA RETENTION SUMMARY

| Category | Retention | Archive |
|----------|-----------|---------|
| Audit logs | 7 years | Cold storage after 2 years |
| Telemetry (raw) | 90 days | Aggregate, then delete |
| Telemetry (1h) | 2 years | Cold storage |
| Telemetry (1d) | Indefinite | Compress after 1 year |
| Orders | Indefinite | None |
| Quotes | 7 years | Archive after 2 years |
| Quality | 10 years | None (regulatory) |
| Files | Per policy | Cold storage after 2 years |

---

*Document Version: 1.0.0*
*Total Tables: 75+*
*Total Fields: 1,200+*
*Created: January 2026*
*For: Feralis Manufacturing Operations Platform*