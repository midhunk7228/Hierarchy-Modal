
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppliedFilter } from '../DashbiardExampleProps';

interface FiltersState {
  localAppliedFilters: AppliedFilter[];
}

const initialState: FiltersState = {
  localAppliedFilters: [],
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setLocalAppliedFilters: (state, action: PayloadAction<AppliedFilter[]>) => {
      state.localAppliedFilters = action.payload;
    },
  },
});

export const { setLocalAppliedFilters } = filtersSlice.actions;
export default filtersSlice.reducer;
