package db

import (
	"context"
	"database/sql"
	"fmt"
)

type CountByDateRangeParams struct {
	StartDate sql.NullTime `json:"start_date"`
	EndDate   sql.NullTime `json:"end_date"`
}

func (q *Queries) CountByDateRange(ctx context.Context, arg CountByDateRangeParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, `
SELECT COUNT(*) AS total
FROM purchase_records
WHERE ($1::date IS NULL OR purchase_date >= $1::date)
  AND ($2::date IS NULL OR purchase_date <= $2::date)
`, arg.StartDate, arg.EndDate)
	var total int64
	err := row.Scan(&total)
	return total, err
}

type SearchByDateRangeParams struct {
	StartDate sql.NullTime `json:"start_date"`
	EndDate   sql.NullTime `json:"end_date"`
	Limit     int32        `json:"limit"`
	Offset    int32        `json:"offset"`
}

func (q *Queries) SearchByDateRange(ctx context.Context, arg SearchByDateRangeParams, sortBy, sortOrder string) ([]PurchaseRecord, error) {
	orderBy, err := dateRangeOrderBy(sortBy, sortOrder)
	if err != nil {
		return nil, err
	}

	rows, err := q.db.QueryContext(ctx, fmt.Sprintf(`
SELECT id, plant_code, material_code, vendor_code, description,
       purchase_no, purchase_date, net_price, cost,
       supplying_plant, quantity, currency, unit
FROM purchase_records
WHERE ($1::date IS NULL OR purchase_date >= $1::date)
  AND ($2::date IS NULL OR purchase_date <= $2::date)
ORDER BY %s
LIMIT $3 OFFSET $4
`, orderBy), arg.StartDate, arg.EndDate, arg.Limit, arg.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PurchaseRecord
	for rows.Next() {
		var i PurchaseRecord
		if err := rows.Scan(
			&i.ID,
			&i.PlantCode,
			&i.MaterialCode,
			&i.VendorCode,
			&i.Description,
			&i.PurchaseNo,
			&i.PurchaseDate,
			&i.NetPrice,
			&i.Cost,
			&i.SupplyingPlant,
			&i.Quantity,
			&i.Currency,
			&i.Unit,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

type SummaryDateRangeParams struct {
	StartDate sql.NullTime `json:"start_date"`
	EndDate   sql.NullTime `json:"end_date"`
}

type SummaryDateRangeRow struct {
	RecordsFound       int64       `json:"records_found"`
	TotalCost          int64       `json:"total_cost"`
	AvgCost            float64     `json:"avg_cost"`
	AvgNetPrice        float64     `json:"avg_net_price"`
	MinCost            interface{} `json:"min_cost"`
	MaxCost            interface{} `json:"max_cost"`
	PurchaseOrderCount int64       `json:"purchase_order_count"`
	EarliestDate       interface{} `json:"earliest_date"`
	LatestDate         interface{} `json:"latest_date"`
	Currencies         interface{} `json:"currencies"`
	Units              interface{} `json:"units"`
}

func (q *Queries) SummaryDateRange(ctx context.Context, arg SummaryDateRangeParams) (SummaryDateRangeRow, error) {
	row := q.db.QueryRowContext(ctx, `
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
WHERE ($1::date IS NULL OR purchase_date >= $1::date)
  AND ($2::date IS NULL OR purchase_date <= $2::date)
`, arg.StartDate, arg.EndDate)

	var i SummaryDateRangeRow
	err := row.Scan(
		&i.RecordsFound,
		&i.TotalCost,
		&i.AvgCost,
		&i.AvgNetPrice,
		&i.MinCost,
		&i.MaxCost,
		&i.PurchaseOrderCount,
		&i.EarliestDate,
		&i.LatestDate,
		&i.Currencies,
		&i.Units,
	)
	return i, err
}

func dateRangeOrderBy(sortBy, sortOrder string) (string, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return "purchase_date ASC", nil
	case "purchase_date_desc":
		return "purchase_date DESC", nil
	case "cost_asc":
		return "cost ASC", nil
	case "cost_desc":
		return "cost DESC", nil
	case "net_price_asc":
		return "net_price ASC", nil
	case "net_price_desc":
		return "net_price DESC", nil
	default:
		return "", fmt.Errorf("unsupported date range sort: %s_%s", sortBy, sortOrder)
	}
}
