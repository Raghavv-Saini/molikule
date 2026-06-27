#!/usr/bin/env python3
"""
Excel to PostgreSQL Migration Script
Reads material data from Excel and imports it into PostgreSQL database
"""

import psycopg2
from psycopg2 import sql, Error
import pandas as pd
import os
import sys
from datetime import datetime


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

EXCEL_FILE = "Materials_Database.xlsx"
# Example: r"C:\Users\YourName\Documents\Materials_Database.xlsx"


# =========================
# FUNCTIONS
# =========================

def read_excel_file(filepath):
    print(f"\nReading Excel file: {filepath}")
    try:
        df = pd.read_excel(filepath)
        print(f"✓ Successfully read {len(df)} rows from Excel")
        return df
    except FileNotFoundError:
        print(f"Error: File '{filepath}' not found!")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        sys.exit(1)


def connect_postgres(credentials):
    try:
        conn = psycopg2.connect(
            host=credentials['host'],
            port=credentials['port'],
            user=credentials['user'],
            password=credentials['password'],
            database=credentials['database']
        )
        cursor = conn.cursor()
        print(f"✓ Connected to PostgreSQL ({credentials['host']}:{credentials['port']})")
        return conn, cursor
    except Error as e:
        print(f"Error connecting to PostgreSQL: {e}")
        sys.exit(1)


def drop_existing_table(cursor, table_name):
    try:
        cursor.execute(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s);",
            (table_name,)
        )
        if cursor.fetchone()[0]:
            cursor.execute(
                sql.SQL("DROP TABLE IF EXISTS {} CASCADE;").format(sql.Identifier(table_name))
            )
            print(f"✓ Dropped existing table '{table_name}'")
        return True
    except Error as e:
        print(f"Error checking table existence: {e}")
        return False


def create_table(cursor, table_name):
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
    print(f"✓ Created table '{table_name}'")


def create_indexes(cursor, table_name):
    indexes = [
        (f"idx_{table_name}_material_code", "(material_code)"),
        (f"idx_{table_name}_vendor_code", "(vendor_code)"),
        (f"idx_{table_name}_plant_code", "(plant_code)"),
        (f"idx_{table_name}_purchase_date", "(purchase_date)")
    ]

    for idx_name, idx_columns in indexes:
        cursor.execute(
            sql.SQL("CREATE INDEX {} ON {} {}").format(
                sql.Identifier(idx_name),
                sql.Identifier(table_name),
                sql.SQL(idx_columns)
            )
        )

    print(f"✓ Created {len(indexes)} indexes")


def convert_date(date_str):
    if pd.isna(date_str):
        return None
    try:
        if isinstance(date_str, str):
            return pd.to_datetime(date_str, format='%d.%m.%Y').date()
        return pd.to_datetime(date_str).date()
    except:
        return None


def migrate_data(cursor, df, table_name):
    insert_sql = sql.SQL("""
    INSERT INTO {table} 
    (plant_code, material_code, vendor_code, description, purchase_no, 
     purchase_date, net_price, cost, supplying_plant, quantity, currency, unit)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """).format(table=sql.Identifier(table_name))

    records = 0
    errors = 0

    for idx, row in df.iterrows():
        try:
            plant_code = str(row.get('PlantCode', '')).strip()[:4]
            material_code = str(row.get('MaterialCode', '')).strip()[:8]
            vendor_code = str(row.get('VendorCode', '')).strip()[:6]
            description = str(row.get('Description', ''))
            purchase_no = str(row.get('PurchaseNo', '')).strip()[:10]
            purchase_date = convert_date(row.get('Date'))
            net_price = float(row.get('NetPrice')) if pd.notna(row.get('NetPrice')) else None
            cost = float(row.get('Cost')) if pd.notna(row.get('Cost')) else None
            supplying_plant = str(row.get('SupplyingPlant', ''))
            quantity = float(row.get('Quantity')) if pd.notna(row.get('Quantity')) else None
            currency = str(row.get('Currency', '')).strip()[:10]
            unit = str(row.get('Units', '')).strip()[:20]

            if not plant_code or not material_code or not vendor_code or not purchase_date:
                errors += 1
                continue

            cursor.execute(insert_sql, (
                plant_code, material_code, vendor_code, description,
                purchase_no, purchase_date, net_price, cost,
                supplying_plant, quantity, currency, unit
            ))

            records += 1

        except Exception as e:
            errors += 1
            print(f"Row {idx+2} error: {e}")

    print(f"\n✓ Inserted {records} records")
    print(f"⚠ Skipped {errors} records")

    return records


# =========================
# MAIN
# =========================

def main():
    print("\n" + "█"*60)
    print("  Excel to PostgreSQL Migration Tool (Hardcoded)")
    print("█"*60)

    excel_file = EXCEL_FILE
    credentials = DB_CONFIG

    df = read_excel_file(excel_file)

    required_cols = [
        'PlantCode','MaterialCode','VendorCode','Date','Description',
        'PurchaseNo','NetPrice','Cost','SupplyingPlant','Quantity','Currency','Units'
    ]

    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print(f"Missing columns: {missing}")
        sys.exit(1)

    conn, cursor = connect_postgres(credentials)

    try:
        drop_existing_table(cursor, credentials['table_name'])

        print("\nCreating table...")
        create_table(cursor, credentials['table_name'])
        create_indexes(cursor, credentials['table_name'])

        print("\nMigrating data...")
        migrate_data(cursor, df, credentials['table_name'])

        conn.commit()

        print("\n✓ Migration completed successfully!")

    except Error as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        sys.exit(1)

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
