#!/usr/bin/env python3
"""
Excel to PostgreSQL Migration Script
Reads material data from Excel and imports it into PostgreSQL database
"""

import psycopg2
from psycopg2 import sql, Error
import pandas as pd
import logging
import sys
import time
from pathlib import Path


# =========================
# HARD-CODED CONFIGURATION
# =========================

DB_CONFIG = {
    "host": "localhost",
    "port": "5432",
    "user": "molikule_user",
    "password": "molikule123",
    "database": "molikule",
    "table_name": "purchase_records"
}

SCRIPT_DIR = Path(__file__).resolve().parent
EXCEL_FILE = SCRIPT_DIR / "Materials_Database.xlsx"
VENDOR_CODE_LENGTH = 6
PROGRESS_INTERVAL = 500
# Example: r"C:\Users\YourName\Documents\Materials_Database.xlsx"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# =========================
# FUNCTIONS
# =========================

def read_excel_file(filepath):
    logger.info("Starting Excel read: %s", filepath)
    try:
        if not filepath.exists():
            raise FileNotFoundError(filepath)

        file_size_mb = filepath.stat().st_size / (1024 * 1024)
        logger.info("Excel file found. Size: %.2f MB", file_size_mb)
        logger.info("Reading workbook now. Large files can take a while at this stage")
        started_at = time.perf_counter()
        df = pd.read_excel(filepath)
        elapsed = time.perf_counter() - started_at
        logger.info(
            "Excel read complete in %.2f seconds. Rows: %s, Columns: %s",
            elapsed,
            len(df),
            len(df.columns),
        )
        logger.info("Excel columns: %s", ", ".join(df.columns.astype(str)))
        return df
    except FileNotFoundError:
        logger.error("Excel file not found: %s", filepath)
        sys.exit(1)
    except Exception as e:
        logger.exception("Error reading Excel file: %s", e)
        sys.exit(1)


def connect_postgres(credentials):
    logger.info(
        "Connecting to PostgreSQL host=%s port=%s database=%s user=%s",
        credentials['host'],
        credentials['port'],
        credentials['database'],
        credentials['user'],
    )
    try:
        conn = psycopg2.connect(
            host=credentials['host'],
            port=credentials['port'],
            user=credentials['user'],
            password=credentials['password'],
            database=credentials['database']
        )
        cursor = conn.cursor()
        logger.info("PostgreSQL connection established")
        return conn, cursor
    except Error as e:
        logger.exception("Error connecting to PostgreSQL: %s", e)
        sys.exit(1)


def drop_existing_table(cursor, table_name):
    logger.info("Checking whether table '%s' already exists", table_name)
    try:
        cursor.execute(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s);",
            (table_name,)
        )
        if cursor.fetchone()[0]:
            logger.warning("Existing table '%s' found. Dropping it before migration", table_name)
            cursor.execute(
                sql.SQL("DROP TABLE IF EXISTS {} CASCADE;").format(sql.Identifier(table_name))
            )
            logger.info("Dropped existing table '%s'", table_name)
        else:
            logger.info("No existing table named '%s' found", table_name)
    except Error as e:
        logger.exception("Error checking or dropping table '%s': %s", table_name, e)
        raise


def create_table(cursor, table_name):
    logger.info("Creating table '%s'", table_name)
    create_table_sql = sql.SQL("""
    CREATE TABLE {table} (
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
    """).format(table=sql.Identifier(table_name))

    cursor.execute(create_table_sql)
    logger.info("Created table '%s'", table_name)


def create_indexes(cursor, table_name):
    logger.info("Creating indexes for table '%s'", table_name)
    indexes = [
        (f"idx_{table_name}_material_code", "(material_code)"),
        (f"idx_{table_name}_vendor_code", "(vendor_code)"),
        (f"idx_{table_name}_plant_code", "(plant_code)"),
        (f"idx_{table_name}_purchase_date", "(purchase_date)")
    ]

    for idx_name, idx_columns in indexes:
        logger.info("Creating index '%s' on %s", idx_name, idx_columns)
        cursor.execute(
            sql.SQL("CREATE INDEX {} ON {} {}").format(
                sql.Identifier(idx_name),
                sql.Identifier(table_name),
                sql.SQL(idx_columns)
            )
        )

    logger.info("Created %s indexes", len(indexes))


def convert_date(date_str):
    if pd.isna(date_str):
        return None
    try:
        if isinstance(date_str, str):
            return pd.to_datetime(date_str, format='%d.%m.%Y').date()
        return pd.to_datetime(date_str).date()
    except Exception:
        return None


def clean_text(value, max_length, column_name, row_number):
    if pd.isna(value):
        return ""

    text = str(value).strip()
    if len(text) > max_length:
        logger.warning(
            "Row %s: %s value '%s' exceeds %s characters; using '%s'",
            row_number,
            column_name,
            text,
            max_length,
            text[:max_length],
        )
        return text[:max_length]

    return text


