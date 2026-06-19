# Excel to PostgreSQL Migration Script

A comprehensive Python script to migrate material data from Excel to PostgreSQL with full schema support and error handling.

## Features

✅ **Interactive Database Configuration** - Simple prompts for all connection details  
✅ **Automatic Table Creation** - Creates the purchase_records table with proper schema  
✅ **Index Creation** - Automatically creates 7 optimized indexes for query performance  
✅ **Data Validation** - Validates required fields before insertion  
✅ **Error Handling** - Skips invalid rows and reports errors without stopping migration  
✅ **Progress Tracking** - Shows real-time progress during data import  
✅ **Date Conversion** - Automatically converts dd.mm.yyyy format to PostgreSQL DATE  
✅ **Type Safety** - Properly converts Excel data types to PostgreSQL types  
✅ **Rollback on Failure** - Automatic rollback if migration fails  

## Prerequisites

### 1. Install Required Python Libraries

```bash
pip install psycopg2-binary pandas openpyxl
```

Or using requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. PostgreSQL Setup

Ensure PostgreSQL is installed and running. You'll need:
- Host (usually `localhost`)
- Port (usually `5432`)
- Username (usually `postgres`)
- Password
- An existing database (the script will create the table inside it)

### 3. Excel File

The script expects these columns in your Excel file:
- `PlantCode`
- `MaterialCode`
- `VendorCode`
- `Description`
- `PurchaseNo`
- `Date` (in dd.mm.yyyy format)
- `NetPrice`
- `Cost`
- `SupplyingPlant`
- `Quantity`
- `Currency`
- `Units`

## Usage

### Basic Usage

```bash
python excel_to_postgres.py
```

The script will:
1. Look for `Materials_Database.xlsx` in the current directory
2. Prompt you for PostgreSQL connection details
3. Create the table and indexes
4. Migrate the data
5. Display a summary

### Interactive Prompts

When you run the script, you'll be asked for:

```
PostgreSQL Connection Configuration
============================================================

Enter PostgreSQL host (default: localhost): 
Enter PostgreSQL port (default: 5432): 
Enter PostgreSQL username (default: postgres): 
Enter PostgreSQL password: 
Enter database name: 
Enter table name (default: purchase_records):
```

### Example Session

```bash
$ python excel_to_postgres.py

============================================================
  Excel to PostgreSQL Migration Tool
============================================================

Reading Excel file: Materials_Database.xlsx
✓ Successfully read 50 rows from Excel

============================================================
PostgreSQL Connection Configuration
============================================================

Enter PostgreSQL host (default: localhost): localhost
Enter PostgreSQL port (default: 5432): 5432
Enter PostgreSQL username (default: postgres): postgres
Enter PostgreSQL password: ********
Enter database name: pharma_db
Enter table name (default: purchase_records): purchase_records

✓ Connected to PostgreSQL (localhost:5432)

Creating table structure...
✓ Created table 'purchase_records'
✓ Created 7 indexes

Migrating data...
  Inserted 50 records...

============================================================
Migration completed successfully!
Database: pharma_db
Table: purchase_records
Records inserted: 50
============================================================
```

## Database Schema Created

The script creates the following table:

```sql
CREATE TABLE purchase_records (
    id              BIGSERIAL PRIMARY KEY,
    plant_code      VARCHAR(4)     NOT NULL,
    material_code   VARCHAR(8)     NOT NULL,
    vendor_code     VARCHAR(8)     NOT NULL,
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

### Indexes Created

1. `idx_purchase_records_material_code` - For material lookups
2. `idx_purchase_records_vendor_code` - For vendor lookups
3. `idx_purchase_records_plant_code` - For plant filtering
4. `idx_purchase_records_purchase_date` - For date range queries
5. `idx_purchase_records_mat_ven` - Composite: material + vendor
6. `idx_purchase_records_mat_plant` - Composite: material + plant
7. `idx_purchase_records_ven_plant` - Composite: vendor + plant

## Configuration Details

### Default Values

- **Host**: `localhost`
- **Port**: `5432`
- **Username**: `postgres`
- **Table Name**: `purchase_records`

Simply press Enter to accept defaults.

### Connection Troubleshooting

If you get a connection error:

**"connection refused"**
- Ensure PostgreSQL is running: `sudo systemctl start postgresql`
- Check the host and port are correct
- Verify PostgreSQL is listening on that port

**"password authentication failed"**
- Double-check the username and password
- Ensure the user has permissions for the specified database

**"database does not exist"**
- Create the database first:
  ```sql
  CREATE DATABASE pharma_db;
  ```

## Data Type Mapping

| Excel Column | PostgreSQL Type | Notes |
|---|---|---|
| PlantCode | VARCHAR(4) | Max 4 characters |
| MaterialCode | VARCHAR(8) | Max 8 characters |
| VendorCode | VARCHAR(8) | Max 8 characters |
| Description | TEXT | No size limit |
| PurchaseNo | VARCHAR(10) | Max 10 characters |
| Date | DATE | Converted from dd.mm.yyyy |
| NetPrice | NUMERIC(15,2) | 2 decimal places |
| Cost | NUMERIC(15,2) | 2 decimal places |
| SupplyingPlant | TEXT | No size limit |
| Quantity | NUMERIC(15,2) | 2 decimal places |
| Currency | VARCHAR(10) | Max 10 characters |
| Units | VARCHAR(20) | Max 20 characters |

## Error Handling

The script handles various error scenarios:

- **Missing Required Fields**: Rows with missing plant_code, material_code, vendor_code, or purchase_date are skipped
- **Invalid Data Types**: Automatic type conversion with error logging
- **Date Parsing Errors**: Falls back to NULL if date cannot be parsed
- **Connection Failures**: Clear error messages and graceful exit
- **Duplicate Operations**: Prompts before dropping existing tables

## Verification

After migration, verify the data in PostgreSQL:

```sql
-- Connect to your database
psql -U postgres -d pharma_db

-- Check record count
SELECT COUNT(*) FROM purchase_records;

-- View sample records
SELECT * FROM purchase_records LIMIT 5;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'purchase_records';

-- Query by material code
SELECT * FROM purchase_records WHERE material_code = '12345678';

-- Get purchase summary
SELECT currency, COUNT(*) as total_purchases, 
       SUM(cost) as total_cost 
FROM purchase_records 
GROUP BY currency;
```

## Performance Notes

The 7 indexes are optimized for:
- Fast lookups by material, vendor, or plant code
- Efficient date range queries
- Composite queries combining multiple columns
- Performance with up to 300,000+ records

## Troubleshooting

### Script won't start
```bash
# Check Python version (requires 3.6+)
python --version

# Verify dependencies
pip list | grep -E "psycopg2|pandas"
```

### Slow migration
- Check if PostgreSQL server is local or remote
- Verify network connectivity for remote databases
- Ensure adequate system resources

### Missing data after migration
- Check error messages in script output
- Verify Excel file format matches requirements
- Check PostgreSQL logs: `/var/log/postgresql/`

## Contact & Support

For issues or questions:
1. Check the error messages in script output
2. Verify PostgreSQL is running and accessible
3. Ensure Excel file has all required columns
4. Check database permissions

## License

Free to use for any purpose.
