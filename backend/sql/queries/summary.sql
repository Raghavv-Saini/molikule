-- summary.sql
-- Aggregate summary queries for each of the 7 filter combinations.
-- Each query returns a single row with core aggregate metrics.
--
-- Core metrics returned by all summary queries:
--   COUNT(*)                       AS records_found
--   SUM(cost)                      AS total_cost
--   AVG(cost)                      AS avg_cost
--   AVG(net_price)                 AS avg_net_price
--   MIN(cost)                      AS min_cost
--   MAX(cost)                      AS max_cost
--   COUNT(DISTINCT purchase_no)    AS purchase_order_count
--   MIN(purchase_date)             AS earliest_date
--   MAX(purchase_date)             AS latest_date
--   array_agg(DISTINCT currency)   AS currencies
--   array_agg(DISTINCT unit)       AS units
--
-- Parameter layout mirrors counts.sql exactly:
--   Single-filter:  $1 = filter value; sqlc.narg('start_date'), sqlc.narg('end_date')
--   Two-filter:     $1, $2 = filter values; sqlc.narg('start_date'), sqlc.narg('end_date')
--   Three-filter:   $1 = material_code, $2 = vendor_code, $3 = plant_code; sqlc.narg dates
--
-- Sub-summary queries provide per-entity breakdowns when a specific filter is present.
-- "Last purchase cost" is retrieved via a correlated subquery ordered by purchase_date DESC.
--
-- Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

-- ============================================================
-- SECTION A: CORE SUMMARY QUERIES (7 filter combinations × 2 date variants = 14)
-- ============================================================

-- ============================================================
-- A.1 MATERIAL ONLY
-- ============================================================

-- name: SummaryMaterial :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- A.2 VENDOR ONLY
-- ============================================================

-- name: SummaryVendor :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- A.3 PLANT ONLY
-- ============================================================

-- name: SummaryPlant :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- A.4 MATERIAL + VENDOR
-- ============================================================

-- name: SummaryMaterialVendor :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- A.5 MATERIAL + PLANT
-- ============================================================

-- name: SummaryMaterialPlant :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE material_code = $1
  AND plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- A.6 VENDOR + PLANT
-- ============================================================

-- name: SummaryVendorPlant :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE vendor_code = $1
  AND plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- A.7 MATERIAL + VENDOR + PLANT
-- ============================================================

-- name: SummaryMaterialVendorPlant :one
SELECT
    COUNT(*)                        AS records_found,
    ROUND(SUM(cost))::BIGINT        AS total_cost,
    AVG(cost)                       AS avg_cost,
    AVG(net_price)                  AS avg_net_price,
    MIN(cost)                       AS min_cost,
    MAX(cost)                       AS max_cost,
    COUNT(DISTINCT purchase_no)     AS purchase_order_count,
    MIN(purchase_date)              AS earliest_date,
    MAX(purchase_date)              AS latest_date,
    array_agg(DISTINCT currency)    AS currencies,
    array_agg(DISTINCT unit)        AS units
FROM purchase_records
WHERE material_code = $1
  AND vendor_code   = $2
  AND plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR purchase_date <= sqlc.narg('end_date')::date);

-- ============================================================
-- SECTION B: VENDOR SUB-SUMMARY QUERIES
-- Returns per-vendor aggregate metrics.
-- Returned columns: vendor_code, avg_cost, avg_net_price, last_purchase_cost,
--   min_cost, distinct_material_count, distinct_plant_count,
--   purchase_order_count, currencies, units, earliest_date, latest_date
-- ============================================================

-- ============================================================
-- B.1 VENDOR ONLY
-- ============================================================

-- name: VendorSubSummaryVendor :one
SELECT
    pr.vendor_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.vendor_code = $1
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.vendor_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.vendor_code;

-- ============================================================
-- B.2 MATERIAL + VENDOR
-- ============================================================

-- name: VendorSubSummaryMaterialVendor :one
SELECT
    pr.vendor_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.vendor_code   = $2
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.vendor_code;

-- ============================================================
-- B.3 VENDOR + PLANT
-- ============================================================