def migrate_data(cursor, df, table_name):
    total_rows = len(df)
    logger.info("Starting data migration into '%s'. Source rows: %s", table_name, total_rows)
    started_at = time.perf_counter()
    insert_sql = sql.SQL("""
    INSERT INTO {table} 
    (plant_code, material_code, vendor_code, description, purchase_no, 
     purchase_date, net_price, cost, supplying_plant, quantity, currency, unit)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """).format(table=sql.Identifier(table_name))

    records = 0
    errors = 0
    progress_interval = max(1, min(PROGRESS_INTERVAL, total_rows // 10 or 1))

    for processed, (idx, row) in enumerate(df.iterrows(), start=1):
        row_number = idx + 2
        try:
            plant_code = clean_text(row.get('PlantCode', ''), 4, 'PlantCode', row_number)
            material_code = clean_text(row.get('MaterialCode', ''), 8, 'MaterialCode', row_number)
            vendor_code = clean_text(
                row.get('VendorCode', ''),
                VENDOR_CODE_LENGTH,
                'VendorCode',
                row_number,
            )
            description = "" if pd.isna(row.get('Description')) else str(row.get('Description', ''))
            purchase_no = clean_text(row.get('PurchaseNo', ''), 10, 'PurchaseNo', row_number)
            purchase_date = convert_date(row.get('Date'))
            net_price = float(row.get('NetPrice')) if pd.notna(row.get('NetPrice')) else None
            cost = float(row.get('Cost')) if pd.notna(row.get('Cost')) else None
            supplying_plant = "" if pd.isna(row.get('SupplyingPlant')) else str(row.get('SupplyingPlant', ''))
            quantity = float(row.get('Quantity')) if pd.notna(row.get('Quantity')) else None
            currency = clean_text(row.get('Currency', ''), 10, 'Currency', row_number)
            unit = clean_text(row.get('Units', ''), 20, 'Units', row_number)

            if not plant_code or not material_code or not vendor_code or not purchase_date:
                logger.warning(
                    "Row %s skipped because required data is missing. plant_code=%s material_code=%s vendor_code=%s purchase_date=%s",
                    row_number,
                    bool(plant_code),
                    bool(material_code),
                    bool(vendor_code),
                    bool(purchase_date),
                )
                errors += 1
                continue

            if len(vendor_code) != VENDOR_CODE_LENGTH or not vendor_code.isdigit():
                logger.warning(
                    "Row %s skipped because VendorCode must be exactly %s digits. Value: '%s'",
                    row_number,
                    VENDOR_CODE_LENGTH,
                    vendor_code,
                )
                errors += 1
                continue

            cursor.execute(insert_sql, (
                plant_code, material_code, vendor_code, description,
                purchase_no, purchase_date, net_price, cost,
                supplying_plant, quantity, currency, unit
            ))

            records += 1
            if processed == 1 or processed % progress_interval == 0 or processed == total_rows:
                elapsed = time.perf_counter() - started_at
                logger.info(
                    "Migration progress: %s/%s rows processed, %s inserted, %s skipped, %.2f seconds elapsed",
                    processed,
                    total_rows,
                    records,
                    errors,
                    elapsed,
                )

        except Exception as e:
            errors += 1
            logger.exception("Row %s failed: %s", row_number, e)

    elapsed = time.perf_counter() - started_at
    logger.info(
        "Data migration finished in %.2f seconds. Inserted: %s, Skipped: %s",
        elapsed,
        records,
        errors,
    )

    return records


# =========================
# MAIN
# =========================

def main():
    logger.info("=" * 60)
    logger.info("Excel to PostgreSQL Migration Tool (Hardcoded)")
    logger.info("=" * 60)

    excel_file = EXCEL_FILE
    credentials = DB_CONFIG

    df = read_excel_file(excel_file)

    required_cols = [
        'PlantCode','MaterialCode','VendorCode','Date','Description',
        'PurchaseNo','NetPrice','Cost','SupplyingPlant','Quantity','Currency','Units'
    ]

    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        logger.error("Missing required columns: %s", missing)
        sys.exit(1)
    logger.info("Required column validation passed")

    conn, cursor = connect_postgres(credentials)

    try:
        drop_existing_table(cursor, credentials['table_name'])

        create_table(cursor, credentials['table_name'])
        create_indexes(cursor, credentials['table_name'])

        migrate_data(cursor, df, credentials['table_name'])

        logger.info("Committing transaction")
        conn.commit()
        logger.info("Transaction committed")

        logger.info("Migration completed successfully")

    except Error as e:
        logger.exception("Database migration failed. Rolling back transaction: %s", e)
        conn.rollback()
        sys.exit(1)
    except Exception as e:
        logger.exception("Migration failed. Rolling back transaction: %s", e)
        conn.rollback()
        sys.exit(1)

    finally:
        logger.info("Closing database connection")
        cursor.close()
        conn.close()
        logger.info("Database connection closed")


if __name__ == "__main__":
    main()
