# Equipement-lifecycle

Intelligent Asset Traceability & Document Verification Platform
A browser-based application for managing equipment records, processing technical documents, checking lifecycle data, and reviewing validation findings.
# Implemented Features
## Backend and Database
- NestJS backend developed with TypeScript.
- PostgreSQL 17 database running in Docker.
- Prisma ORM for database access and schema management.
- Data models for assets, components, component assignments, documents, extracted fields, lifecycle events, event evidence, validation findings, finding reviews, and audit logs.
- Backend modules for assets, components, documents, lifecycle events, validation, and findings.
## Document and Lifecycle Data
- Basic PDF upload and document record processing.
- Document metadata and SHA-256 hashes for duplicate identification.
- Basic field extraction and entity association.
- Lifecycle events and links to supporting document evidence.
- Synthetic PDF fixtures and development seed data.
## Validation Engine
The backend includes ten deterministic validation checks:
Rule	Validation

- VAL-01	Conflicting component serial numbers
- VAL-02	Part number conflicts
- VAL-03	Removal before installation
- VAL-04	Unmatched component removal
- VAL-05	Overlapping installation periods
- VAL-06	Historical coverage gaps
- VAL-07	Decreasing operating hours
- VAL-08	Decreasing usage counts
- VAL-09	Conflicting measurements for an apparently identical event
- VAL-10	Missing supporting evidence
