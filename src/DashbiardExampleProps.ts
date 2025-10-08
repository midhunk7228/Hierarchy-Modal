interface BaseItem {
  name?: string;
  region?: string;
  category?: string;
  value?: number;
  revenue?: number;
  orders?: number;
  outcome?: "positive" | "negative";
  date?: string;
  [key: string]: string | number | undefined; // For custom properties
}

interface SummaryItem extends BaseItem {
  name: string;
  value: number;
  revenue: number;
  orders: number;
  percentage?: number;
}

interface DetailItem extends BaseItem {
  id: number;
  region: string;
  category: string;
  revenue: number;
  orders: number;
  avgOrder?: number;
  growth?: number;
}

interface SummaryData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue?: number;
  growthRate?: number;
  regions: SummaryItem[];
  categories: SummaryItem[];
}

interface MatrixData {
  summary: SummaryData;
  details: DetailItem[];
}

// Filter Types
interface FilterOption {
  label: string;
  value: string | number;
}

interface FilterConfig {
  id: string;
  type:
    | "date-range"
    | "single-date"
    | "select"
    | "multi-select"
    | "text"
    | "number-range";
  label: string;
  field: string; // The field this filter applies to
  required?: boolean;
  options?: FilterOption[]; // For select/multi-select
  defaultValue?:
    | string
    | number
    | { start: string; end: string }
    | { min: number; max: number };
  placeholder?: string;
  min?: number; // For number-range
  max?: number; // For number-range
}

interface AppliedFilter {
  filterId: string;
  value:
    | string
    | number
    | { start: string; end: string }
    | { min: number; max: number }
    | (string | number)[];
}

interface MatrixDisplayProps {
  apiEndpoint?: string;
  displayType?: "summary" | "details";
  viewType?: "tabular" | "single-value" | "pie-chart" | "chart" | "comparison";
  additionalInfo?: {
    outcome?: boolean;
  };
  onItemClick?: (data: ClickData) => void;
  title?: string;
  refreshInterval?: number;
  customStyles?: React.CSSProperties;
  filters?: FilterConfig[];
  inVisibleFilters?: FilterConfig[];
  appliedFilters?: AppliedFilter[];
  onFiltersChange?: (filters: AppliedFilter[]) => void;
  sampleData?: MatrixData;
}

interface ClickData {
  item: BaseItem | SummaryItem | DetailItem;
  type: string;
  displayType: string;
  viewType: string;
}

interface TableColumn {
  key: string;
  label: string;
}

// Dashboard Configuration Types
interface DashboardWidget {
  id: string;
  title: string;
  displayType: "summary" | "details";
  viewType: "tabular" | "single-value" | "pie-chart" | "chart" | "comparison";
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
  apiEndpoint?: string;
  refreshInterval?: number;
  additionalInfo?: {
    outcome?: boolean;
  };
  customStyles?: React.CSSProperties;
  filters?: FilterConfig[];
  inVisibleFilters?: FilterConfig[];
}

interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  grid: {
    columns: number;
    rows: number;
    gap: number;
  };
  widgets: DashboardWidget[];
}

export type {
  BaseItem,
  SummaryItem,
  DetailItem,
  SummaryData,
  MatrixData,
  FilterOption,
  FilterConfig,
  AppliedFilter,
  MatrixDisplayProps,
  ClickData,
  TableColumn,
  DashboardWidget,
  DashboardLayout,
};
