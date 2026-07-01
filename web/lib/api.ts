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
  login: (identifier: string, password: string) =>
    api<{ access_token: string; refresh_token: string; user: User; must_change_password?: boolean }>('/auth/login', { method: 'POST', body: { identifier, password }, auth: false }),
  signup: (data: { username: string; name: string; email: string; password: string; role?: string; referral_code?: string }) =>
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
  // External calendars (host-managed)
  listExternalCalendars: (placeId: number) => api<{ calendars: { id: number; url: string; label?: string; last_synced?: string; enabled: boolean }[] }>(`/places/${placeId}/external-calendars`),
  createExternalCalendar: (placeId: number, data: { url: string; label?: string }) => api<{ calendar: unknown }>(`/places/${placeId}/external-calendars`, { method: 'POST', body: data }),
  deleteExternalCalendar: (calendarId: number) => api(`/places/external-calendars/${calendarId}`, { method: 'DELETE' }),
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
  markUserSeen: () => api('/bookings/user/mark-seen', { method: 'PUT' }),
  hostDashboard: () => api<{ dashboard: HostDashboard }>('/bookings/host/dashboard'),
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
  reply: (id: number, text: string) =>
    api<{ success: boolean; reply: ContactReply; status: string }>(`/contacts/${id}/reply`, { method: 'POST', body: { body: text } }),
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
  createPlaceForUser: (data: Partial<Place> & { owner_id: number }) =>
    api<{ place: Place }>('/admin/places', { method: 'POST', body: data }),
  createUser: (data: { username?: string; name: string; email?: string; role?: string; phone?: string }) =>
    api<{ user: User; otp_password: string | null; invite_sent: boolean; email_is_placeholder?: boolean }>('/admin/users', { method: 'POST', body: data }),
  users: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ users: User[] }>(`/admin/users${qs}`);
  },
  userDetails: (id: number) => api<{ user: User; bookings: AdminUserBooking[] }>(`/admin/users/${id}`),
  updateUserRole: (id: number, role: string) => api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  updateUser: (id: number, data: { name?: string; email?: string; phone?: string }) =>
    api<{ user: User }>(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  sendPasswordResetEmail: (id: number) =>
    api<{ message: string; email: string }>(`/admin/users/${id}/send-password-reset`, { method: 'POST' }),
  deleteUser: (id: number) => api<{ message: string; booking_actions?: { cancelled: number; refundsAttempted: number } }>(`/admin/users/${id}`, { method: 'DELETE' }),
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
  getTemplates: (placeId: number) => api<{ templates: AutoMessageTemplate[] }>(`/auto-messages/place/${placeId}`),
  saveTemplates: (placeId: number, templates: { trigger_type: string; message_content: string; enabled: boolean }[]) =>
    api<{ templates: AutoMessageTemplate[] }>(`/auto-messages/place/${placeId}`, { method: 'PUT', body: { templates } }),
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
  username?: string;
  role: 'user' | 'host' | 'admin' | 'employee';
  verified?: boolean;
  must_change_password?: boolean;
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
  bookings_count?: number;
  last_booking_created_at?: string;
}

export interface AdminUserBooking {
  id: number;
  booking_ref?: string;
  place_id?: number;
  place_name?: string;
  place_city?: string;
  check_in_date?: string;
  check_out_date?: string;
  total_price?: number;
  status?: string;
  created_at?: string;
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
  max_nights_per_stay?: number | null;
  available_days?: number[] | null;
  electric_hookup_available?: boolean;
  electric_hookup_capacity?: number;
  electric_hookup_price_per_night?: number;
  created_at?: string;
  owner_name?: string;
  host?: { id: number; name: string; avatar_url?: string };
  rejection_reason?: string;
  host_contract_accepted_at?: string;
  host_contract_version?: string;
  owner_email?: string;
}

export interface AutoMessageTemplate {
  id: number;
  place_id: number;
  host_id: number;
  trigger_type: string;
  message_content: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
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
  place_image_urls?: string[];
  place_address?: string;
  place_user_id?: number;
  guest_name?: string;
  guest_email?: string;
  place?: { id: number; name: string; image_urls?: string[] };
  user?: { id: number; name: string; email?: string };
  electric_hookup?: boolean;
  electric_hookup_price?: number;
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
  adminPendingBookings?: number;
  pendingApprovals?: number;
  siteSubmissions?: number;
}

