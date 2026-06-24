package search

import (
	"context"
	"database/sql"
	"regexp"
	"time"

	"github.com/gofiber/fiber/v2"

	"molikule/backend/db"
	"molikule/backend/internal/models"
)

var (
	materialCodeRegex = regexp.MustCompile(`^\d{8}$`)
	vendorCodeRegex   = regexp.MustCompile(`^\d{8}$`)
	plantCodeRegex    = regexp.MustCompile(`^[a-zA-Z0-9]{4}$`)
)

// SearchRequest is the expected JSON body for POST /api/search.
type SearchRequest struct {
	MaterialCode *string `json:"material_code"`
	VendorCode   *string `json:"vendor_code"`
	PlantCode    *string `json:"plant_code"`
	StartDate    *string `json:"start_date"`
	EndDate      *string `json:"end_date"`
	Page         int     `json:"page"`
	PageSize     int     `json:"page_size"`
	SortBy       string  `json:"sort_by"`
	SortOrder    string  `json:"sort_order"`
}

// paginationResponse is the pagination section of the response.
type paginationResponse struct {
	Page         int   `json:"page"`
	PageSize     int   `json:"page_size"`
	TotalRecords int64 `json:"total_records"`
	TotalPages   int64 `json:"total_pages"`
}

// summaryResponse is the summary section of the response.
type summaryResponse struct {
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
	MaterialSummary    interface{} `json:"material_summary"`
	VendorSummary      interface{} `json:"vendor_summary"`
	PlantSummary       interface{} `json:"plant_summary"`
}

// searchResponse is the full JSON body returned by the search endpoint.
type searchResponse struct {
	Summary    *summaryResponse    `json:"summary"`
	Records    []db.PurchaseRecord `json:"records"`
	Pagination paginationResponse  `json:"pagination"`
}

// parseNullableDate converts an optional date string (YYYY-MM-DD) to sql.NullTime.
func parseNullableDate(s *string) (sql.NullTime, error) {
	if s == nil || *s == "" {
		return sql.NullTime{Valid: false}, nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return sql.NullTime{}, err
	}
	return sql.NullTime{Time: t, Valid: true}, nil
}

// ceilDiv computes ⌈a/b⌉ for positive integers.
func ceilDiv(a, b int64) int64 {
	if b == 0 {
		return 0
	}
	return (a + b - 1) / b
}

