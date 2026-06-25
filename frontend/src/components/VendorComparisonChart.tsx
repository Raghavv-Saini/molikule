import type { VendorComparison } from '../types';

interface VendorComparisonChartProps {
  vendors: VendorComparison[] | null | undefined;
}

interface NullableStringShape {
  String?: string;
  Valid?: boolean;
}

function unwrapNullable(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== 'object') return value;

  const maybeString = value as NullableStringShape;
  if ('Valid' in maybeString && maybeString.Valid === false) return null;
  if ('String' in maybeString) return maybeString.String;

  return value;
}

function formatText(value: unknown): string {
  const unwrapped = unwrapNullable(value);
  if (unwrapped == null || unwrapped === '') return '—';
  if (typeof unwrapped === 'string') return unwrapped;
  if (typeof unwrapped === 'number' || typeof unwrapped === 'boolean') return String(unwrapped);
  return '—';
}

function formatCost(value: unknown): string {
  const unwrapped = unwrapNullable(value);
  if (unwrapped == null || unwrapped === '') return '—';
  const numericValue = typeof unwrapped === 'number' ? unwrapped : Number(unwrapped);
  if (!Number.isFinite(numericValue)) return formatText(unwrapped);
  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function numericValue(value: unknown): number {
  const unwrapped = unwrapNullable(value);
  const numeric = typeof unwrapped === 'number' ? unwrapped : Number(unwrapped);
  return Number.isFinite(numeric) ? numeric : 0;
}

function barWidth(value: unknown, maxValue: number): string {
  if (maxValue <= 0) return '0%';
  const percentage = Math.max(4, (numericValue(value) / maxValue) * 100);
  return `${Math.min(100, percentage)}%`;
}

export function VendorComparisonChart({ vendors }: VendorComparisonChartProps) {
  const rows = vendors ?? [];

  if (rows.length <= 1) {
    return null;
  }

  const maxValue = Math.max(
    ...rows.flatMap((row) => [
      numericValue(row.avg_cost),
      numericValue(row.avg_net_price),
    ]),
  );

  return (
    <div style={styles.card} aria-label="Vendor comparison by material">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Vendor Comparison</h2>
          <p style={styles.subtitle}>Material-level supplier pricing with order and record volume.</p>
        </div>
        <div style={styles.legend} aria-label="Chart legend">
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendSwatch, backgroundColor: '#2563eb' }} />
            Avg Cost
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendSwatch, backgroundColor: '#0f766e' }} />
            Avg Net Price
          </span>
        </div>
      </div>

      <div style={styles.rows}>
        {rows.map((row) => {
          const supplier = formatText(row.supplier_name);
          const label = supplier === '—' ? row.vendor_code : supplier;

          return (
            <div key={row.vendor_code} style={styles.row}>
              <div style={styles.vendorLabel}>
                <span style={styles.supplierName}>{label}</span>
                <span style={styles.vendorCode}>{row.vendor_code}</span>
              </div>

              <div style={styles.barGroup}>
                <div style={styles.metricLine}>
                  <span style={styles.metricName}>Cost</span>
                  <div style={styles.track}>
                    <div
                      style={{
                        ...styles.bar,
                        width: barWidth(row.avg_cost, maxValue),
                        backgroundColor: '#2563eb',
                      }}
                    />
                  </div>
                  <span style={styles.metricValue}>{formatCost(row.avg_cost)}</span>
                </div>

                <div style={styles.metricLine}>
                  <span style={styles.metricName}>Net</span>
                  <div style={styles.track}>
                    <div
                      style={{
                        ...styles.bar,
                        width: barWidth(row.avg_net_price, maxValue),
                        backgroundColor: '#0f766e',
                      }}
                    />
                  </div>
                  <span style={styles.metricValue}>{formatCost(row.avg_net_price)}</span>
                </div>
              </div>

              <div style={styles.counts}>
                <span style={styles.countItem}>{formatNumber(row.purchase_order_count)} POs</span>
                <span style={styles.countItem}>{formatNumber(row.record_count)} records</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '6px',
    padding: '20px 24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    lineHeight: 1.3,
    fontWeight: 600,
    color: '#08060d',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    lineHeight: 1.4,
    color: '#6b6375',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    paddingTop: '2px',
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#4a4453',
    whiteSpace: 'nowrap',
  },
  legendSwatch: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    display: 'inline-block',
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(170px, 230px) minmax(360px, 1fr) minmax(140px, auto)',
    alignItems: 'center',
    gap: '18px',
    padding: '12px 0',
    borderTop: '1px solid #f4f3f5',
  },
  vendorLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  supplierName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#08060d',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  vendorCode: {
    fontSize: '12px',
    color: '#6b6375',
    fontVariantNumeric: 'tabular-nums',
  },
  barGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    minWidth: 0,
  },
  metricLine: {
    display: 'grid',
    gridTemplateColumns: '36px minmax(120px, 1fr) 96px',
    alignItems: 'center',
    gap: '10px',
  },
  metricName: {
    fontSize: '12px',
    color: '#6b6375',
  },
  track: {
    height: '10px',
    backgroundColor: '#f4f3f5',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '3px',
  },
  metricValue: {
    fontSize: '12px',
    color: '#08060d',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  counts: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    flexWrap: 'wrap',
  },
  countItem: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#4a4453',
    backgroundColor: '#f4f3f5',
    border: '1px solid #e5e4e7',
    borderRadius: '4px',
    padding: '4px 7px',
    whiteSpace: 'nowrap',
  },
};