export interface ContactReply {
  id: number;
  contact_id: number;
  admin_id: number | null;
  body: string;
  sent_email: boolean;
  created_at: string;
  admin_name?: string;
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
  replies?: ContactReply[];
}

export interface HostDashboard {
  places: { total: number; approved: number; pending: number };
  bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number; active_now: number };
  earnings: { gross_revenue: number; host_earnings: number; paid_out: number; pending_payout: number };
  reviews: { total: number; average_rating: number };
  recent_bookings: { id: number; booking_ref: string; status: string; total_price: string; check_in_date: string; check_out_date: string; created_at: string; guest_name: string; place_name: string }[];
  upcoming_checkins: { id: number; booking_ref: string; check_in_date: string; check_out_date: string; guest_name: string; place_name: string }[];
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

// ─── CRM Types ──────────────────────────────────────────────────────

export interface CRMLead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  business_name: string | null;
  location: string | null;
  website: string | null;
  property_type: string | null;
  pipeline_stage: string;
  priority: string;
  parking_spaces: number | null;
  parking_type: string | null;
  ownership_type: string | null;
  estimated_value: number | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  opening_hours_text: string | null;
  is_chain: boolean | null;
  chain_name: string | null;
  latitude: number | null;
  longitude: number | null;
  satellite_image_url: string | null;
  tags: string[] | null;
  admin_notes: string | null;
  last_contact_date: string | null;
  next_follow_up: string | null;
  source: string | null;
  assigned_to: number | null;
  place_id: number | null;
  contract_url: string | null;
  linked_place?: {
    id: number;
    name: string;
    address: string;
    city: string;
    approval_status: string;
    price_per_night: number | null;
    place_type: string | null;
    owner_name: string | null;
    owner_email: string | null;
    owner_phone: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  activity_count?: number;
  pending_tasks?: number;
  last_activity_at?: string | null;
}

export interface CRMActivity {
  id: number;
  lead_id: number;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CRMTask {
  id: number;
  lead_id: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  assigned_to: number | null;
  completed_at: string | null;
  created_at: string;
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  source_email_id?: number | null;
}

export interface CRMEmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  variables: string[];
  is_active: boolean;
  usage_count?: number;
  created_at: string;
}

export interface CRMEmailLog {
  id: number;
  lead_id: number;
  template_id: number | null;
  subject: string;
  body: string;
  to_email: string;
  direction: 'outbound' | 'inbound';
  from_name: string | null;
  status: string;
  sent_at: string;
  template_name?: string | null;
}

export interface CRMSiteVisit {
  id: number;
  lead_id: number;
  visit_date: string;
  contact_name: string | null;
  contact_role: string | null;
  car_park_surface: string | null;
  car_park_spaces: number | null;
  motorhome_access: string | null;
  level_ground: boolean | null;
  electric_hookup: string | null;
  water_access: boolean | null;
  ownership_type: string | null;
  owner_reaction: string | null;
  objections: string | null;
  follow_up_agreed: boolean | null;
  follow_up_date: string | null;
  photos: string[] | null;
  verdict: string | null;
  verdict_reason: string | null;
  notes: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface CRMSequence {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  step_count?: number;
  active_leads?: number;
  created_at: string;
}

export interface CRMStats {
  pipeline: { pipeline_stage: string; count: string }[];
  totals: {
    total_leads: string;
    converted: string;
    lost: string;
    new_this_week: string;
    new_this_month: string;
    hot_leads: string;
    conversion_rate: string;
  };
  overdue_tasks: number;
  upcoming_tasks: number;
  emails_sent_30d: number;
  recent_activities: (CRMActivity & { business_name?: string; first_name?: string; last_name?: string })[];
}

export interface CRMPipelineStage {
  pipeline_stage: string;
  count: string;
  hot: string;
  warm: string;
  medium: string;
  cold: string;
}

export interface CRMStage {
  id: number;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface CRMCustomField {
  id: number;
  name: string;
  field_type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url';
  options: { label: string; color: string }[];
  sort_order: number;
  show_in_table: boolean;
}

export interface CmsRow {
  key: string;
  value: string;
  label: string;
  type: 'text' | 'textarea';
  page: string;
  section: string;
  sort_order: number;
}

export interface CRMAutomationStatus {
  server_kill_switch_enabled: boolean;
  setting_enabled: boolean;
  gate_ready: boolean;
  effective_enabled: boolean;
  threshold: number;
  min_fit_score: number;
  daily_limit: number;
}

export interface DiscoveryQueueItem {
  id: number;
  google_place_id: string | null;
  business_name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  discovery_fit_score: number;
  discovery_parking_confidence: number;
  discovery_access_score: number;
  discovery_campervan_priority: number;
  admin_notes: string | null;
  source: string;
  created_at: string;
}

// ─── CRM API ────────────────────────────────────────────────────────

export const crmApi = {
  // Stats
  stats: () => api<CRMStats>('/crm/stats'),

  // Leads
  getLeads: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ leads: CRMLead[]; total: number }>(`/crm/leads${qs}`);
  },
  getLead: (id: number) => api<{ lead: CRMLead }>(`/crm/leads/${id}`),
  createLead: (data: Partial<CRMLead>) => api<{ lead: CRMLead }>('/crm/leads', { method: 'POST', body: data }),
  updateLead: (id: number, data: Partial<CRMLead>) => api<{ lead: CRMLead }>(`/crm/leads/${id}`, { method: 'PATCH', body: data }),
  deleteLead: (id: number) => api(`/crm/leads/${id}`, { method: 'DELETE' }),
  pipelineSummary: () => api<{ stages: CRMPipelineStage[] }>('/crm/leads/pipeline/summary'),

