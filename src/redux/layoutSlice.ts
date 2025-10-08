import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface LayoutState {
  currentNavigationPath: string;
  layouts: Record<string, ReactGridLayout.Layout[]>;
  isLayoutLoading: boolean;
}

const initialState: LayoutState = {
  currentNavigationPath: "default",
  layouts: {},
  isLayoutLoading: false,
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setCurrentNavigationPath: (state, action: PayloadAction<string>) => {
      state.currentNavigationPath = action.payload;
    },
    setLayoutForPath: (
      state,
      action: PayloadAction<{ path: string; layout: ReactGridLayout.Layout[] }>
    ) => {
      state.layouts[action.payload.path] = action.payload.layout;
    },
    setLayoutLoading: (state, action: PayloadAction<boolean>) => {
      state.isLayoutLoading = action.payload;
    },
    clearLayoutForPath: (state, action: PayloadAction<string>) => {
      delete state.layouts[action.payload];
    },
    clearAllLayouts: (state) => {
      state.layouts = {};
    },
  },
});

export const {
  setCurrentNavigationPath,
  setLayoutForPath,
  setLayoutLoading,
  clearLayoutForPath,
  clearAllLayouts,
} = layoutSlice.actions;

export default layoutSlice.reducer;
