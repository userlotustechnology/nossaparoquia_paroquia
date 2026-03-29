export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Parish {
  id: number;
  name: string;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  is_active: boolean;
}

export interface AdminPermissions {
  parish_role: 'sacerdote' | 'secretaria';
  parish: Parish;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  permissions: AdminPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Parishioner {
  id: number;
  user_id: number | null;
  parish_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_tither: boolean;
  family_id: number | null;
  family_name?: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  parish_id: number;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  type: string | null;
  status: string | null;
  is_active: boolean;
  max_participants: number | null;
  registration_fee: number | null;
  requires_approval: boolean;
  registration_open: boolean;
  is_public: boolean;
  participants_count?: number;
  banner_path: string | null;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: number;
  parish_id: number;
  account_plan_id: number | null;
  account_plan_name?: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  reference: string | null;
  category: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  parishioners_count: number;
  families_count: number;
  tithes_this_month: number;
  tithes_last_month: number;
  events_upcoming: number;
  income_this_month: number;
  expense_this_month: number;
  recent_parishioners: Parishioner[];
  upcoming_events: Event[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
