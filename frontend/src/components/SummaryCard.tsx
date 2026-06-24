import type { SearchSummary, VendorSummary, MaterialSummary, PlantSummary } from '../types';

interface SummaryCardProps {
  summary: SearchSummary | null;
}

// Format a numeric value as a locale string with 2 decimal places.
// Returns '—' for null/undefined.
function formatCost(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value;
}

function formatList(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return '—';
  return values.join(', ');
}

// A single labelled metric row
function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metricRow}>
      <span style={styles.metricLabel}>{label}</span>
      <span style={styles.metricValue}>{value}</span>
    </div>
  );
}

// Section heading divider
function SectionHeading({ title }: { title: string }) {
  return (
    <div style={styles.sectionHeading}>
      <span>{title}</span>
    </div>
  );
}

function CoreMetrics({ summary }: { summary: SearchSummary }) {
  return (
    <>
      <SectionHeading title="Overall Metrics" />
      <MetricRow label="Records Found" value={formatNumber(summary.records_found)} />
      <MetricRow label="Total Cost" value={formatCost(summary.total_cost)} />
      <MetricRow label="Avg Cost" value={formatCost(summary.avg_cost)} />
      <MetricRow label="Avg Net Price" value={formatCost(summary.avg_net_price)} />
      <MetricRow label="Min Cost" value={formatCost(summary.min_cost)} />
      <MetricRow label="Max Cost" value={formatCost(summary.max_cost)} />
      <MetricRow label="Purchase Orders" value={formatNumber(summary.purchase_order_count)} />
      <MetricRow label="Earliest Date" value={formatDate(summary.earliest_date)} />
      <MetricRow label="Latest Date" value={formatDate(summary.latest_date)} />
      <MetricRow label="Currencies" value={formatList(summary.currencies)} />
      <MetricRow label="Units" value={formatList(summary.units)} />
    </>
  );
}

function VendorSection({ vs }: { vs: VendorSummary }) {
  return (
    <>
      <SectionHeading title={`Vendor Summary — ${vs.vendor_code}`} />
      <MetricRow label="Avg Purchase Cost" value={formatCost(vs.avg_cost)} />
      <MetricRow label="Avg Net Price" value={formatCost(vs.avg_net_price)} />
      <MetricRow label="Last Purchase Cost" value={formatCost(vs.last_purchase_cost)} />
      <MetricRow label="Cheapest Purchase Cost" value={formatCost(vs.cheapest_cost)} />
      <MetricRow label="Materials Supplied" value={formatNumber(vs.materials_count)} />
      <MetricRow label="Plants Served" value={formatNumber(vs.plants_count)} />
      <MetricRow label="Purchase Orders" value={formatNumber(vs.purchase_order_count)} />
      <MetricRow label="Currencies" value={formatList(vs.currencies)} />
      <MetricRow label="Units" value={formatList(vs.units)} />
      <MetricRow label="First Purchase Date" value={formatDate(vs.first_date)} />
      <MetricRow label="Last Purchase Date" value={formatDate(vs.last_date)} />
    </>
  );
}

function MaterialSection({ ms }: { ms: MaterialSummary }) {
  return (
    <>
      <SectionHeading title={`Material Summary — ${ms.material_code}`} />
      {ms.description && (
        <MetricRow label="Description" value={ms.description} />
      )}
      <MetricRow label="Avg Purchase Cost" value={formatCost(ms.avg_cost)} />
      <MetricRow label="Avg Net Price" value={formatCost(ms.avg_net_price)} />
      <MetricRow label="Last Purchase Cost" value={formatCost(ms.last_purchase_cost)} />
      <MetricRow label="Cheapest Purchase Cost" value={formatCost(ms.cheapest_cost)} />
      <MetricRow label="Vendor Count" value={formatNumber(ms.vendor_count)} />
      <MetricRow label="Plant Count" value={formatNumber(ms.plant_count)} />
      <MetricRow label="Purchase Orders" value={formatNumber(ms.purchase_order_count)} />
      <MetricRow label="Currencies" value={formatList(ms.currencies)} />
      <MetricRow label="Units" value={formatList(ms.units)} />
      <MetricRow label="First Purchase Date" value={formatDate(ms.first_date)} />
      <MetricRow label="Last Purchase Date" value={formatDate(ms.last_date)} />
    </>
  );
}

function PlantSection({ ps }: { ps: PlantSummary }) {
  return (
    <>
      <SectionHeading title={`Plant Summary — ${ps.plant_code}`} />
      <MetricRow label="Avg Purchase Cost" value={formatCost(ps.avg_cost)} />
      <MetricRow label="Avg Net Price" value={formatCost(ps.avg_net_price)} />
      <MetricRow label="Last Purchase Cost" value={formatCost(ps.last_purchase_cost)} />
      <MetricRow label="Cheapest Purchase Cost" value={formatCost(ps.cheapest_cost)} />
      <MetricRow label="Vendor Count" value={formatNumber(ps.vendor_count)} />
      <MetricRow label="Material Count" value={formatNumber(ps.material_count)} />
      <MetricRow label="Purchase Orders" value={formatNumber(ps.purchase_order_count)} />
      <MetricRow label="Currencies" value={formatList(ps.currencies)} />
      <MetricRow label="Units" value={formatList(ps.units)} />
      <MetricRow label="First Purchase Date" value={formatDate(ps.first_date)} />
      <MetricRow label="Last Purchase Date" value={formatDate(ps.last_date)} />
    </>
  );
}

export function SummaryCard({ summary }: SummaryCardProps) {
  if (summary === null) {
    return (
      <div style={styles.card} aria-label="Analytics summary">
        <p style={styles.noData}>No data available</p>
      </div>
    );
  }

  return (
    <div style={styles.card} aria-label="Analytics summary">
      <CoreMetrics summary={summary} />

      {summary.vendor_summary && (
        <VendorSection vs={summary.vendor_summary} />
      )}

      {summary.material_summary && (
        <MaterialSection ms={summary.material_summary} />
      )}

      {summary.plant_summary && (
        <PlantSection ps={summary.plant_summary} />
      )}
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
  noData: {
    margin: 0,
    fontSize: '14px',
    color: '#6b6375',
    textAlign: 'center',
    padding: '12px 0',
  },
  sectionHeading: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#6b6375',
    borderBottom: '1px solid #e5e4e7',
    paddingBottom: '6px',
    marginTop: '20px',
    marginBottom: '10px',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '5px 0',
    borderBottom: '1px solid #f4f3f5',
    gap: '16px',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#4a4453',
    flexShrink: 0,
  },
  metricValue: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#08060d',
    textAlign: 'right' as const,
    wordBreak: 'break-word' as const,
  },
};
