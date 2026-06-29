# Excel to PostgreSQL Migration Script

This folder contains a Python migration script that imports material purchase data from `Materials_Database.xlsx` into a PostgreSQL table named `purchase_records`.

The script is currently configured for the Molikule local database through hard-coded settings in `excel_to_postgres.py`.

## Files

```text
.
├── Materials_Database.xlsx      # Excel file with raw material purchase data
├── excel_to_postgres.py         # Migration script
├── requirements.txt             # Python dependencies
├── README.md                    # Full documentation
└── QUICKSTART.md                # Short setup/run guide
```

## Features

- Reads `Materials_Database.xlsx` with pandas/openpyxl.
- Resolves the Excel path relative to the script file, so the script can be run from different working directories.
- Connects to PostgreSQL using the hard-coded `DB_CONFIG` block.
- Drops the existing target table if it already exists.
- Recreates the `purchase_records` table.
- Creates 4 indexes for common lookup/filter patterns.
- Validates required columns before connecting to the database.
- Converts `dd.mm.yyyy` Excel date values to PostgreSQL `DATE`.
- Enforces 6-digit vendor codes.
- Logs each migration stage in the terminal with timestamps.
- Logs file size, Excel read duration, row progress, skipped rows, commit, rollback, and connection close.
- Rolls back the transaction if the database migration fails.

## Prerequisites

### Python Dependencies

Install the required libraries:

```bash
pip install -r requirements.txt
```

`requirements.txt` contains:

```text
psycopg2-binary==2.9.9
pandas==2.1.4
openpyxl==3.1.2
```

### PostgreSQL Setup

PostgreSQL must be installed and running. The script expects this database configuration:

```python
DB_CONFIG = {
    "host": "localhost",
    "port": "5432",
    "user": "molikule_user",
    "password": "molikule123",
    "database": "molikule",
    "table_name": "purchase_records"
}
```

The database and user must already exist before running the script.

Example setup:

```sql
CREATE DATABASE molikule;
CREATE USER molikule_user WITH PASSWORD 'molikule123';
GRANT ALL PRIVILEGES ON DATABASE molikule TO molikule_user;
```

Depending on your PostgreSQL version and permissions model, you may also need schema privileges:

```sql
\c molikule
GRANT ALL ON SCHEMA public TO molikule_user;
```

## Excel File Requirements

The script expects `Materials_Database.xlsx` to be in the same folder as `excel_to_postgres.py`.

Required columns:

- `PlantCode`
- `MaterialCode`
- `VendorCode`
- `Description`
- `PurchaseNo`
- `Date`
- `NetPrice`
- `Cost`
- `SupplyingPlant`
- `Quantity`
- `Currency`
- `Units`

Date values should be in `dd.mm.yyyy` format, such as `03.05.2024`.

Vendor codes are treated as 6-digit values. If a source value is longer than 6 characters, the script logs a warning and uses the first 6 characters. If the final value is not exactly 6 digits, that row is skipped.

## Usage

From this folder:

```bash
python3 excel_to_postgres.py
```

From the repository root:

```bash
python3 datamigration/files/excel_to_postgres.py
```

The script does not prompt for connection details. Edit the `DB_CONFIG` block in `excel_to_postgres.py` if you need a different database, user, password, host, port, or table name.

## What the Script Does

1. Starts terminal logging.
2. Locates `Materials_Database.xlsx` next to the script.
3. Logs the Excel file size.
4. Reads the workbook and logs read duration, row count, and columns.
5. Validates that all required columns exist.
6. Connects to PostgreSQL.
7. Checks whether `purchase_records` already exists.
8. Drops the existing table if found.
9. Creates the table.
10. Creates indexes.
11. Inserts rows one by one.
12. Logs migration progress while rows are processed.
13. Logs skipped rows and row-level failures.
14. Commits the transaction on success.
15. Rolls back on database or migration failure.
16. Closes the database connection.

## Important Behavior

Running the script is destructive for the target table.

If `purchase_records` already exists, the script drops it with `DROP TABLE IF EXISTS ... CASCADE` and recreates it. Any existing data in that table is removed.

## Database Schema Created

```sql
CREATE TABLE purchase_records (
    id              BIGSERIAL PRIMARY KEY,
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
```

## Indexes Created

The script creates 4 indexes:

1. `idx_purchase_records_material_code`
2. `idx_purchase_records_vendor_code`
3. `idx_purchase_records_plant_code`
4. `idx_purchase_records_purchase_date`

These support common material, vendor, plant, and date-range queries.

## Data Type Mapping

| Excel Column | PostgreSQL Column | PostgreSQL Type | Notes |
|---|---|---|---|
| `PlantCode` | `plant_code` | `VARCHAR(4)` | Trimmed to max 4 characters |
| `MaterialCode` | `material_code` | `VARCHAR(8)` | Trimmed to max 8 characters |
| `VendorCode` | `vendor_code` | `VARCHAR(6)` | Must be exactly 6 digits after trimming |
| `Description` | `description` | `TEXT` | Empty string if missing |
| `PurchaseNo` | `purchase_no` | `VARCHAR(10)` | Trimmed to max 10 characters |
| `Date` | `purchase_date` | `DATE` | Parsed from `dd.mm.yyyy` |
| `NetPrice` | `net_price` | `NUMERIC(15,2)` | Converted to float before insert |
| `Cost` | `cost` | `NUMERIC(15,2)` | Converted to float before insert |
| `SupplyingPlant` | `supplying_plant` | `TEXT` | Empty string if missing |
| `Quantity` | `quantity` | `NUMERIC(15,2)` | Converted to float before insert |
| `Currency` | `currency` | `VARCHAR(10)` | Trimmed to max 10 characters |
| `Units` | `unit` | `VARCHAR(20)` | Trimmed to max 20 characters |

## Terminal Logging

The script logs messages like:

```text
2026-06-29 12:00:00 [INFO] Starting Excel read: /path/to/Materials_Database.xlsx
2026-06-29 12:00:01 [INFO] Excel read complete in 0.42 seconds. Rows: 50, Columns: 12
2026-06-29 12:00:01 [INFO] Connecting to PostgreSQL host=localhost port=5432 database=molikule user=molikule_user
2026-06-29 12:00:01 [WARNING] Existing table 'purchase_records' found. Dropping it before migration
2026-06-29 12:00:02 [INFO] Migration progress: 50/50 rows processed, 50 inserted, 0 skipped, 0.18 seconds elapsed
2026-06-29 12:00:02 [INFO] Migration completed successfully
```

For large files, the most useful stages to watch are:

- `Reading workbook now`
- `Excel read complete`
- `Starting data migration`
- `Migration progress`
- `Committing transaction`

## Verification

Connect to the configured database:

```bash
psql -U molikule_user -d molikule
```

Check the table:

```sql
\dt
\d purchase_records
```

Check record count:

```sql
SELECT COUNT(*) FROM purchase_records;
```

View sample records:

```sql
SELECT * FROM purchase_records LIMIT 5;
```

Check indexes:

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'purchase_records';
```

Example queries:

```sql
SELECT * FROM purchase_records WHERE material_code = '12345678';

SELECT currency, COUNT(*) AS total_purchases, SUM(cost) AS total_cost
FROM purchase_records
GROUP BY currency;

SELECT *
FROM purchase_records
WHERE purchase_date BETWEEN '2023-01-01' AND '2023-12-31';
```

## Troubleshooting

### Excel File Not Found

Make sure `Materials_Database.xlsx` is in the same folder as `excel_to_postgres.py`.

### Missing Required Columns

The script exits before connecting to PostgreSQL if any required column is missing. Check the logged missing column names and update the workbook.

### Connection Refused

- Confirm PostgreSQL is running.
- Confirm host and port in `DB_CONFIG`.
- Confirm PostgreSQL is listening on port `5432`.

### Authentication Failed

- Confirm `molikule_user` exists.
- Confirm the password is correct.
- Confirm the user has access to the `molikule` database.

### Permission Denied Creating Table

Grant database/schema privileges to the configured user:

```sql
GRANT ALL PRIVILEGES ON DATABASE molikule TO molikule_user;
\c molikule
GRANT ALL ON SCHEMA public TO molikule_user;
```

### Rows Skipped

Rows can be skipped when:

- `PlantCode` is missing.
- `MaterialCode` is missing.
- `VendorCode` is missing.
- `VendorCode` is not exactly 6 digits after trimming.
- `Date` cannot be parsed.

Check the terminal warnings for the exact row numbers.