// SearchHandler validates the request, dispatches the right SQLC queries, and
// returns the combined JSON response.
func SearchHandler(queries *db.Queries) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// ── 1. Parse request body ────────────────────────────────────────────
		var req SearchRequest
		if err := c.BodyParser(&req); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		}

		// ── 2. Validate filter presence ──────────────────────────────────────
		hasMat := req.MaterialCode != nil && *req.MaterialCode != ""
		hasVen := req.VendorCode != nil && *req.VendorCode != ""
		hasPla := req.PlantCode != nil && *req.PlantCode != ""

		hasStartDate := req.StartDate != nil && *req.StartDate != ""
		hasEndDate := req.EndDate != nil && *req.EndDate != ""

		if !hasMat && !hasVen && !hasPla && !hasStartDate && !hasEndDate {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"at least one of material_code, vendor_code, plant_code, start_date, or end_date is required")
		}

		// ── 3. Validate code formats ─────────────────────────────────────────
		if hasMat && !materialCodeRegex.MatchString(*req.MaterialCode) {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"material_code must be exactly 8 numeric digits")
		}
		if hasVen && !vendorCodeRegex.MatchString(*req.VendorCode) {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"vendor_code must be exactly 8 numeric digits")
		}
		if hasPla && !plantCodeRegex.MatchString(*req.PlantCode) {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"plant_code must be exactly 4 alphanumeric characters")
		}

		// ── 4. Validate sort_by / sort_order ─────────────────────────────────
		if req.SortBy != "" && req.SortBy != "purchase_date" && req.SortBy != "cost" && req.SortBy != "net_price" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"sort_by must be one of: purchase_date, cost, net_price")
		}
		if req.SortOrder != "" && req.SortOrder != "asc" && req.SortOrder != "desc" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"sort_order must be one of: asc, desc")
		}

		// Apply defaults for sort
		if req.SortBy == "" {
			req.SortBy = "purchase_date"
		}
		if req.SortOrder == "" {
			req.SortOrder = "desc"
		}

		// ── 5. Validate pagination ────────────────────────────────────────────
		if req.Page < 1 {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"page must be at least 1")
		}
		if req.PageSize == 0 {
			req.PageSize = 50
		}
		if req.PageSize < 1 || req.PageSize > 200 {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"page_size must be between 1 and 200")
		}

		// ── 6. Parse dates ────────────────────────────────────────────────────
		startDate, err := parseNullableDate(req.StartDate)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"start_date must be in YYYY-MM-DD format")
		}
		endDate, err := parseNullableDate(req.EndDate)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"end_date must be in YYYY-MM-DD format")
		}
		if startDate.Valid && endDate.Valid && endDate.Time.Before(startDate.Time) {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR",
				"end_date must be on or after start_date")
		}

		ctx := c.Context()
		limit := int32(req.PageSize)
		offset := int32((req.Page - 1) * req.PageSize)

		// ── 7. COUNT query ────────────────────────────────────────────────────
		var totalRecords int64

		switch {
		case !hasMat && !hasVen && !hasPla:
			totalRecords, err = queries.CountByDateRange(ctx, db.CountByDateRangeParams{
				StartDate: startDate,
				EndDate:   endDate,
			})
		case hasMat && !hasVen && !hasPla:
			totalRecords, err = queries.CountByMaterial(ctx, db.CountByMaterialParams{
				MaterialCode: *req.MaterialCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
		case !hasMat && hasVen && !hasPla:
			totalRecords, err = queries.CountByVendor(ctx, db.CountByVendorParams{
				VendorCode: *req.VendorCode,
				StartDate:  startDate,
				EndDate:    endDate,
			})
		case !hasMat && !hasVen && hasPla:
			totalRecords, err = queries.CountByPlant(ctx, db.CountByPlantParams{
				PlantCode: *req.PlantCode,
				StartDate: startDate,
				EndDate:   endDate,
			})
		case hasMat && hasVen && !hasPla:
			totalRecords, err = queries.CountByMaterialVendor(ctx, db.CountByMaterialVendorParams{
				MaterialCode: *req.MaterialCode,
				VendorCode:   *req.VendorCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
		case hasMat && !hasVen && hasPla:
			totalRecords, err = queries.CountByMaterialPlant(ctx, db.CountByMaterialPlantParams{
				MaterialCode: *req.MaterialCode,
				PlantCode:    *req.PlantCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
		case !hasMat && hasVen && hasPla:
			totalRecords, err = queries.CountByVendorPlant(ctx, db.CountByVendorPlantParams{
				VendorCode: *req.VendorCode,
				PlantCode:  *req.PlantCode,
				StartDate:  startDate,
				EndDate:    endDate,
			})
		default: // hasMat && hasVen && hasPla
			totalRecords, err = queries.CountByMaterialVendorPlant(ctx, db.CountByMaterialVendorPlantParams{
				MaterialCode: *req.MaterialCode,
				VendorCode:   *req.VendorCode,
				PlantCode:    *req.PlantCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
		}
		if err != nil {
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "count query failed")
		}

		// ── 8. Return empty result when count = 0 ─────────────────────────────
		if totalRecords == 0 {
			return c.Status(fiber.StatusOK).JSON(searchResponse{
				Summary: nil,
				Records: []db.PurchaseRecord{},
				Pagination: paginationResponse{
					Page:         req.Page,
					PageSize:     req.PageSize,
					TotalRecords: 0,
					TotalPages:   0,
				},
			})
		}

		// ── 9. Search (records) query ─────────────────────────────────────────
		var records []db.PurchaseRecord

		switch {
		case !hasMat && !hasVen && !hasPla:
			records, err = queries.SearchByDateRange(ctx, db.SearchByDateRangeParams{
				StartDate: startDate,
				EndDate:   endDate,
				Limit:     limit,
				Offset:    offset,
			}, req.SortBy, req.SortOrder)
		case hasMat && !hasVen && !hasPla:
			records, err = searchMaterial(ctx, queries, *req.MaterialCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		case !hasMat && hasVen && !hasPla:
			records, err = searchVendor(ctx, queries, *req.VendorCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		case !hasMat && !hasVen && hasPla:
			records, err = searchPlant(ctx, queries, *req.PlantCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		case hasMat && hasVen && !hasPla:
			records, err = searchMaterialVendor(ctx, queries, *req.MaterialCode, *req.VendorCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		case hasMat && !hasVen && hasPla:
			records, err = searchMaterialPlant(ctx, queries, *req.MaterialCode, *req.PlantCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		case !hasMat && hasVen && hasPla:
			records, err = searchVendorPlant(ctx, queries, *req.VendorCode, *req.PlantCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		default:
			records, err = searchMaterialVendorPlant(ctx, queries, *req.MaterialCode, *req.VendorCode, *req.PlantCode, req.SortBy, req.SortOrder, limit, offset, startDate, endDate)
		}
		if err != nil {
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "search query failed")
		}
		if records == nil {
			records = []db.PurchaseRecord{}
		}

		// ── 10. Summary query ─────────────────────────────────────────────────
		var sumRow summaryResponse

		switch {
		case !hasMat && !hasVen && !hasPla:
			row, e := queries.SummaryDateRange(ctx, db.SummaryDateRangeParams{
				StartDate: startDate,
				EndDate:   endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		case hasMat && !hasVen && !hasPla:
			row, e := queries.SummaryMaterial(ctx, db.SummaryMaterialParams{
				MaterialCode: *req.MaterialCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		case !hasMat && hasVen && !hasPla:
			row, e := queries.SummaryVendor(ctx, db.SummaryVendorParams{
				VendorCode: *req.VendorCode,
				StartDate:  startDate,
				EndDate:    endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		case !hasMat && !hasVen && hasPla:
			row, e := queries.SummaryPlant(ctx, db.SummaryPlantParams{
				PlantCode: *req.PlantCode,
				StartDate: startDate,
				EndDate:   endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		case hasMat && hasVen && !hasPla:
			row, e := queries.SummaryMaterialVendor(ctx, db.SummaryMaterialVendorParams{
				MaterialCode: *req.MaterialCode,
				VendorCode:   *req.VendorCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		case hasMat && !hasVen && hasPla:
			row, e := queries.SummaryMaterialPlant(ctx, db.SummaryMaterialPlantParams{
				MaterialCode: *req.MaterialCode,
				PlantCode:    *req.PlantCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		case !hasMat && hasVen && hasPla:
			row, e := queries.SummaryVendorPlant(ctx, db.SummaryVendorPlantParams{
				VendorCode: *req.VendorCode,
				PlantCode:  *req.PlantCode,
				StartDate:  startDate,
				EndDate:    endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		default: // hasMat && hasVen && hasPla
			row, e := queries.SummaryMaterialVendorPlant(ctx, db.SummaryMaterialVendorPlantParams{
				MaterialCode: *req.MaterialCode,
				VendorCode:   *req.VendorCode,
				PlantCode:    *req.PlantCode,
				StartDate:    startDate,
				EndDate:      endDate,
			})
			if e != nil {
				return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "summary query failed")
			}
			sumRow = summaryResponse{
				RecordsFound:       row.RecordsFound,
				TotalCost:          row.TotalCost,
				AvgCost:            row.AvgCost,
				AvgNetPrice:        row.AvgNetPrice,
				MinCost:            row.MinCost,
				MaxCost:            row.MaxCost,
				PurchaseOrderCount: row.PurchaseOrderCount,
				EarliestDate:       row.EarliestDate,
				LatestDate:         row.LatestDate,
				Currencies:         row.Currencies,
				Units:              row.Units,
			}
		}

		// ── 11. Sub-summary queries (material, vendor, plant) ─────────────────

		// Material sub-summary: call when material_code is present
		if hasMat {
			var msRow interface{}
			switch {
			case hasMat && !hasVen && !hasPla:
				r, e := queries.MaterialSubSummaryMaterial(ctx, db.MaterialSubSummaryMaterialParams{
					MaterialCode: *req.MaterialCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					msRow = r
				}
			case hasMat && hasVen && !hasPla:
				r, e := queries.MaterialSubSummaryMaterialVendor(ctx, db.MaterialSubSummaryMaterialVendorParams{
					MaterialCode: *req.MaterialCode,
					VendorCode:   *req.VendorCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					msRow = r
				}
			case hasMat && !hasVen && hasPla:
				r, e := queries.MaterialSubSummaryMaterialPlant(ctx, db.MaterialSubSummaryMaterialPlantParams{
					MaterialCode: *req.MaterialCode,
					PlantCode:    *req.PlantCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					msRow = r
				}
			case hasMat && hasVen && hasPla:
				r, e := queries.MaterialSubSummaryMaterialVendorPlant(ctx, db.MaterialSubSummaryMaterialVendorPlantParams{
					MaterialCode: *req.MaterialCode,
					VendorCode:   *req.VendorCode,
					PlantCode:    *req.PlantCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					msRow = r
				}
			}
			sumRow.MaterialSummary = msRow
		}

		// Vendor sub-summary: call when vendor_code is present
		if hasVen {
			var vsRow interface{}
			switch {
			case !hasMat && hasVen && !hasPla:
				r, e := queries.VendorSubSummaryVendor(ctx, db.VendorSubSummaryVendorParams{
					VendorCode: *req.VendorCode,
					StartDate:  startDate,
					EndDate:    endDate,
				})
				if e == nil {
					vsRow = r
				}
			case hasMat && hasVen && !hasPla:
				r, e := queries.VendorSubSummaryMaterialVendor(ctx, db.VendorSubSummaryMaterialVendorParams{
					MaterialCode: *req.MaterialCode,
					VendorCode:   *req.VendorCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					vsRow = r
				}
			case !hasMat && hasVen && hasPla:
				r, e := queries.VendorSubSummaryVendorPlant(ctx, db.VendorSubSummaryVendorPlantParams{
					VendorCode: *req.VendorCode,
					PlantCode:  *req.PlantCode,
					StartDate:  startDate,
					EndDate:    endDate,
				})
				if e == nil {
					vsRow = r
				}
			case hasMat && hasVen && hasPla:
				r, e := queries.VendorSubSummaryMaterialVendorPlant(ctx, db.VendorSubSummaryMaterialVendorPlantParams{
					MaterialCode: *req.MaterialCode,
					VendorCode:   *req.VendorCode,
					PlantCode:    *req.PlantCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					vsRow = r
				}
			}
			sumRow.VendorSummary = vsRow
		}

		// Plant sub-summary: call when plant_code is present
		if hasPla {
			var psRow interface{}
			switch {
			case !hasMat && !hasVen && hasPla:
				r, e := queries.PlantSubSummaryPlant(ctx, db.PlantSubSummaryPlantParams{
					PlantCode: *req.PlantCode,
					StartDate: startDate,
					EndDate:   endDate,
				})
				if e == nil {
					psRow = r
				}
			case hasMat && !hasVen && hasPla:
				r, e := queries.PlantSubSummaryMaterialPlant(ctx, db.PlantSubSummaryMaterialPlantParams{
					MaterialCode: *req.MaterialCode,
					PlantCode:    *req.PlantCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					psRow = r
				}
			case !hasMat && hasVen && hasPla:
				r, e := queries.PlantSubSummaryVendorPlant(ctx, db.PlantSubSummaryVendorPlantParams{
					VendorCode: *req.VendorCode,
					PlantCode:  *req.PlantCode,
					StartDate:  startDate,
					EndDate:    endDate,
				})
				if e == nil {
					psRow = r
				}
			case hasMat && hasVen && hasPla:
				r, e := queries.PlantSubSummaryMaterialVendorPlant(ctx, db.PlantSubSummaryMaterialVendorPlantParams{
					MaterialCode: *req.MaterialCode,
					VendorCode:   *req.VendorCode,
					PlantCode:    *req.PlantCode,
					StartDate:    startDate,
					EndDate:      endDate,
				})
				if e == nil {
					psRow = r
				}
			}
			sumRow.PlantSummary = psRow
		}

		// ── 12. Assemble and return response ──────────────────────────────────
		totalPages := ceilDiv(totalRecords, int64(req.PageSize))

		return c.Status(fiber.StatusOK).JSON(searchResponse{
			Summary: &sumRow,
			Records: records,
			Pagination: paginationResponse{
				Page:         req.Page,
				PageSize:     req.PageSize,
				TotalRecords: totalRecords,
				TotalPages:   totalPages,
			},
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Search dispatch helpers — one per filter combination
// ─────────────────────────────────────────────────────────────────────────────

func searchMaterial(
	ctx context.Context,
	queries *db.Queries,
	materialCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByMaterialPurchaseDateAsc(ctx, db.SearchByMaterialPurchaseDateAscParams{
			MaterialCode: materialCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByMaterialPurchaseDateDesc(ctx, db.SearchByMaterialPurchaseDateDescParams{
			MaterialCode: materialCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByMaterialCostAsc(ctx, db.SearchByMaterialCostAscParams{
			MaterialCode: materialCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByMaterialCostDesc(ctx, db.SearchByMaterialCostDescParams{
			MaterialCode: materialCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByMaterialNetPriceAsc(ctx, db.SearchByMaterialNetPriceAscParams{
			MaterialCode: materialCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default: // net_price_desc
		return queries.SearchByMaterialNetPriceDesc(ctx, db.SearchByMaterialNetPriceDescParams{
			MaterialCode: materialCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}

func searchVendor(
	ctx context.Context,
	queries *db.Queries,
	vendorCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByVendorPurchaseDateAsc(ctx, db.SearchByVendorPurchaseDateAscParams{
			VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByVendorPurchaseDateDesc(ctx, db.SearchByVendorPurchaseDateDescParams{
			VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByVendorCostAsc(ctx, db.SearchByVendorCostAscParams{
			VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByVendorCostDesc(ctx, db.SearchByVendorCostDescParams{
			VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByVendorNetPriceAsc(ctx, db.SearchByVendorNetPriceAscParams{
			VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default:
		return queries.SearchByVendorNetPriceDesc(ctx, db.SearchByVendorNetPriceDescParams{
			VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}

func searchPlant(
	ctx context.Context,
	queries *db.Queries,
	plantCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByPlantPurchaseDateAsc(ctx, db.SearchByPlantPurchaseDateAscParams{
			PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByPlantPurchaseDateDesc(ctx, db.SearchByPlantPurchaseDateDescParams{
			PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByPlantCostAsc(ctx, db.SearchByPlantCostAscParams{
			PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByPlantCostDesc(ctx, db.SearchByPlantCostDescParams{
			PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByPlantNetPriceAsc(ctx, db.SearchByPlantNetPriceAscParams{
			PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default:
		return queries.SearchByPlantNetPriceDesc(ctx, db.SearchByPlantNetPriceDescParams{
			PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}

func searchMaterialVendor(
	ctx context.Context,
	queries *db.Queries,
	materialCode, vendorCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByMaterialVendorPurchaseDateAsc(ctx, db.SearchByMaterialVendorPurchaseDateAscParams{
			MaterialCode: materialCode, VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByMaterialVendorPurchaseDateDesc(ctx, db.SearchByMaterialVendorPurchaseDateDescParams{
			MaterialCode: materialCode, VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByMaterialVendorCostAsc(ctx, db.SearchByMaterialVendorCostAscParams{
			MaterialCode: materialCode, VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByMaterialVendorCostDesc(ctx, db.SearchByMaterialVendorCostDescParams{
			MaterialCode: materialCode, VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByMaterialVendorNetPriceAsc(ctx, db.SearchByMaterialVendorNetPriceAscParams{
			MaterialCode: materialCode, VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default:
		return queries.SearchByMaterialVendorNetPriceDesc(ctx, db.SearchByMaterialVendorNetPriceDescParams{
			MaterialCode: materialCode, VendorCode: vendorCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}

func searchMaterialPlant(
	ctx context.Context,
	queries *db.Queries,
	materialCode, plantCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByMaterialPlantPurchaseDateAsc(ctx, db.SearchByMaterialPlantPurchaseDateAscParams{
			MaterialCode: materialCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByMaterialPlantPurchaseDateDesc(ctx, db.SearchByMaterialPlantPurchaseDateDescParams{
			MaterialCode: materialCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByMaterialPlantCostAsc(ctx, db.SearchByMaterialPlantCostAscParams{
			MaterialCode: materialCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByMaterialPlantCostDesc(ctx, db.SearchByMaterialPlantCostDescParams{
			MaterialCode: materialCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByMaterialPlantNetPriceAsc(ctx, db.SearchByMaterialPlantNetPriceAscParams{
			MaterialCode: materialCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default:
		return queries.SearchByMaterialPlantNetPriceDesc(ctx, db.SearchByMaterialPlantNetPriceDescParams{
			MaterialCode: materialCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}

func searchVendorPlant(
	ctx context.Context,
	queries *db.Queries,
	vendorCode, plantCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByVendorPlantPurchaseDateAsc(ctx, db.SearchByVendorPlantPurchaseDateAscParams{
			VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByVendorPlantPurchaseDateDesc(ctx, db.SearchByVendorPlantPurchaseDateDescParams{
			VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByVendorPlantCostAsc(ctx, db.SearchByVendorPlantCostAscParams{
			VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByVendorPlantCostDesc(ctx, db.SearchByVendorPlantCostDescParams{
			VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByVendorPlantNetPriceAsc(ctx, db.SearchByVendorPlantNetPriceAscParams{
			VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default:
		return queries.SearchByVendorPlantNetPriceDesc(ctx, db.SearchByVendorPlantNetPriceDescParams{
			VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}

func searchMaterialVendorPlant(
	ctx context.Context,
	queries *db.Queries,
	materialCode, vendorCode, plantCode, sortBy, sortOrder string,
	limit, offset int32,
	startDate, endDate sql.NullTime,
) ([]db.PurchaseRecord, error) {
	switch sortBy + "_" + sortOrder {
	case "purchase_date_asc":
		return queries.SearchByMaterialVendorPlantPurchaseDateAsc(ctx, db.SearchByMaterialVendorPlantPurchaseDateAscParams{
			MaterialCode: materialCode, VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "purchase_date_desc":
		return queries.SearchByMaterialVendorPlantPurchaseDateDesc(ctx, db.SearchByMaterialVendorPlantPurchaseDateDescParams{
			MaterialCode: materialCode, VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_asc":
		return queries.SearchByMaterialVendorPlantCostAsc(ctx, db.SearchByMaterialVendorPlantCostAscParams{
			MaterialCode: materialCode, VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "cost_desc":
		return queries.SearchByMaterialVendorPlantCostDesc(ctx, db.SearchByMaterialVendorPlantCostDescParams{
			MaterialCode: materialCode, VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	case "net_price_asc":
		return queries.SearchByMaterialVendorPlantNetPriceAsc(ctx, db.SearchByMaterialVendorPlantNetPriceAscParams{
			MaterialCode: materialCode, VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	default:
		return queries.SearchByMaterialVendorPlantNetPriceDesc(ctx, db.SearchByMaterialVendorPlantNetPriceDescParams{
			MaterialCode: materialCode, VendorCode: vendorCode, PlantCode: plantCode, Limit: limit, Offset: offset, StartDate: startDate, EndDate: endDate,
		})
	}
}