  // Activities
  getActivities: (leadId: number) => api<{ activities: CRMActivity[] }>(`/crm/leads/${leadId}/activities`),
  createActivity: (leadId: number, data: { activity_type: string; title: string; description?: string }) =>
    api<{ activity: CRMActivity }>(`/crm/leads/${leadId}/activities`, { method: 'POST', body: data }),

  // Site Visits
  getSiteVisits: (leadId: number) => api<{ visits: CRMSiteVisit[] }>(`/crm/leads/${leadId}/site-visits`),
  createSiteVisit: (leadId: number, data: Partial<CRMSiteVisit>) =>
    api<{ visit: CRMSiteVisit }>(`/crm/leads/${leadId}/site-visits`, { method: 'POST', body: data }),

  // Emails
  sendEmail: (leadId: number, data: { subject: string; body: string; template_id?: number; to_email?: string }) =>
    api(`/crm/leads/${leadId}/send-email`, { method: 'POST', body: data }),
  logInboundEmail: (leadId: number, data: { subject?: string; body: string; from_name?: string; received_at?: string }) =>
    api(`/crm/leads/${leadId}/emails/inbound`, { method: 'POST', body: data }),
  getEmailLog: (leadId: number) => api<{ emails: CRMEmailLog[] }>(`/crm/leads/${leadId}/emails`),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ tasks: CRMTask[] }>(`/crm/tasks${qs}`);
  },
  createTask: (data: { lead_id?: number; title: string; description?: string; due_date?: string; priority?: string }) =>
    api<{ task: CRMTask }>('/crm/tasks', { method: 'POST', body: data }),
  updateTask: (id: number, data: Partial<CRMTask>) => api<{ task: CRMTask }>(`/crm/tasks/${id}`, { method: 'PATCH', body: data }),
  deleteTask: (id: number) => api(`/crm/tasks/${id}`, { method: 'DELETE' }),

  // Email Templates
  getTemplates: () => api<{ templates: CRMEmailTemplate[] }>('/crm/emails/templates'),
  createTemplate: (data: { name: string; subject: string; body: string; template_type?: string }) =>
    api<{ template: CRMEmailTemplate }>('/crm/emails/templates', { method: 'POST', body: data }),
  updateTemplate: (id: number, data: Partial<CRMEmailTemplate>) =>
    api<{ template: CRMEmailTemplate }>(`/crm/emails/templates/${id}`, { method: 'PATCH', body: data }),
  deleteTemplate: (id: number) => api(`/crm/emails/templates/${id}`, { method: 'DELETE' }),

  // Sequences
  getSequences: () => api<{ sequences: CRMSequence[] }>('/crm/emails/sequences'),
  createSequence: (data: { name: string; description?: string; steps?: { step_order: number; template_id: number; delay_days: number }[] }) =>
    api<{ sequence: CRMSequence }>('/crm/emails/sequences', { method: 'POST', body: data }),

  // Settings
  getSettings: () => api<{ settings: { key: string; value: string }[] }>('/crm/settings'),
  updateSettings: (settings: Record<string, unknown>) => api('/crm/settings', { method: 'PATCH', body: { settings } }),
  getAutomationStatus: () => api<CRMAutomationStatus>('/crm/automation-status'),
  runAutoDiscovery: () => api<{ success: boolean; skipped?: boolean; queued?: number; considered?: number; reason?: string }>('/crm/discovery/auto-find/run', { method: 'POST' }),
  getDiscoveryReviewQueue: () => api<{ queue: DiscoveryQueueItem[] }>(`/crm/discovery/review-queue?_t=${Date.now()}`),
  replaceDiscoveryQueue: (candidates: unknown[]) =>
    api<{ success: boolean; queued: number }>('/crm/discovery/review-queue/replace', { method: 'POST', body: { candidates } }),
  submitDiscoveryQueueReview: (id: number, stars: number, notes?: string) =>
    api<{ success: boolean; action: 'imported' | 'rejected'; lead_id: number | null }>(`/crm/discovery/review-queue/${id}/submit`, { method: 'POST', body: { stars, notes: notes || null } }),

  // CMS Content
  getCmsContent: () => api<{ content: Record<string, string>; rows: CmsRow[] }>('/crm/content'),
  updateCmsContent: (updates: { key: string; value: string }[]) =>
    api<{ success: boolean; updated: number }>('/crm/content', { method: 'PUT', body: { updates } }),

  // Pipeline Stages
  getStages: () => api<{ stages: CRMStage[] }>('/crm/stages'),
  createStage: (data: { name: string; color: string; is_won?: boolean; is_lost?: boolean }) =>
    api<{ stage: CRMStage }>('/crm/stages', { method: 'POST', body: data }),
  updateStage: (id: number, data: Partial<CRMStage>) =>
    api<{ stage: CRMStage }>(`/crm/stages/${id}`, { method: 'PATCH', body: data }),
  deleteStage: (id: number) => api(`/crm/stages/${id}`, { method: 'DELETE' }),
  reorderStages: (order: { id: number; sort_order: number }[]) =>
    api('/crm/stages/reorder', { method: 'PATCH', body: { order } }),

  // Custom Fields
  getCustomFields: () => api<{ fields: CRMCustomField[] }>('/crm/custom-fields'),
  createCustomField: (data: { name: string; field_type: string; options?: { label: string; color: string }[]; show_in_table?: boolean }) =>
    api<{ field: CRMCustomField }>('/crm/custom-fields', { method: 'POST', body: data }),
  updateCustomField: (id: number, data: Partial<CRMCustomField>) =>
    api<{ field: CRMCustomField }>(`/crm/custom-fields/${id}`, { method: 'PATCH', body: data }),
  deleteCustomField: (id: number) => api(`/crm/custom-fields/${id}`, { method: 'DELETE' }),

  // Custom Values per lead
  getCustomValues: (leadId: number) => api<{ values: { field_id: number; value: string }[] }>(`/crm/leads/${leadId}/custom-values`),
  setCustomValues: (leadId: number, values: { field_id: number; value: string }[]) =>
    api(`/crm/leads/${leadId}/custom-values`, { method: 'PUT', body: { values } }),
  // Import & Enrich
  importLeads: (
    places: {
      name: string;
      description?: string;
      lat?: number;
      lng?: number;
      address?: string;
      google_place_id?: string;
      website?: string;
      google_rating?: number;
      google_reviews_count?: number;
      fit_score?: number;
      parking_confidence?: number;
      access_score?: number;
      campervan_priority?: number;
    }[],
    enrich: boolean,
    pipeline_stage?: string,
    priority?: string
  ) =>
    api<{ created: number; enriched: number; total: number; results: { name: string; id?: number; status: string; error?: string }[] }>('/crm/leads/import', { method: 'POST', body: { places, enrich, pipeline_stage, priority } }),
  enrichLead: (leadId: number) =>
    api<{ lead: CRMLead; enriched: Record<string, unknown> }>(`/crm/leads/${leadId}/enrich`, { method: 'POST', body: {} }),
  uploadContract: (leadId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api<{ success: boolean; contract_url: string }>(`/crm/leads/${leadId}/upload-contract`, { method: 'POST', body: fd });
  },
  searchPlaces: (q: string) =>
    api<{ places: Array<{ id: number; name: string; address: string; city: string; approval_status: string; place_type: string | null; price_per_night: number | null; owner_name: string; owner_email: string; owner_phone: string | null }> }>(`/crm/places/search?q=${encodeURIComponent(q)}`),
};
