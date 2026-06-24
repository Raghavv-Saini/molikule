import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { PurchaseRecord, Pagination } from '../types';

type SortColumn = 'purchase_date' | 'cost' | 'net_price';
type SortOrder = 'asc' | 'desc';

interface ResultsTableProps {
  records: PurchaseRecord[];
  pagination: Pagination;
  onSortChange: (sortBy: SortColumn, sortOrder: SortOrder) => void;
  onPageChange: (page: number) => void;
  currentSortBy?: SortColumn;
  currentSortOrder?: SortOrder;
}

const columnHelper = createColumnHelper<PurchaseRecord>();

// Format a numeric value with 2 decimal places, returning '—' for null/undefined.
function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQuantity(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

const SORT_COLUMNS: SortColumn[] = ['purchase_date', 'cost', 'net_price'];

const SORT_LABELS: Record<SortColumn, string> = {
  purchase_date: 'Purchase Date',
  cost: 'Cost',
  net_price: 'Net Price',
};

export function ResultsTable({
  records,
  pagination,
  onSortChange,
  onPageChange,
  currentSortBy,
  currentSortOrder,
}: ResultsTableProps) {
  const columns = [
    columnHelper.accessor('plant_code', {
      header: 'Plant Code',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('material_code', {
      header: 'Material Code',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => info.getValue() ?? '—',
    }),
    columnHelper.accessor('vendor_code', {
      header: 'Vendor Code',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('purchase_no', {
      header: 'Purchase Number',
      cell: (info) => info.getValue() ?? '—',
    }),
    columnHelper.accessor('purchase_date', {
      header: 'Purchase Date',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('quantity', {
      header: 'Quantity',
      cell: (info) => formatQuantity(info.getValue()),
    }),
    columnHelper.accessor('unit', {
      header: 'Unit',
      cell: (info) => info.getValue() ?? '—',
    }),
    columnHelper.accessor('net_price', {
      header: 'Net Price',
      cell: (info) => formatNumber(info.getValue()),
    }),
    columnHelper.accessor('cost', {
      header: 'Cost',
      cell: (info) => formatNumber(info.getValue()),
    }),
    columnHelper.accessor('currency', {
      header: 'Currency',
      cell: (info) => info.getValue() ?? '—',
    }),
    columnHelper.accessor('supplying_plant', {
      header: 'Supplying Plant',
      cell: (info) => info.getValue() ?? '—',
    }),
  ];

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  function handleSortClick(col: SortColumn) {
    if (currentSortBy === col) {
      // Toggle direction
      onSortChange(col, currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for new column
      onSortChange(col, 'asc');
    }
  }

  function getSortIndicator(col: SortColumn): string {
    if (currentSortBy !== col) return '';
    return currentSortOrder === 'asc' ? ' ▲' : ' ▼';
  }

  const hasPrev = pagination.page > 1;
  const hasNext = pagination.page < pagination.total_pages;

  return (
    <div style={styles.wrapper}>
      {/* Sort controls */}
      <div style={styles.sortControls} role="group" aria-label="Sort options">
        <span style={styles.sortLabel}>Sort by:</span>
        {SORT_COLUMNS.map((col) => (
          <button
            key={col}
            onClick={() => handleSortClick(col)}
            style={{
              ...styles.sortButton,
              ...(currentSortBy === col ? styles.sortButtonActive : {}),
            }}
            aria-pressed={currentSortBy === col}
            aria-label={`Sort by ${SORT_LABELS[col]}${getSortIndicator(col)}`}
          >
            {SORT_LABELS[col]}
            {getSortIndicator(col)}
          </button>
        ))}
      </div>

      {/* No results message */}
      {records.length === 0 ? (
        <div style={styles.noResults} role="status" aria-live="polite">
          No results found.
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table} aria-label="Purchase records">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const colId = header.column.id as string;
                      const isSortable = SORT_COLUMNS.includes(colId as SortColumn);
                      return (
                        <th
                          key={header.id}
                          style={{
                            ...styles.th,
                            ...(isSortable ? styles.thSortable : {}),
                          }}
                          onClick={
                            isSortable
                              ? () => handleSortClick(colId as SortColumn)
                              : undefined
                          }
                          aria-sort={
                            isSortable && currentSortBy === colId
                              ? currentSortOrder === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : isSortable
                              ? 'none'
                              : undefined
                          }
                          scope="col"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {isSortable && currentSortBy === colId && (
                            <span aria-hidden="true" style={styles.sortArrow}>
                              {currentSortOrder === 'asc' ? ' ▲' : ' ▼'}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    style={rowIndex % 2 === 0 ? styles.trEven : styles.trOdd}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={styles.td}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div style={styles.pagination} role="navigation" aria-label="Pagination">
            <span style={styles.paginationInfo}>
              {pagination.total_records.toLocaleString()} record
              {pagination.total_records !== 1 ? 's' : ''}
            </span>
            <div style={styles.paginationControls}>
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!hasPrev}
                aria-label="Previous page"
                style={{
                  ...styles.pageButton,
                  ...(hasPrev ? {} : styles.pageButtonDisabled),
                }}
              >
                ← Previous
              </button>
              <span style={styles.pageIndicator} aria-current="page" aria-label={`Page ${pagination.page} of ${pagination.total_pages}`}>
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!hasNext}
                aria-label="Next page"
                style={{
                  ...styles.pageButton,
                  ...(hasNext ? {} : styles.pageButtonDisabled),
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#4a4453',
    marginRight: '4px',
  },
  sortButton: {
    fontSize: '13px',
    fontWeight: 400,
    color: '#4a4453',
    backgroundColor: '#f4f3f5',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    padding: '5px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
  },
  sortButtonActive: {
    backgroundColor: '#08060d',
    color: '#ffffff',
    borderColor: '#08060d',
    fontWeight: 500,
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '6px',
    border: '1px solid #e5e4e7',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    tableLayout: 'auto',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '12px',
    color: '#4a4453',
    backgroundColor: '#f4f3f5',
    borderBottom: '1px solid #e5e4e7',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  thSortable: {
    cursor: 'pointer',
    color: '#08060d',
  },
  sortArrow: {
    marginLeft: '4px',
    fontSize: '10px',
  },
  trEven: {
    backgroundColor: '#ffffff',
  },
  trOdd: {
    backgroundColor: '#faf9fb',
  },
  td: {
    padding: '9px 12px',
    borderBottom: '1px solid #f4f3f5',
    color: '#08060d',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
  },
  noResults: {
    padding: '40px 24px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b6375',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '6px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '8px 0',
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#6b6375',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pageButton: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#08060d',
    border: 'none',
    borderRadius: '5px',
    padding: '7px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  pageButtonDisabled: {
    backgroundColor: '#c8c4cc',
    cursor: 'not-allowed',
  },
  pageIndicator: {
    fontSize: '13px',
    color: '#4a4453',
    fontWeight: 500,
    minWidth: '110px',
    textAlign: 'center',
  },
};
