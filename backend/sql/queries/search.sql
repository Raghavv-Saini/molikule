-- search.sql
-- Parameterised SELECT queries for all 7 filter combinations × 3 sort columns × 2 directions = 42 queries.
-- Each query supports an optional date range via nullable parameters using sqlc.narg().
-- LIMIT/OFFSET pagination is applied to every query.
--
-- Parameter layout per query:
--   Filter-only queries (single filter):
--     $1 = filter value
--     $2 = start_date (nullable date)
--     $3 = end_date   (nullable date)
--     $4 = limit
--     $5 = offset
--
--   Filter-only queries (two filters):
--     $1 = first filter value
--     $2 = second filter value
--     $3 = start_date (nullable date)
--     $4 = end_date   (nullable date)
--     $5 = limit
--     $6 = offset
--
--   Filter-only queries (three filters):
--     $1 = material_code
--     $2 = vendor_code
--     $3 = plant_code
--     $4 = start_date (nullable date)
--     $5 = end_date   (nullable date)
--     $6 = limit
--     $7 = offset
--
-- The handler selects the correct query based on the active filter set and the
-- requested sort_by + sort_order values (allowed-value switch in Go).
-- NULL start_date / end_date means "no lower / upper bound on purchase_date".

-- ============================================================
-- 1. MATERIAL ONLY
-- ============================================================

-- name: SearchByMaterialPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $2 OFFSET $3;

-- name: SearchByMaterialPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $2 OFFSET $3;

-- name: SearchByMaterialCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $2 OFFSET $3;

-- name: SearchByMaterialCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $2 OFFSET $3;

-- name: SearchByMaterialNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $2 OFFSET $3;

-- name: SearchByMaterialNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $2 OFFSET $3;

-- ============================================================
-- 2. VENDOR ONLY
-- ============================================================

-- name: SearchByVendorPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $2 OFFSET $3;

-- name: SearchByVendorPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $2 OFFSET $3;

-- name: SearchByVendorCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $2 OFFSET $3;

-- name: SearchByVendorCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $2 OFFSET $3;

-- name: SearchByVendorNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $2 OFFSET $3;

-- name: SearchByVendorNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $2 OFFSET $3;

-- ============================================================
-- 3. PLANT ONLY
-- ============================================================

-- name: SearchByPlantPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $2 OFFSET $3;

-- name: SearchByPlantPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $2 OFFSET $3;

-- name: SearchByPlantCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $2 OFFSET $3;

-- name: SearchByPlantCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $2 OFFSET $3;

-- name: SearchByPlantNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $2 OFFSET $3;

-- name: SearchByPlantNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $2 OFFSET $3;

-- ============================================================
-- 4. MATERIAL + VENDOR
-- ============================================================

-- name: SearchByMaterialVendorPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialVendorPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialVendorCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialVendorCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialVendorNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialVendorNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $3 OFFSET $4;

-- ============================================================
-- 5. MATERIAL + PLANT
-- ============================================================

-- name: SearchByMaterialPlantPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialPlantPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialPlantCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialPlantCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialPlantNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $3 OFFSET $4;

-- name: SearchByMaterialPlantNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $3 OFFSET $4;

-- ============================================================
-- 6. VENDOR + PLANT
-- ============================================================

-- name: SearchByVendorPlantPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $3 OFFSET $4;

-- name: SearchByVendorPlantPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $3 OFFSET $4;

-- name: SearchByVendorPlantCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $3 OFFSET $4;

-- name: SearchByVendorPlantCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $3 OFFSET $4;

-- name: SearchByVendorPlantNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $3 OFFSET $4;

-- name: SearchByVendorPlantNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $3 OFFSET $4;

-- ============================================================
-- 7. MATERIAL + VENDOR + PLANT
-- ============================================================

-- name: SearchByMaterialVendorPlantPurchaseDateAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date ASC
LIMIT $4 OFFSET $5;

-- name: SearchByMaterialVendorPlantPurchaseDateDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY purchase_date DESC
LIMIT $4 OFFSET $5;

-- name: SearchByMaterialVendorPlantCostAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost ASC
LIMIT $4 OFFSET $5;

-- name: SearchByMaterialVendorPlantCostDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY cost DESC
LIMIT $4 OFFSET $5;

-- name: SearchByMaterialVendorPlantNetPriceAsc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price ASC
LIMIT $4 OFFSET $5;

-- name: SearchByMaterialVendorPlantNetPriceDesc :many
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date)
ORDER BY net_price DESC
LIMIT $4 OFFSET $5;
