const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://octopus-app-lxh2t.ondigitalocean.app';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pp_access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pp_refresh_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('pp_access_token', access);
  localStorage.setItem('pp_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('pp_access_token');
  localStorage.removeItem('pp_refresh_token');
  localStorage.removeItem('pp_user');
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('pp_access_token', data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true } = options;

  const reqHeaders: Record<string, string> = { ...headers };
  if (body && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = { method, headers: reqHeaders };
  if (body) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let res = await fetch(`${API_URL}${path}`, fetchOptions);

  // Auto-refresh on 401
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      fetchOptions.headers = reqHeaders;
      res = await fetch(`${API_URL}${path}`, fetchOptions);
    }
  }

  if (!res.ok) {
    let data;
    try { data = await res.json(); } catch { data = null; }
    throw new ApiError(
      data?.message || data?.error || `Request failed with status ${res.status}`,
      res.status,
      data
    );
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api<{ access_token: string; refresh_token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  signup: (data: { name: string; email: string; password: string; referral_code?: string }) =>
    api<{ access_token: string; refresh_token: string; user: User }>('/auth/signup', { method: 'POST', body: data, auth: false }),
  me: () => api<{ user: User }>('/auth/me'),
  logout: () => api('/auth/logout', { method: 'POST' }),
  resendVerification: () => api('/auth/resend-verification', { method: 'POST' }),
  forgotPassword: (email: string) => api('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token: string, password: string) => api('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),
  hostContractStatus: () => api<{ accepted: boolean; version: string }>('/auth/host-contract-status'),
  acceptHostContract: () => api('/auth/accept-host-contract', { method: 'POST' }),
};

// Places
export const placesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ places: Place[]; pagination: Pagination }>(`/places${qs}`);
  },
  get: (id: number) => api<{ place: Place }>(`/places/${id}`),
  create: (data: Partial<Place>) => api<{ place: Place }>('/places', { method: 'POST', body: data }),
  update: (id: number, data: Partial<Place>) => api<{ place: Place }>(`/places/${id}`, { method: 'PATCH', body: data }),
  delete: (id: number) => api(`/places/${id}`, { method: 'DELETE' }),
  myPlaces: () => api<{ places: Place[] }>('/places/host/my-places'),
  setUnavailable: (id: number, data: { startDate: string; endDate?: string; isIndefinite?: boolean }) =>
    api(`/places/${id}/set-unavailable`, { method: 'POST', body: data }),
  setAvailable: (id: number) => api(`/places/${id}/set-available`, { method: 'POST' }),
};

// Bookings
export const bookingsApi = {
  list: () => api<{ bookings: Booking[] }>('/bookings'),
  get: (id: number) => api<{ booking: Booking }>(`/bookings/${id}`),
  create: (data: Partial<Booking>) => api<Booking>('/bookings', { method: 'POST', body: data }),
  cancel: (id: number) => api(`/bookings/${id}/cancel`, { method: 'POST' }),
  hostBookings: () => api<{ bookings: Booking[] }>('/bookings/host/my-bookings'),
  approve: (id: number) => api(`/bookings/${id}/approve`, { method: 'PUT' }),
  reject: (id: number, reason: string) => api(`/bookings/${id}/reject`, { method: 'PUT', body: { reason } }),
  markSeen: (ids: number[]) => api('/bookings/host/mark-seen', { method: 'PUT', body: { bookingIds: ids } }),
  availability: (placeId: number) => api(`/bookings/availability/place/${placeId}`, { auth: false }),
  guestReview: (id: number, data: { rating: number; title?: string; comment?: string; photo_urls?: string[] }) =>
    api(`/bookings/${id}/guest-review`, { method: 'POST', body: data }),
  search: (params: Record<string, string>) => {
    const qs = '?' + new URLSearchParams(params).toString();
    return api<{ bookings: Booking[] }>(`/bookings/search${qs}`);
  },
  all: () => api<{ bookings: Booking[] }>('/bookings/all'),
};

// Payments
export const paymentsApi = {
  createIntent: (amount: number, currency: string, placeId?: number) =>
    api<{ clientSecret: string; paymentIntentId: string }>('/payments/create-intent', {
      method: 'POST', body: { amount, currency, place_id: placeId },
    }),
  refund: (paymentIntentId: string) =>
    api('/payments/refund', { method: 'POST', body: { paymentIntentId } }),
};

