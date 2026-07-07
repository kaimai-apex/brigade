import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Post } from '@/lib/api/client';

interface FeedState {
  posts: Post[];
  loading: boolean;
  error: string | null;
}

const initialState: FeedState = {
  posts: [],
  loading: false,
  error: null,
};

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setPosts(state, action: PayloadAction<Post[]>) {
      state.posts = action.payload;
      state.loading = false;
      state.error = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    prependPost(state, action: PayloadAction<Post>) {
      state.posts.unshift(action.payload);
    },
  },
});

export const { setLoading, setPosts, setError, prependPost } = feedSlice.actions;
export default feedSlice.reducer;
