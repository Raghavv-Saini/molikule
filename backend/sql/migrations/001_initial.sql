-- Migration: 001_initial.sql
-- Creates the purchase_records and users tables with all required indexes.

-- purchase_records: pre-populated externally; Molikule only reads from this table.
CREATE TABLE purchase_records (
    id              BIGSERIAL      PRIMARY KEY,
    plant_code      VARCHAR(4)     NOT NULL,
    material_code   VARCHAR(8)     NOT NULL,
    vendor_code     VARCHAR(6)     NOT NULL,
    description     TEXT,
    purchase_no     VARCHAR(10),
    purchase_date   DATE           NOT NULL,
    net_price       NUMERIC(15,2),
    cost            NUMERIC(15,2),
    supplying_plant TEXT,
    quantity        NUMERIC(15,2),
    currency        VARCHAR(10),
    unit            VARCHAR(20)
);

-- Single-column indexes for the most common individual filter lookups.
CREATE INDEX idx_purchase_records_material_code ON purchase_records (material_code);
CREATE INDEX idx_purchase_records_vendor_code   ON purchase_records (vendor_code);
CREATE INDEX idx_purchase_records_plant_code    ON purchase_records (plant_code);
CREATE INDEX idx_purchase_records_purchase_date ON purchase_records (purchase_date);

-- Composite indexes for combined-filter searches.
CREATE INDEX idx_purchase_records_mat_ven   ON purchase_records (material_code, vendor_code);
CREATE INDEX idx_purchase_records_mat_plant ON purchase_records (material_code, plant_code);
CREATE INDEX idx_purchase_records_ven_plant ON purchase_records (vendor_code,   plant_code);

-- users: managed by Molikule (create, delete, reset password).
CREATE TABLE users (
    id            BIGSERIAL    PRIMARY KEY,
    employee_id   VARCHAR(6)   UNIQUE NOT NULL,
    name          VARCHAR(255),
    password_hash TEXT         NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW()
);