// Reviews
export const reviewsApi = {
  forPlace: (placeId: number, page = 1) =>
    api<{ reviews: Review[]; pagination: Pagination }>(`/reviews/places/${placeId}/reviews?page=${page}`, { auth: false }),
  create: (placeId: number, data: { rating: number; title?: string; comment?: string; photo_urls?: string[] }) =>
    api<Review>(`/reviews/places/${placeId}`, { method: 'POST', body: data }),
  delete: (id: number) => api(`/reviews/${id}`, { method: 'DELETE' }),
};

// Chat
export const chatApi = {
  conversations: () => api<{ conversations: Conversation[] }>('/chat/conversations'),
  messages: (userId: number, limit = 50, offset = 0) =>
    api<{ messages: Message[] }>(`/chat/conversations/${userId}/messages?limit=${limit}&offset=${offset}`),
  bookingMessages: (bookingId: number) => api<{ messages: Message[] }>(`/chat/bookings/${bookingId}/messages`),
  send: (data: { receiver_id: number; content: string; booking_id?: number }) =>
    api<Message>('/chat/messages', { method: 'POST', body: data }),
  markRead: (userId: number) => api(`/chat/conversations/${userId}/read`, { method: 'PUT' }),
  bookingStatus: (bookingId: number) => api(`/chat/bookings/${bookingId}/status`),
  requestReopen: (bookingId: number, reason: string) =>
    api(`/chat/bookings/${bookingId}/reopen`, { method: 'POST', body: { reason } }),
  respondReopen: (requestId: number, response: string) =>
    api(`/chat/reopen/${requestId}/respond`, { method: 'PUT', body: { response } }),
};

// Notifications
export const notificationsApi = {
  counts: (mode?: string) => {
    const qs = mode ? `?mode=${mode}` : '';
    return api<NotificationCounts>(`/notifications/counts${qs}`);
  },
  unreadByBooking: () => api<{ unreadByBooking: { booking_id: number; unread_count: number }[] }>('/notifications/unread-by-booking'),
};

// Contacts
export const contactsApi = {
  submit: (data: { userId?: number; userEmail: string; category: string; subject: string; message: string }) => {
    // Send auth token if user is logged in, so backend can extract userId
    const token = getToken();
    return api('/contacts/submit', { method: 'POST', body: data, auth: !!token });
  },
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ contacts: Contact[] }>(`/contacts${qs}`);
  },
  get: (id: number) => api<{ contact: Contact }>(`/contacts/${id}`),
  update: (id: number, data: { status?: string; admin_notes?: string }) =>
    api(`/contacts/${id}`, { method: 'PATCH', body: data }),
  stats: () => api('/contacts/stats/summary'),
};

// Admin
export const adminApi = {
  dashboard: () => api<{ dashboard: AdminDashboard }>('/admin/dashboard'),
  places: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ places: Place[] }>(`/admin/places${qs}`);
  },
  approvePlace: (id: number) => api(`/admin/places/${id}/approve`, { method: 'PATCH' }),
  rejectPlace: (id: number, reason: string) => api(`/admin/places/${id}/reject`, { method: 'PATCH', body: { reason } }),
  users: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ users: User[] }>(`/admin/users${qs}`);
  },
  updateUserRole: (id: number, role: string) => api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  hostApplications: (status?: string) => api<{ applications: HostApplication[] }>(`/admin/host-applications${status ? `?status=${status}` : ''}`),
  approveHostApplication: (id: number, adminNotes?: string) => api(`/admin/host-applications/${id}/approve`, { method: 'PATCH', body: { admin_notes: adminNotes || '' } }),
  rejectHostApplication: (id: number, adminNotes?: string) => api(`/admin/host-applications/${id}/reject`, { method: 'PATCH', body: { admin_notes: adminNotes || '' } }),
};

// Upload
export const uploadApi = {
  images: (files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    return api<{ images: { url: string; filename: string }[] }>('/upload', { method: 'POST', body: form });
  },
  placeImages: (placeId: number, files: File[], category?: string) => {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    const qs = category ? `?category=${category}` : '';
    return api<{ imageUrls: string[] }>(`/upload/place/${placeId}${qs}`, { method: 'POST', body: form });
  },
};

// Auto-messages
export const autoMessagesApi = {
  list: () => api('/auto-messages'),
  get: (placeId: number) => api(`/auto-messages/place/${placeId}`),
  create: (data: { trigger: string; template: string }) =>
    api('/auto-messages', { method: 'POST', body: data }),
  update: (id: number, data: { template?: string; is_active?: boolean }) =>
    api(`/auto-messages/${id}`, { method: 'PATCH', body: data }),
  delete: (id: number) => api(`/auto-messages/${id}`, { method: 'DELETE' }),
  save: (placeId: number, templates: Record<string, string>) =>
    api(`/auto-messages/place/${placeId}`, { method: 'PUT', body: templates }),
};

