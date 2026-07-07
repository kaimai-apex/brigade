'use client';

import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import authReducer from './slices/authSlice';
import feedReducer from './slices/feedSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    feed: feedReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
