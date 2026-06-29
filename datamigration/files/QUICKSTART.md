# Quick Start Guide

## Step 1: Install Dependencies

From `datamigration/files`:

```bash
pip install -r requirements.txt
```

## Step 2: Prepare PostgreSQL

The script uses hard-coded database settings in `excel_to_postgres.py`:

```text
host: localhost
port: 5432
user: molikule_user
password: molikule123
database: molikule
table: purchase_records
```

Create the database and user if they do not already exist:

```sql
CREATE DATABASE molikule;
CREATE USER molikule_user WITH PASSWORD 'molikule123';
GRANT ALL PRIVILEGES ON DATABASE molikule TO molikule_user;
```

If table creation fails with a schema permission error:

```sql
\c molikule
GRANT ALL ON SCHEMA public TO molikule_user;
```

## Step 3: Check the Excel File

Make sure this file exists:

```text
datamigration/files/Materials_Database.xlsx
```

Required columns:

```text
PlantCode, MaterialCode, VendorCode, Description, PurchaseNo, Date,
NetPrice, Cost, SupplyingPlant, Quantity, Currency, Units
```

`VendorCode` must be 6 digits. Longer values are trimmed to 6 characters and logged.

## Step 4: Run the Migration

From `datamigration/files`:

```bash
python3 excel_to_postgres.py
```

Or from the repository root:

```bash
python3 datamigration/files/excel_to_postgres.py
```

The script does not ask for prompts. Change `DB_CONFIG` in `excel_to_postgres.py` if the database settings are different.

Important: if `purchase_records` already exists, the script drops and recreates it.

## Step 5: Watch Terminal Logs

The script logs every major stage with timestamps:

```text
Starting Excel read
Excel file found
Excel read complete
Required column validation passed
Connecting to PostgreSQL
PostgreSQL connection established
Checking whether table exists
Creating table
Creating indexes
Starting data migration
Migration progress
Committing transaction
Migration completed successfully
```

For large files, wait for the `Excel read complete` and `Migration progress` messages before assuming it is stuck.

## Step 6: Verify the Migration

Connect to PostgreSQL:

```bash
psql -U molikule_user -d molikule
```

Check the table:

```sql
\dt
\d purchase_records
```

Count records:

```sql
SELECT COUNT(*) FROM purchase_records;
```

View sample data:

```sql
SELECT * FROM purchase_records LIMIT 5;
```

Check indexes:

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'purchase_records';
```

## Useful Queries

Count by currency:

```sql
SELECT currency, COUNT(*)
FROM purchase_records
GROUP BY currency;
```

Find expensive items:

```sql
SELECT description, net_price, cost
FROM purchase_records
WHERE cost > 10000
ORDER BY cost DESC;
```

Purchases by plant:

```sql
SELECT plant_code, COUNT(*) AS count, SUM(cost) AS total_cost
FROM purchase_records
GROUP BY plant_code;
```

Date range:

```sql
SELECT *
FROM purchase_records
WHERE purchase_date BETWEEN '2023-01-01' AND '2023-12-31';
```

## Troubleshooting

### PostgreSQL Will Not Start

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### Cannot Connect

Check `DB_CONFIG` in `excel_to_postgres.py`, then confirm PostgreSQL is listening:

```bash
sudo netstat -tulpn | grep postgres
```

### Missing Excel File

Place `Materials_Database.xlsx` in the same folder as `excel_to_postgres.py`.

### Rows Are Skipped

Read the warning logs. Common causes:

- Missing `PlantCode`
- Missing `MaterialCode`
- Missing `VendorCode`
- `VendorCode` is not exactly 6 digits after trimming
- Invalid `Date`

### Existing Table Data Disappeared

This is expected behavior. The script drops and recreates `purchase_records` each time it runs.

## Backup Before Running

If the table may contain data you need, back it up before running the migration:

```bash
pg_dump -U molikule_user -d molikule -t purchase_records > purchase_records_backup.sql
```
