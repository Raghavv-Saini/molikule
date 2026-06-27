export interface User {
  id: number;
  employee_id: string;
  name: string;
  role: "user" | "admin";
  created_at?: string | null;
}

export interface AuthState {
  token: string;
  user: User;
}

export interface SearchRequest {
  material_code?: string;
  vendor_code?: string;
  plant_code?: string;
  start_date?: string;
  end_date?: string;
  page: number;
  page_size: number;
  sort_by?: "purchase_date" | "cost" | "net_price";
  sort_order?: "asc" | "desc";
}

export interface PurchaseRecord {
  id: number;
  plant_code: string;
  material_code: string;
  vendor_code: string;
  description: string | null;
  purchase_no: string | null;
  purchase_date: string;
  net_price: number | null;
  cost: number | null;
  supplying_plant: string | null;
  quantity: number | null;
  currency: string | null;
  unit: string | null;
}

export interface VendorSummary {
  vendor_code: string;
  avg_cost: number;
  avg_net_price: number;
  last_purchase_cost: number | null;
  cheapest_cost: number | null;
  materials_count: number;
  plants_count: number;
  purchase_order_count: number;
  currencies: string[];
  units: string[];
  first_date: string;
  last_date: string;
}

export interface MaterialSummary {
  material_code: string;
  description: string | null;
  total_ordered_quantity: number | string | null;
  last_purchase_price: number | string | null;
  vendor_count: number;
  plant_count: number;
  purchase_order_count: number;
  currencies: string[];
  units: string[];
  first_date: string;
  last_date: string;
}

export interface PlantSummary {
  plant_code: string;
  avg_cost: number;
  avg_net_price: number;
  last_purchase_cost: number | null;
  cheapest_cost: number | null;
  vendor_count: number;
  material_count: number;
  purchase_order_count: number;
  currencies: string[];
  units: string[];
  first_date: string;
  last_date: string;
}

export interface VendorComparison {
  vendor_code: string;
  supplier_name: string | null;
  avg_cost: number;
  avg_net_price: number;
  cheapest_cost: number | null;
  last_purchase_cost: number | null;
  purchase_order_count: number;
  record_count: number;
  currencies: string[];
  units: string[];
}

export interface SearchSummary {
  records_found: number;
  total_cost: number;
  avg_cost: number;
  avg_net_price: number;
  min_cost: number | null;
  max_cost: number | null;
  purchase_order_count: number;
  earliest_date: string | null;
  latest_date: string | null;
  currencies: string[];
  units: string[];
  vendor_summary: VendorSummary | null;
  material_summary: MaterialSummary | null;
  plant_summary: PlantSummary | null;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface SearchResponse {
  summary: SearchSummary | null;
  vendor_comparison?: VendorComparison[] | null;
  records: PurchaseRecord[];
  pagination: Pagination;
}
