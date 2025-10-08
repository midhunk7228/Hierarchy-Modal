import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Dashboard } from "../utils/dashboardStorage";

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboardId: string | null;
  isLoading: boolean;
}

const initialState: DashboardState = {
  dashboards: [],
  currentDashboardId: null,
  isLoading: false,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboards: (state, action: PayloadAction<Dashboard[]>) => {
      state.dashboards = action.payload;
    },
    setCurrentDashboard: (state, action: PayloadAction<string>) => {
      state.currentDashboardId = action.payload;
    },
    addDashboard: (state, action: PayloadAction<Dashboard>) => {
      state.dashboards.push(action.payload);
    },
    removeDashboard: (state, action: PayloadAction<string>) => {
      state.dashboards = state.dashboards.filter(d => d.id !== action.payload);
      if (state.currentDashboardId === action.payload) {
        state.currentDashboardId = state.dashboards[0]?.id || null;
      }
    },
    updateDashboard: (state, action: PayloadAction<Dashboard>) => {
      const index = state.dashboards.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.dashboards[index] = action.payload;
      }
    },
    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setDashboards,
  setCurrentDashboard,
  addDashboard,
  removeDashboard,
  updateDashboard,
  setDashboardLoading,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
