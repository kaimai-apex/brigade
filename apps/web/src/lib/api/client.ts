const API_BASE = '/api/connectpro';

export class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('accessToken', token);
      else localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

    if (res.status === 401 && retry) {
      const refreshed = await fetch('/api/auth/refresh-token', { method: 'POST', credentials: 'include' });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as { accessToken?: string };
        if (data.accessToken) {
          this.setToken(data.accessToken);
          return this.request<T>(path, options, false);
        }
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Request failed');
    }
    return res.json();
  }

  signup(data: { email: string; password: string; firstName: string; lastName: string }) {
    return this.request<{ userId: string; accessToken: string; refreshToken: string }>(
      '/api/v1/auth/signup',
      { method: 'POST', body: JSON.stringify(data) },
    );
  }

  login(data: { email: string; password: string }) {
    return this.request<{ userId: string; accessToken: string; refreshToken: string }>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
    );
  }

  getProfile(userId: string) {
    return this.request(`/api/v1/users/${userId}`);
  }

  updateProfile(userId: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  getFeed(limit = 20) {
    return this.request<{ data: Post[] }>(`/api/v1/feed?limit=${limit}`);
  }

  createPost(content: string, mediaUrl?: string) {
    return this.request('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ content, mediaUrl }),
    });
  }

  likePost(postId: string) {
    return this.request(`/api/v1/posts/${postId}/likes`, { method: 'POST' });
  }

  getPost(postId: string) {
    return this.request<Post & { comments?: Comment[] }>(`/api/v1/posts/${postId}`);
  }

  addComment(postId: string, content: string) {
    return this.request(`/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  followCompany(companyId: string) {
    return this.request(`/api/v1/companies/${companyId}/follow`, { method: 'POST', body: '{}' });
  }

  createJob(data: {
    companyId: string;
    title: string;
    description?: string;
    location?: string;
    employmentType?: string;
  }) {
    return this.request('/api/v1/jobs', { method: 'POST', body: JSON.stringify(data) });
  }

  getApplicants(jobId: string) {
    return this.request<{ data: JobApplication[] }>(`/api/v1/jobs/${jobId}/applicants`);
  }

  getConnections(status = 'accepted') {
    return this.request<{ data: Connection[] }>(
      `/api/v1/connections?status=${encodeURIComponent(status)}`,
    );
  }

  sendConnectionRequest(receiverId: string) {
    return this.request('/api/v1/connections/request', {
      method: 'POST',
      body: JSON.stringify({ receiverId }),
    });
  }

  acceptConnection(connectionId: string) {
    return this.request(`/api/v1/connections/${connectionId}/accept`, { method: 'POST' });
  }

  rejectConnection(connectionId: string) {
    return this.request(`/api/v1/connections/${connectionId}/reject`, { method: 'POST' });
  }

  followUser(followeeId: string) {
    return this.request('/api/v1/follows', {
      method: 'POST',
      body: JSON.stringify({ followeeId }),
    });
  }

  getJobs(q?: string) {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<{ data: Job[] }>(`/api/v1/jobs${params}`);
  }

  getJob(jobId: string) {
    return this.request<Job>(`/api/v1/jobs/${jobId}`);
  }

  applyToJob(jobId: string) {
    return this.request(`/api/v1/jobs/${jobId}/apply`, { method: 'POST', body: '{}' });
  }

  saveJob(jobId: string) {
    return this.request(`/api/v1/jobs/${jobId}/save`, { method: 'POST', body: '{}' });
  }

  getCompanies() {
    return this.request<{ data: Company[] }>('/api/v1/companies');
  }

  getCompany(companyId: string) {
    return this.request<Company>(`/api/v1/companies/${companyId}`);
  }

  search(q: string, type?: string) {
    const params = new URLSearchParams({ q });
    if (type) params.set('type', type);
    return this.request<{ data: SearchResult[] }>(`/api/v1/search?${params}`);
  }

  autocomplete(q: string) {
    return this.request<{ suggestions: string[] }>(
      `/api/v1/search/autocomplete?q=${encodeURIComponent(q)}`,
    );
  }

  getNotifications() {
    return this.request<{ data: Notification[] }>('/api/v1/notifications');
  }

  markNotificationRead(id: string) {
    return this.request(`/api/v1/notifications/${id}/read`, { method: 'POST' });
  }

  getRecommendedPeople() {
    return this.request<{ data: Recommendation[] }>('/api/v1/recommendations/people');
  }

  getConversations() {
    return this.request<{ data: Conversation[] }>('/api/v1/conversations');
  }

  getMessages(conversationId: string) {
    return this.request<{ data: Message[] }>(
      `/api/v1/conversations/${conversationId}/messages`,
    );
  }

  sendMessage(conversationId: string, body: string) {
    return this.request('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, body }),
    });
  }

  createConversation(participantId: string) {
    return this.request<{ id: string }>('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantIds: [participantId], type: 'direct' }),
    });
  }
}

export type Post = {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  likeCount: number;
  createdAt: string;
};

export type Connection = {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
};

export type Job = {
  id: string;
  title: string;
  companyName?: string;
  location?: string;
  description?: string;
};

export type Company = {
  id: string;
  name: string;
  description?: string;
  followerCount?: number;
};

export type SearchResult = {
  id: string;
  type: string;
  name?: string;
  title?: string;
  headline?: string;
};

export type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
};

export type Recommendation = {
  userId: string;
  name: string;
  headline?: string;
  reason?: string;
};

export type Conversation = {
  id: string;
  participants: string[];
  lastMessageAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
};

export type JobApplication = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
};

export const api = new ApiClient();
