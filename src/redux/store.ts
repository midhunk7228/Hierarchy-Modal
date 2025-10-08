import { configureStore } from "@reduxjs/toolkit";
import filtersReducer from "./filtersSlice";
import naviagtionPathReducer from "./navigationPathSlice";
import layoutReducer from "./layoutSlice";
import dashboardReducer from "./dashboardSlice";

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    navigationPath: naviagtionPathReducer,
    layout: layoutReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
