import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface FiltersState {
  navigationPath: RootEntity[];
}

const initialState: FiltersState = {
  navigationPath: [],
};

const naviagtionPathSlice = createSlice({
  name: "navigationPath",
  initialState,
  reducers: {
    setNavigationPath: (state, action: PayloadAction<RootEntity[]>) => {
      state.navigationPath = action.payload;
    },
  },
});

export const { setNavigationPath } = naviagtionPathSlice.actions;
export default naviagtionPathSlice.reducer;

// Modifier type
interface Modifier {
  code: string;
  displayText: string;
}

// Recursive entity type
interface Entity {
  code: string;
  name: string;
  icon: string;
  modifiers?: Modifier[];
  children?: Entity[];
}

// Root object type
interface RootEntity extends Entity {}