// Referrals
export const referralsApi = {
  getCode: () => api<{ referral_code: string }>('/referrals/code'),
  stats: () => api('/referrals/stats'),
  setupConnect: () => api('/referrals/connect/setup', { method: 'POST' }),
  connectStatus: () => api('/referrals/connect/status'),
};

// Users
export const usersApi = {
  get: (id: number) => api<User>(`/users/${id}`),
  update: (id: number, data: Partial<User>) => api(`/users/${id}`, { method: 'PATCH', body: data }),
  delete: (id: number) => api(`/users/${id}`, { method: 'DELETE' }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api('/users/change-password', { method: 'POST', body: data }),
};

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'host' | 'admin';
  verified?: boolean;
  avatar_url?: string;
  bio?: string;
  phone_number?: string;
  phone?: string;
  vehicle_registration?: string;
  vehicle_length?: number;
  vehicle_height?: number;
  vehicle_width?: number;
  dark_mode?: boolean;
  offline_mode?: boolean;
  created_at?: string;
  host_contract_accepted_at?: string;
  host_contract_version?: string;
  stripe_account_id?: string;
  referral_code?: string;
}

export interface Place {
  id: number;
  owner_id: number;
  host_id?: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  coordinates_approximate?: boolean;
  price_per_night: number;
  capacity?: number;
  amenities?: string[];
  place_type?: string;
  image_urls?: string[];
  approval_status?: string;
  status?: string;
  featured?: boolean;
  rating?: number;
  review_count?: number;
  is_currently_unavailable?: boolean;
  opening_hours?: string;
  business_description?: string;
  access_route_description?: string;
  max_vehicle_height_ft?: number;
  max_vehicle_width_ft?: number;
  max_vehicle_length_ft?: number;
  serves_food?: boolean;
  food_menu_description?: string;
  created_at?: string;
  owner_name?: string;
  host?: { id: number; name: string; avatar_url?: string };
  rejection_reason?: string;
  host_contract_accepted_at?: string;
  host_contract_version?: string;
  owner_email?: string;
}

export interface Booking {
  id: number;
  booking_ref?: string;
  user_id: number;
  place_id: number;
  pub_id?: number;
  check_in_date: string;
  check_out_date: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  van_registration?: string;
  vehicle_registration?: string;
  contact_phone?: string;
  phone?: string;
  special_requests?: string;
  total_price: number;
  payment_intent_id?: string;
  host_seen?: boolean;
  created_at?: string;
  place_name?: string;
  place_image?: string;
  place_user_id?: number;
  guest_name?: string;
  guest_email?: string;
  place?: { id: number; name: string; image_urls?: string[] };
  user?: { id: number; name: string; email?: string };
}

export interface Review {
  id: number;
  user_id: number;
  place_id: number;
  rating: number;
  title?: string;
  comment?: string;
  photo_urls?: string[];
  user_name?: string;
  user_avatar?: string;
  user?: { name: string; avatar_url?: string };
  created_at?: string;
}

export interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerEmail?: string;
  partnerRole?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderId?: number;
  lastMessageRead?: boolean;
  unreadCount: number;
  bookingId?: number;
  placeName?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  booking_id?: number;
  read: boolean;
  delivered: boolean;
  created_at: string;
}

export interface NotificationCounts {
  unreadMessages: number;
  pendingBookings: number;
  pendingApprovals?: number;
  siteSubmissions?: number;
}

export interface Contact {
  id: number;
  user_id?: number;
  user_email: string;
  email?: string;
  name?: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  urgency_score?: number;
  urgency?: string;
  admin_notes?: string;
  created_at: string;
  user?: { name: string; email: string };
}

export interface AdminDashboard {
  total_users: number;
  total_places: number;
  total_bookings: number;
  total_reviews: number;
  pending_approvals: number;
  pending_referrals: number;
  active_bookings: number;
  total_revenue: number;
  open_contacts: number;
  pending_host_applications: number;
}

export interface HostApplication {
  id: number;
  user_id: number;
  contact_name: string;
  email: string;
  phone: string;
  business_description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  business_type: string | null;
  van_spaces: number;
  referral_code: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
