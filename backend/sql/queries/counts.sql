-- counts.sql
-- COUNT(*) queries matching each of the 7 filter combinations in search.sql.
-- Used by the search handler to compute pagination metadata (total_records,
-- total_pages) without fetching the full result set.
--
-- Parameter layout mirrors search.sql exactly — only LIMIT/OFFSET and ORDER BY
-- are omitted, since COUNT(*) returns a single row.
--
--   Single-filter queries:
--     $1 = filter value
--     sqlc.narg('start_date') = optional lower bound on purchase_date
--     sqlc.narg('end_date')   = optional upper bound on purchase_date
--
--   Two-filter queries:
--     $1 = first filter value
--     $2 = second filter value
--     sqlc.narg('start_date'), sqlc.narg('end_date')
--
--   Three-filter query:
--     $1 = material_code
--     $2 = vendor_code
--     $3 = plant_code
--     sqlc.narg('start_date'), sqlc.narg('end_date')

-- ============================================================
-- 1. MATERIAL ONLY
-- ============================================================

-- name: CountByMaterial :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- 2. VENDOR ONLY
-- ============================================================

-- name: CountByVendor :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- 3. PLANT ONLY
-- ============================================================

-- name: CountByPlant :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- 4. MATERIAL + VENDOR
-- ============================================================

-- name: CountByMaterialVendor :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- 5. MATERIAL + PLANT
-- ============================================================

-- name: CountByMaterialPlant :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- 6. VENDOR + PLANT
-- ============================================================

-- name: CountByVendorPlant :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- 7. MATERIAL + VENDOR + PLANT
-- ============================================================

-- name: CountByMaterialVendorPlant :one
SELECT COUNT(*) AS total
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);
