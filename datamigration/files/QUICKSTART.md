# Quick Start Guide

## Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 2: Set Up PostgreSQL (if needed)

### On Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### On macOS:
```bash
brew install postgresql
brew services start postgresql
```

### On Windows:
Download and install from: https://www.postgresql.org/download/windows/

## Step 3: Create a Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create your database
CREATE DATABASE pharma_db;

# Exit
\q
```

## Step 4: Run the Migration Script

```bash
python excel_to_postgres.py
```

### When Prompted, Enter:
```
Enter PostgreSQL host (default: localhost): localhost
Enter PostgreSQL port (default: 5432): 5432
Enter PostgreSQL username (default: postgres): postgres
Enter PostgreSQL password: your_password
Enter database name: pharma_db
Enter table name (default: purchase_records): purchase_records
```

## Step 5: Verify the Migration

```bash
# Connect to your database
psql -U postgres -d pharma_db

# Check the table
\dt

# Count records
SELECT COUNT(*) FROM purchase_records;

# View sample data
SELECT * FROM purchase_records LIMIT 5;

# Exit
\q
```

## Common Commands for PostgreSQL

### Connect to Database
```bash
psql -U postgres -d pharma_db
```

### List Databases
```sql
\l
```

### List Tables
```sql
\dt
```

### Describe Table
```sql
\d purchase_records
```

### Query Examples

**Get all records:**
```sql
SELECT * FROM purchase_records;
```

**Count by currency:**
```sql
SELECT currency, COUNT(*) FROM purchase_records GROUP BY currency;
```

**Find expensive items:**
```sql
SELECT description, net_price, cost 
FROM purchase_records 
WHERE cost > 10000 
ORDER BY cost DESC;
```

**Get purchases by plant:**
```sql
SELECT plant_code, COUNT(*) as count, SUM(cost) as total_cost
FROM purchase_records
GROUP BY plant_code;
```

**Search by material code:**
```sql
SELECT * FROM purchase_records 
WHERE material_code = '12345678';
```

**Date range query:**
```sql
SELECT * FROM purchase_records 
WHERE purchase_date BETWEEN '2023-01-01' AND '2023-12-31';
```

## Troubleshooting

### PostgreSQL won't start
```bash
# Check if already running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Can't connect to database
```bash
# Check PostgreSQL is listening
sudo netstat -tulpn | grep postgres

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Permission denied
```bash
# Check user permissions
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'newpassword';"
```

### Reset PostgreSQL password
```bash
# Edit PostgreSQL config (Linux)
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Change 'md5' to 'trust' for local connections
# Then restart: sudo systemctl restart postgresql

# Connect and change password
psql -U postgres
ALTER USER postgres WITH PASSWORD 'newpassword';
```

## File Structure

```
.
├── Materials_Database.xlsx      # Excel file with raw data
├── excel_to_postgres.py         # Migration script (main)
├── requirements.txt             # Python dependencies
├── README.md                    # Full documentation
└── QUICKSTART.md               # This file
```

## Next Steps

After successful migration:

1. **Verify Data**: Run queries to ensure all 50 records are present
2. **Create Views**: Consider creating PostgreSQL views for common queries
3. **Add Constraints**: Consider adding foreign keys if you have related tables
4. **Set Permissions**: Configure database user permissions for your application
5. **Backup**: Set up regular backups of your PostgreSQL database

## Example: Create a View

```sql
CREATE VIEW material_summary AS
SELECT 
    material_code,
    description,
    COUNT(*) as purchase_count,
    SUM(quantity) as total_quantity,
    SUM(cost) as total_cost,
    AVG(net_price) as avg_price
FROM purchase_records
GROUP BY material_code, description;

-- Query the view
SELECT * FROM material_summary;
```

## Example: Add Constraints

```sql
-- Add NOT NULL constraint to currency
ALTER TABLE purchase_records 
ALTER COLUMN currency SET NOT NULL;

-- Add check constraint for positive prices
ALTER TABLE purchase_records
ADD CONSTRAINT check_positive_price 
CHECK (net_price > 0);
```

## Performance Tips

1. **Use Indexes**: Queries use the automatically created indexes
2. **Batch Operations**: For large updates, use batch operations
3. **Analyze Query Plans**: Use EXPLAIN to optimize queries
   ```sql
   EXPLAIN SELECT * FROM purchase_records WHERE material_code = '12345678';
   ```

## Backup & Restore

```bash
# Backup database
pg_dump -U postgres pharma_db > backup.sql

# Restore database
psql -U postgres pharma_db < backup.sql

# Backup as compressed file
pg_dump -U postgres -Fc pharma_db > backup.dump

# Restore compressed backup
pg_restore -U postgres -d pharma_db backup.dump
```

## Got Stuck?

1. Check the error message - it usually explains what went wrong
2. Verify PostgreSQL is running: `sudo systemctl status postgresql`
3. Verify the Excel file has all required columns
4. Check database credentials are correct
5. Look at PostgreSQL logs for detailed errors

---

**Happy migrating! 🚀**
