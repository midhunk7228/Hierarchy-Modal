import {
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Users,
  List,
  Filter,
  Edit,
  Trash2,
  Move,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import type {
  MatrixDisplayProps,
  DashboardWidget,
  MatrixData,
  AppliedFilter,
  BaseItem,
  SummaryItem,
  DetailItem,
  SummaryData,
  TableColumn,
  FilterConfig,
} from "../DashbiardExampleProps";
import FilterPanel from "./FilterPanel";
import { useDispatch, useSelector } from "react-redux";
import { setLocalAppliedFilters } from "../redux/filtersSlice";
import type { RootState } from "../redux/store";

// amCharts 5 imports
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

// const baseUrl = "https://01a9b102-272b-4a62-9992-55f628a4b9a3.mock.pstmn.io";
const baseUrl = "https://node-server-jcf5.onrender.com";

const MatrixDisplay: React.FC<
  MatrixDisplayProps & {
    widget: DashboardWidget;
    isDragging?: boolean;
    onEdit?: (widgetId: string) => void;
    onDelete?: (widgetId: string) => void;
    isEditMode?: boolean;
    onHeightChange?: (widgetId: string, height: number) => void;
  }
> = ({
  widget,
  isDragging = false,
  onEdit,
  onDelete,
  isEditMode = false,
  onHeightChange,
  apiEndpoint = null,
  displayType = "summary",
  viewType = "tabular",
  additionalInfo = { outcome: true },
  onItemClick = () => {},
  refreshInterval = null,
  customStyles = {},
  filters = [],
  inVisibleFilters = [],
  onFiltersChange = () => {},
  sampleData,
}) => {
  const [data, setData] = useState<MatrixData>(sampleData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const dispatch = useDispatch();
  const localAppliedFilters = useSelector(
    (state: RootState) => state.filters.localAppliedFilters
  );
  // const localAppliedFiltersOne = useSelector(
  //   (state: RootState) => state.filters
  // );
  // Refs for amCharts

  console.log("localAppliedFiltersWhyyytt", localAppliedFilters);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<am5.Root | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (viewType !== "comparison" || !element || !onHeightChange) return;

    onHeightChange(widget.id, element.scrollHeight);
  }, [viewType, onHeightChange, widget.id]);

  const applyFiltersToData = useCallback(
    (
      data: MatrixData,
      displayType: "summary" | "details",
      appliedFilters: AppliedFilter[],
      filters: FilterConfig[]
    ): MatrixData => {
      if (appliedFilters.length === 0) return data;

      const filterData = (items: (SummaryItem | DetailItem)[]) => {
        return items.filter((item) => {
          return appliedFilters.every((appliedFilter) => {
            const filter = filters.find((f) => f.id === appliedFilter.filterId);
            if (!filter || !appliedFilter.value) return true;

            const fieldValue = item[filter.field as keyof typeof item];
            const filterValue = appliedFilter.value;

            switch (filter.type) {
              case "date-range": {
                if (!fieldValue || !filterValue.start || !filterValue.end)
                  return true;
                const itemDate = new Date(fieldValue as string);
                const startDate = new Date(filterValue.start);
                const endDate = new Date(filterValue.end);
                return itemDate >= startDate && itemDate <= endDate;
              }

              case "single-date": {
                if (!fieldValue || !filterValue) return true;
                return (
                  new Date(fieldValue as string).toDateString() ===
                  new Date(filterValue as string).toDateString()
                );
              }

              case "select":
                if (!filterValue) return true;
                return fieldValue === filterValue;

              case "multi-select":
                if (!Array.isArray(filterValue) || filterValue.length === 0)
                  return true;
                return (filterValue as (string | number)[]).includes(
                  fieldValue as string | number
                );

              case "text":
                if (!filterValue) return true;
                return String(fieldValue)
                  .toLowerCase()
                  .includes(String(filterValue).toLowerCase());

              case "number-range": {
                if (!filterValue.min && !filterValue.max) return true;
                const numValue = Number(fieldValue);
                const min = filterValue.min || -Infinity;
                const max = filterValue.max || Infinity;
                return numValue >= min && numValue <= max;
              }

              default:
                return true;
            }
          });
        });
      };
      if (displayType === "summary") {
        return {
          ...data,
          summary: {
            ...data.summary,
            regions: filterData(data.summary.regions) as SummaryItem[],
            categories: filterData(data.summary.categories) as SummaryItem[],
          },
        };
      } else {
        return {
          ...data,
          details: filterData(data.details) as DetailItem[],
        };
      }
    },
    []
  );

  // Initialize default filters
  // useEffect(() => {
  //   const defaultFilters = filters
  //     .filter((f) => f.defaultValue !== undefined)
  //     .map((f) => ({ filterId: f.id, value: f.defaultValue }));
  //   if (defaultFilters.length > 0 && localAppliedFilters.length === 0) {
  //     dispatch(setLocalAppliedFilters(defaultFilters));
  //   }
  // }, [dispatch, filters, localAppliedFilters.length]);

  // Apply filters to data
  const filteredData = useMemo(
    () =>
      applyFiltersToData(
        data,
        displayType,
        localAppliedFilters,
        inVisibleFilters
      ),
    [
      applyFiltersToData,
      data,
      displayType,
      localAppliedFilters,
      inVisibleFilters,
    ]
  );
  console.log("localAppliedFilters!@!", localAppliedFilters, filters);
  // Fetch data from API
  const fetchData = useCallback(async (): Promise<void> => {
    if (!apiEndpoint) return;

    setLoading(true);
    setError(null);

    try {
      // Build query parameters from applied filters
      // const params = new URLSearchParams();
      // localAppliedFilters.forEach((filter) => {
      //   const filterConfig = filters.find((f) => f.id === filter.filterId);
      //   if (filterConfig && filter.value) {
      //     if (filterConfig.type === "date-range") {
      //       params.append(`${filterConfig.field}_start`, filter.value.start);
      //       params.append(`${filterConfig.field}_end`, filter.value.end);
      //     } else if (filterConfig.type === "number-range") {
      //       if (filter.value.min !== undefined)
      //         params.append(`${filterConfig.field}_min`, filter.value.min);
      //       if (filter.value.max !== undefined)
      //         params.append(`${filterConfig.field}_max`, filter.value.max);
      //     } else if (filterConfig.type === "multi-select") {
      //       (filter.value as (string | number)[]).forEach((val) =>
      //         params.append(filterConfig.field, String(val))
      //       );
      //     } else {
      //       params.append(filterConfig.field, String(filter.value));
      //     }
      //   }
      // });

      // const url = `${apiEndpoint}${
      //   params.toString() ? "?" + params.toString() : ""
      // }`;
      const url = `${baseUrl}${apiEndpoint}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result: MatrixData = await response.json();
      setData(result);
    } catch (err) {
      setData(sampleData);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, localAppliedFilters, filters]);

  // Fetch data on mount, when endpoint or filters change, and at specified intervals
  useEffect(() => {
    fetchData();

    if (refreshInterval) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (isEditMode || viewType !== "comparison" || !element || !onHeightChange)
      return;

    onHeightChange(widget.id, element.scrollHeight, element);
  }, []);

  // Cleanup amCharts on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  // Handle item click
  const handleItemClick = useCallback(
    (item: BaseItem | SummaryItem | DetailItem, type: string): void => {
      onItemClick({ item, type, displayType, viewType });
    },
    [onItemClick, displayType, viewType]
  );

  // Initialize amCharts
  const initializeChart = useCallback(
    (
      chartData: (SummaryItem | DetailItem)[],
      chartType: "pie" | "column" | "layered"
    ): void => {
      if (!chartRef.current) return;

      // Dispose existing chart
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }

      // Create root element
      const root = am5.Root.new(chartRef.current);
      chartInstance.current = root;

      // Set themes
      root.setThemes([am5themes_Animated.new(root)]);
      if (chartType === "pie") {
        createPieChart(root, chartData);
      } else if (chartType === "column") {
        createColumnChart(root, chartData);
      } else if (chartType === "layered") {
        createLayeredColumnChart(root, chartData);
      }
    },
    [displayType, localAppliedFilters, handleItemClick]
  );

  const createPieChart = (
    root: am5.Root,
    chartData: (SummaryItem | DetailItem)[]
  ): void => {
    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(50),
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: displayType === "summary" ? "value" : "revenue",
        categoryField: "name",
        alignLabels: false,
      })
    );

    series.labels.template.setAll({
      textType: "circular",
      centerX: 0,
      centerY: 0,
    });

    // Add click event
    series.slices.template.events.on("click", (ev) => {
      const dataContext = ev.target.dataItem?.dataContext as BaseItem;
      if (dataContext) {
        handleItemClick(dataContext, "pie-segment");
      }
    });
    const filteredChartData =
      localAppliedFilters?.find((el) => el.filterId === "region-filter")
        ?.value || [];
    series.data.setAll(
      Array.isArray(filteredChartData) && filteredChartData.length > 0
        ? chartData.filter((ele) =>
            filteredChartData.includes(ele.name as string)
          )
        : chartData
    );

    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.percent(50),
        x: am5.percent(50),
        marginTop: 15,
        marginBottom: 15,
      })
    );

    legend.data.setAll(series.dataItems);
  };

  const createColumnChart = (
    root: am5.Root,
    chartData: (SummaryItem | DetailItem)[]
  ): void => {
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX",
        layout: root.verticalLayout,
      })
    );

    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
    cursor.lineY.set("visible", false);

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        maxZoomCount: 30,
        categoryField: "name",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, { strokeDasharray: [1, 3] }),
      })
    );

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Series 1",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: displayType === "summary" ? "value" : "revenue",
        sequencedInterpolation: true,
        categoryXField: "name",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY}",
        }),
      })
    );

    series.columns.template.setAll({
      cornerRadiusTL: 5,
      cornerRadiusTR: 5,
      strokeOpacity: 0,
    });

    // Add click event
    series.columns.template.events.on("click", (ev) => {
      const dataContext = ev.target.dataItem?.dataContext as BaseItem;
      if (dataContext) {
        handleItemClick(dataContext, "column");
      }
    });

    // const filteredChartData =
    //   localAppliedFilters?.find((el) => el.filterId === "region-filter")
    //     ?.value || [];
    // xAxis.data.setAll(
    //   Array.isArray(filteredChartData) && filteredChartData.length > 0
    //     ? chartData.filter((ele) =>
    //         filteredChartData.includes(ele.name as string)
    //       )
    //     : chartData
    // );
    // series.data.setAll(
    //   Array.isArray(filteredChartData) && filteredChartData.length > 0
    //     ? chartData.filter((ele) =>
    //         filteredChartData.includes(ele.name as string)
    //       )
    //     : chartData
    // );

    xAxis.data.setAll(chartData);
    series.data.setAll(chartData);

    series.appear(1000);
    chart.appear(1000, 100);
  };

  const createLayeredColumnChart = (
    root: am5.Root,
    chartData: (SummaryItem | DetailItem)[]
  ): void => {
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX",
        layout: root.verticalLayout,
      })
    );

    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
    cursor.lineY.set("visible", false);

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        maxZoomCount: 30,
        categoryField: "name",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, { strokeDasharray: [1, 3] }),
      })
    );

    // Revenue series
    const revenueSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Revenue",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "revenue",
        categoryXField: "name",
        tooltip: am5.Tooltip.new(root, {
          labelText: "Revenue: ${valueY}",
        }),
        fill: am5.color("#3B82F6"),
      })
    );

    // Orders series (scaled for visibility)
    const ordersSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Orders",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "ordersScaled",
        categoryXField: "name",
        tooltip: am5.Tooltip.new(root, {
          labelText: "Orders: {orders}",
        }),
        fill: am5.color("#10B981"),
      })
    );
    // Scale orders data for better visualization
    // const filteredChartData =
    //   localAppliedFilters?.find((el) => el.filterId === "region-filter")
    //     ?.value || [];
    const createRegionFilter = (localAppliedFilters: any[]) => {
      return (item: any) => {
        if (
          localAppliedFilters?.find((el) => el.filterId === "region-filter")
        ) {
          return localAppliedFilters?.some(
            (region) =>
              region.filterId === "region-filter" &&
              region.value?.includes(item?.name)
          );
        }
        return true;
      };
    };
    const createCategoryFilter = (localAppliedFilters: any[]) => {
      return (item: any) => {
        if (
          localAppliedFilters?.find((el) => el.filterId === "outcome-filter")
        ) {
          return localAppliedFilters?.some(
            (region) =>
              region.filterId === "outcome-filter" &&
              region.value?.includes(item?.outcome)
          );
        }
        return true;
      };
    };
    const scaledData = chartData
      .filter(createRegionFilter(localAppliedFilters))
      .filter(createCategoryFilter(localAppliedFilters))
      .map((item) => ({
        ...item,
        ordersScaled: (item.orders || 0) * 100, // Scale orders for visibility
      }));

    revenueSeries.columns.template.setAll({
      cornerRadiusTL: 5,
      cornerRadiusTR: 5,
      strokeOpacity: 0,
    });
    ordersSeries.columns.template.setAll({
      cornerRadiusTL: 5,
      cornerRadiusTR: 5,
      strokeOpacity: 0,
    });

    // Add click events
    revenueSeries.columns.template.events.on("click", (ev) => {
      const dataContext = ev.target.dataItem?.dataContext as BaseItem;
      if (dataContext) {
        handleItemClick(dataContext, "revenue-column");
      }
    });

    ordersSeries.columns.template.events.on("click", (ev) => {
      const dataContext = ev.target.dataItem?.dataContext as BaseItem;
      if (dataContext) {
        handleItemClick(dataContext, "orders-column");
      }
    });

    xAxis.data.setAll(scaledData);
    revenueSeries.data.setAll(scaledData);
    ordersSeries.data.setAll(scaledData);

    // Add legend
    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.percent(50),
        x: am5.percent(50),
      })
    );

    legend.data.setAll(chart.series.values);

    revenueSeries.appear(1000);
    ordersSeries.appear(1000);
    chart.appear(1000, 100);
  };

  // Update chart when data or view type changes
  useEffect(() => {
    if (viewType === "pie-chart" || viewType === "chart") {
      const chartData =
        displayType === "summary"
          ? filteredData.summary.regions
          : filteredData.details;

      if (viewType === "pie-chart") {
        initializeChart(chartData, "pie");
      } else if (viewType === "chart") {
        // Use layered chart for richer visualization
        initializeChart(chartData, "layered");
      }
    }
  }, [filteredData, viewType, displayType, initializeChart]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: AppliedFilter[]) => {
    dispatch(setLocalAppliedFilters(newFilters));
    onFiltersChange(newFilters);
  };

  // Get outcome icon
  const getOutcomeIcon = (
    outcome?: "positive" | "negative"
  ): JSX.Element | null => {
    if (!additionalInfo.outcome || !outcome) return null;
    return outcome === "positive" ? (
      <ArrowUpCircle className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowDownCircle className="w-4 h-4 text-red-500" />
    );
  };

  // Get outcome color
  const getOutcomeColor = (outcome?: "positive" | "negative"): string => {
    if (!additionalInfo.outcome || !outcome) return "text-gray-700";
    return outcome === "positive" ? "text-green-600" : "text-red-600";
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-500 mr-2">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error loading data</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Single Value View
  const renderSingleValue = (): JSX.Element => {
    const currentData =
      displayType === "summary"
        ? filteredData.summary
        : filteredData.details[0];
    const value =
      displayType === "summary"
        ? (currentData as SummaryData).totalRevenue
        : (currentData as DetailItem)?.revenue;
    const label = displayType === "summary" ? "Total Revenue" : "Revenue";

    return (
      <div className="bg-white rounded-lg p-6 text-center ">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{label}</h3>
        <div className="text-3xl font-bold text-blue-600 mb-2">
          ${value?.toLocaleString() || "N/A"}
        </div>
        {displayType === "summary" && filteredData.summary.growthRate && (
          <div
            className={`flex items-center justify-center ${getOutcomeColor(
              filteredData.summary.growthRate > 0 ? "positive" : "negative"
            )}`}
          >
            {getOutcomeIcon(
              filteredData.summary.growthRate > 0 ? "positive" : "negative"
            )}
            <span className="ml-1 text-sm font-medium">
              {filteredData.summary.growthRate > 0 ? "+" : ""}
              {filteredData.summary.growthRate}%
            </span>
          </div>
        )}
      </div>
    );
  };

  // Chart View (amCharts)
  const renderChart = (): JSX.Element => {
    return (
      <div className="bg-white rounded-lg p-6 h-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Performance Chart
        </h3>
        <div
          ref={chartRef}
          style={{ width: "100%", height: "calc(100% - 80px)" }}
        ></div>
      </div>
    );
  };

  // Pie Chart View (amCharts)
  const renderPieChart = (): JSX.Element => {
    return (
      <div className="bg-white rounded-lg p-6 h-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Distribution
        </h3>
        <div
          ref={chartRef}
          style={{ width: "100%", height: "calc(100% - 80px)" }}
        ></div>
      </div>
    );
  };

  const renderComparison = (): JSX.Element => {
    const items =
      displayType === "summary"
        ? filteredData.summary.regions
        : filteredData.details;
    return (
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Comparison View
        </h3>
        <div className="flex flex-wrap gap-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors flex-1"
              // style={{ minWidth: "200px" }}
              onClick={() => handleItemClick(item, "comparison-item")}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  {(item as SummaryItem).name || (item as DetailItem).region}
                </h4>
                {getOutcomeIcon(item.outcome)}
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                $
                {(
                  (item as SummaryItem).value || (item as DetailItem).revenue
                )?.toLocaleString()}
              </div>
              {item.orders && (
                <div className="text-sm text-gray-500">
                  {item.orders.toLocaleString()} orders
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Tabular View
  const renderTabular = (): JSX.Element => {
    console.log("displayType", displayType);
    const tableData: SummaryItem[] | DetailItem[] = (
      displayType === "summary"
        ? filteredData.summary.regions
        : filteredData.details
    ) as SummaryItem[] | DetailItem[];
    const columns: TableColumn[] =
      displayType === "summary"
        ? [
            { key: "name", label: "Name" },
            { key: "revenue", label: "Revenue" },
            { key: "orders", label: "Orders" },
            { key: "value", label: "Share %" },
          ]
        : [
            { key: "region", label: "Region" },
            { key: "category", label: "Category" },
            { key: "revenue", label: "Revenue" },
            { key: "orders", label: "Orders" },
            { key: "growth", label: "Growth %" },
          ];
    return (
      <div className="bg-white rounded-lg overflow-hidden h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <List className="w-5 h-5 mr-2" />
            Data Table
          </h3>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
                {additionalInfo.outcome && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.map((row, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleItemClick(row, "table-row")}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {column.key === "revenue" || column.key === "value"
                        ? `${
                            (row as SummaryItem | DetailItem)[
                              column.key as keyof typeof row
                            ]?.toLocaleString() || "N/A"
                          }`
                        : column.key === "growth"
                        ? `${(row as DetailItem)[column.key] > 0 ? "+" : ""}${
                            (row as DetailItem)[column.key]
                          }%`
                        : (row as SummaryItem | DetailItem)[
                            column.key as keyof typeof row
                          ] || "N/A"}
                    </td>
                  ))}
                  {additionalInfo.outcome && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getOutcomeIcon(row.outcome)}
                        <span
                          className={`ml-1 text-sm ${getOutcomeColor(
                            row.outcome
                          )}`}
                        >
                          {row.outcome}
                        </span>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Main render logic
  const renderContent = (): JSX.Element => {
    switch (viewType) {
      case "single-value":
        return renderSingleValue();
      case "pie-chart":
        return renderPieChart();
      case "chart":
        return renderChart();
      case "comparison":
        return renderComparison();
      case "tabular":
      default:
        return renderTabular();
    }
  };

  // Get active filter count
  const activeFilterCount = localAppliedFilters.filter((f) => {
    const filterConfig = filters.find((fc) => fc.id === f.filterId);
    if (!filterConfig) return false;

    // Check if filter has a meaningful value
    if (filterConfig.type === "date-range") {
      return f.value?.start && f.value?.end;
    } else if (filterConfig.type === "number-range") {
      return f.value?.min !== undefined || f.value?.max !== undefined;
    } else if (filterConfig.type === "multi-select") {
      return Array.isArray(f.value) && f.value.length > 0;
    } else {
      return f.value && f.value !== "";
    }
  }).length;

  return (
    <div
      ref={contentRef}
      className={`relative ${
        viewType === "chart" || viewType === "pie-chart" ? "h-full" : ""
      } ${isDragging ? "opacity-50" : ""}`}
      style={customStyles}
    >
      {/* Widget Header with Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {/* Filter Button */}
        {filters.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 bg-white rounded shadow-md hover:bg-gray-50 transition-colors relative ${
                activeFilterCount > 0 ? "bg-blue-50 border border-blue-200" : ""
              }`}
              title="Filters"
            >
              <Filter
                className={`w-4 h-4 ${
                  activeFilterCount > 0 ? "text-blue-600" : "text-gray-600"
                }`}
              />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Panel */}
            {showFilters && (
              <div className="absolute top-full right-0 mt-1 z-20">
                <FilterPanel
                  filters={filters}
                  appliedFilters={localAppliedFilters}
                  onFiltersChange={handleFiltersChange}
                  onClose={() => setShowFilters(false)}
                />
              </div>
            )}
          </div>
        )}

        {/* Edit Mode Controls */}
        {isEditMode && (
          <>
            <button
              onClick={() => onEdit?.(widget.id)}
              className="p-1 bg-white rounded shadow-md hover:bg-gray-50 transition-colors "
              title="Edit Widget"
            >
              <Edit className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => onDelete?.(widget.id)}
              className="p-1 bg-white rounded shadow-md hover:bg-red-50 transition-colors"
              title="Delete Widget"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
            <div
              className="p-1 bg-white rounded shadow-md cursor-move"
              title="Drag to Move"
            >
              <Move className="w-4 h-4 text-gray-600" />
            </div>
          </>
        )}
      </div>

      {renderContent()}
    </div>
  );
};

export default MatrixDisplay;
