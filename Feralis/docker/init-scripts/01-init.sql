-- =============================================================================
-- FERALIS PLATFORM - DATABASE INITIALIZATION
-- =============================================================================
-- This script runs automatically when the PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT ALL ON SCHEMA audit TO feralis;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO feralis;
GRANT ALL ON ALL SEQUENCES IN SCHEMA audit TO feralis;

-- Create TimescaleDB extension (for future telemetry)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Database initialization complete';
END $$;