-- name: VendorSubSummaryVendorPlant :one
SELECT
    pr.vendor_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.vendor_code = $1
       AND sub.plant_code  = $2
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.vendor_code = $1
  AND pr.plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.vendor_code;

-- ============================================================
-- B.4 MATERIAL + VENDOR + PLANT
-- ============================================================

-- name: VendorSubSummaryMaterialVendorPlant :one
SELECT
    pr.vendor_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.vendor_code   = $2
       AND sub.plant_code    = $3
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.vendor_code   = $2
  AND pr.plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.vendor_code;

-- ============================================================
-- SECTION C: MATERIAL SUB-SUMMARY QUERIES
-- Returns per-material aggregate metrics including description.
-- Returned columns: material_code, description, total_ordered_quantity,
--   last_purchase_price, distinct_vendor_count, distinct_plant_count,
--   purchase_order_count, currencies, units, earliest_date, latest_date
-- ============================================================

-- ============================================================
-- C.1 MATERIAL ONLY
-- ============================================================

-- name: MaterialSubSummaryMaterial :one
SELECT
    pr.material_code,
    MAX(pr.description)                                                    AS description,
    SUM(pr.quantity)::text                                                 AS total_ordered_quantity,
    (SELECT sub.net_price FROM purchase_records sub
     WHERE sub.material_code = $1
       AND (sqlc.narg('start_date')::date IS NULL OR sub.purchase_date >= sqlc.narg('start_date')::date)
       AND (sqlc.narg('end_date')::date   IS NULL OR sub.purchase_date <= sqlc.narg('end_date')::date)
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_price,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.material_code;

-- ============================================================
-- C.2 MATERIAL + VENDOR
-- ============================================================

-- name: MaterialSubSummaryMaterialVendor :one
SELECT
    pr.material_code,
    MAX(pr.description)                                                    AS description,
    SUM(pr.quantity)::text                                                 AS total_ordered_quantity,
    (SELECT sub.net_price FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.vendor_code   = $2
       AND (sqlc.narg('start_date')::date IS NULL OR sub.purchase_date >= sqlc.narg('start_date')::date)
       AND (sqlc.narg('end_date')::date   IS NULL OR sub.purchase_date <= sqlc.narg('end_date')::date)
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_price,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.vendor_code   = $2
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.material_code;

-- ============================================================
-- C.3 MATERIAL + PLANT
-- ============================================================

-- name: MaterialSubSummaryMaterialPlant :one
SELECT
    pr.material_code,
    MAX(pr.description)                                                    AS description,
    SUM(pr.quantity)::text                                                 AS total_ordered_quantity,
    (SELECT sub.net_price FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.plant_code    = $2
       AND (sqlc.narg('start_date')::date IS NULL OR sub.purchase_date >= sqlc.narg('start_date')::date)
       AND (sqlc.narg('end_date')::date   IS NULL OR sub.purchase_date <= sqlc.narg('end_date')::date)
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_price,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.material_code;

-- ============================================================
-- C.4 MATERIAL + VENDOR + PLANT
-- ============================================================

-- name: MaterialSubSummaryMaterialVendorPlant :one
SELECT
    pr.material_code,
    MAX(pr.description)                                                    AS description,
    SUM(pr.quantity)::text                                                 AS total_ordered_quantity,
    (SELECT sub.net_price FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.vendor_code   = $2
       AND sub.plant_code    = $3
       AND (sqlc.narg('start_date')::date IS NULL OR sub.purchase_date >= sqlc.narg('start_date')::date)
       AND (sqlc.narg('end_date')::date   IS NULL OR sub.purchase_date <= sqlc.narg('end_date')::date)
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_price,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.plant_code)                                          AS distinct_plant_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.vendor_code   = $2
  AND pr.plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.material_code;

-- ============================================================
-- SECTION D: PLANT SUB-SUMMARY QUERIES
-- Returns per-plant aggregate metrics.
-- Returned columns: plant_code, avg_cost, avg_net_price, last_purchase_cost,
--   min_cost, distinct_vendor_count, distinct_material_count,
--   purchase_order_count, currencies, units, earliest_date, latest_date
-- ============================================================

-- ============================================================
-- D.1 PLANT ONLY
-- ============================================================

-- name: PlantSubSummaryPlant :one
SELECT
    pr.plant_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.plant_code = $1
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.plant_code = $1
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.plant_code;

-- ============================================================
-- D.2 MATERIAL + PLANT
-- ============================================================

-- name: PlantSubSummaryMaterialPlant :one
SELECT
    pr.plant_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.plant_code    = $2
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.plant_code    = $2
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.plant_code;

-- ============================================================
-- D.3 VENDOR + PLANT
-- ============================================================

-- name: PlantSubSummaryVendorPlant :one
SELECT
    pr.plant_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.vendor_code = $1
       AND sub.plant_code  = $2
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.vendor_code = $1
  AND pr.plant_code  = $2
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.plant_code;

-- ============================================================
-- D.4 MATERIAL + VENDOR + PLANT
-- ============================================================

-- name: PlantSubSummaryMaterialVendorPlant :one
SELECT
    pr.plant_code,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.vendor_code   = $2
       AND sub.plant_code    = $3
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    MIN(pr.cost)                                                           AS min_cost,
    COUNT(DISTINCT pr.vendor_code)                                         AS distinct_vendor_count,
    COUNT(DISTINCT pr.material_code)                                       AS distinct_material_count,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units,
    MIN(pr.purchase_date)                                                  AS earliest_date,
    MAX(pr.purchase_date)                                                  AS latest_date
FROM purchase_records pr
WHERE pr.material_code = $1
  AND pr.vendor_code   = $2
  AND pr.plant_code    = $3
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.plant_code;

-- ============================================================
-- SECTION E: MATERIAL VENDOR COMPARISON
-- Returns per-vendor metrics for material-code searches.
-- ============================================================

-- name: VendorComparisonByMaterial :many
SELECT
    pr.vendor_code,
    MIN(NULLIF(pr.supplying_plant, ''))                                    AS supplier_name,
    AVG(pr.cost)                                                           AS avg_cost,
    AVG(pr.net_price)                                                      AS avg_net_price,
    MIN(pr.cost)                                                           AS min_cost,
    (SELECT sub.cost FROM purchase_records sub
     WHERE sub.material_code = $1
       AND sub.vendor_code   = pr.vendor_code
       AND (sqlc.narg('vendor_code')::text IS NULL OR sub.vendor_code = sqlc.narg('vendor_code')::text)
       AND (sqlc.narg('plant_code')::text  IS NULL OR sub.plant_code  = sqlc.narg('plant_code')::text)
       AND (sqlc.narg('start_date')::date IS NULL OR sub.purchase_date >= sqlc.narg('start_date')::date)
       AND (sqlc.narg('end_date')::date   IS NULL OR sub.purchase_date <= sqlc.narg('end_date')::date)
     ORDER BY sub.purchase_date DESC, sub.id DESC LIMIT 1)                AS last_purchase_cost,
    COUNT(DISTINCT pr.purchase_no)                                         AS purchase_order_count,
    COUNT(*)                                                              AS record_count,
    array_agg(DISTINCT pr.currency)                                        AS currencies,
    array_agg(DISTINCT pr.unit)                                            AS units
FROM purchase_records pr
WHERE pr.material_code = $1
  AND (sqlc.narg('vendor_code')::text IS NULL OR pr.vendor_code = sqlc.narg('vendor_code')::text)
  AND (sqlc.narg('plant_code')::text  IS NULL OR pr.plant_code  = sqlc.narg('plant_code')::text)
  AND (sqlc.narg('start_date')::date IS NULL OR pr.purchase_date >= sqlc.narg('start_date')::date)
  AND (sqlc.narg('end_date')::date   IS NULL OR pr.purchase_date <= sqlc.narg('end_date')::date)
GROUP BY pr.vendor_code
ORDER BY AVG(pr.cost) ASC NULLS LAST, AVG(pr.net_price) ASC NULLS LAST, pr.vendor_code ASC;
