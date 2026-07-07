import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  userId: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  userId: null,
  accessToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ userId: string; accessToken: string }>) {
      state.userId = action.payload.userId;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    clearAuth(state) {
      state.userId = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
