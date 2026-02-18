export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  card_last_four: string | null;
  card_type: string;
  expiry_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  subscription_count?: number;
  total_monthly_cost?: number;
}

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  billing_day: number | null;
  next_payment_date: string;
  category_id: number | null;
  payment_method_id: number | null;
  cancel_url: string | null;
  cancel_method: string | null;
  is_active: boolean;
  auto_renew: boolean;
  start_date: string;
  logo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  category_name?: string | null;
  category_color?: string | null;
  payment_method_name?: string | null;
  payment_method_last_four?: string | null;
}

export interface CancellationLog {
  id: number;
  subscription_id: number;
  cancelled_at: string;
  reason: string | null;
  savings_per_month: number | null;
  subscription_name: string | null;
}

export interface UpcomingPayment {
  subscription_name: string;
  amount: number;
  date: string;
  days_until: number;
}

export interface CategorySpending {
  category_name: string;
  color: string;
  total_amount: number;
  percentage: number;
}

export interface CardSpending {
  card_name: string;
  card_last_four: string | null;
  total_amount: number;
  subscription_count: number;
}

export interface DashboardSummary {
  total_monthly_cost: number;
  total_yearly_cost: number;
  active_count: number;
  upcoming_payments: UpcomingPayment[];
  category_breakdown: CategorySpending[];
  card_breakdown: CardSpending[];
  total_savings_from_cancellations: number;
}

export interface SavingsSummary {
  total_monthly_savings: number;
  total_cumulative_savings: number;
  cancellation_count: number;
}

export interface SubscriptionCreate {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  billing_day?: number | null;
  next_payment_date: string;
  category_id?: number | null;
  payment_method_id?: number | null;
  cancel_url?: string | null;
  cancel_method?: string | null;
  start_date: string;
  logo_url?: string | null;
  notes?: string | null;
}

export interface PaymentMethodCreate {
  name: string;
  card_last_four?: string | null;
  card_type: string;
  expiry_date?: string | null;
  notes?: string | null;
}

// Phase 2 types

export interface PriceHistory {
  id: number;
  subscription_id: number;
  old_amount: number;
  new_amount: number;
  old_currency: string;
  new_currency: string;
  changed_at: string;
  notes: string | null;
}

export interface SubscriptionMember {
  id: number;
  subscription_id: number;
  name: string;
  email: string | null;
  share_amount: number | null;
  share_percentage: number | null;
  is_owner: boolean;
  created_at: string;
}

export interface SharingPlatform {
  id: number;
  name: string;
  url: string | null;
  logo_url: string | null;
  description: string | null;
  created_at: string;
}

export interface SharedSubscription {
  id: number;
  subscription_id: number;
  platform_id: number;
  user_id: number;
  my_role: string;
  monthly_share_cost: number;
  total_members: number;
  party_status: string;
  deposit_paid: number | null;
  platform_fee: number | null;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  subscription_name?: string | null;
  platform_name?: string | null;
}

export interface Organization {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  members?: OrgMember[];
}

export interface OrgMember {
  id: number;
  organization_id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  role: string;
  joined_at: string;
}

export interface BankConnection {
  id: number;
  user_id: number;
  provider: string;
  institution_name: string;
  organization_code: string | null;
  connected_id: string | null;
  account_identifier: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
}

// Codef types
export interface CodefCardOrg {
  code: string;
  name: string;
  required_fields: string[];
  optional_fields: string[];
  notes: string;
}

export interface CodefRegisterCardRequest {
  organization_code: string;
  login_id: string;
  login_password: string;
  birthday?: string;
  card_no?: string;
  card_password?: string;
}

export interface CodefRegisterCardResponse {
  connected_id: string;
  bank_connection_id: number;
  organization_code: string;
  organization_name: string;
  message: string;
}

export interface CodefTransaction {
  date: string;
  time: string;
  merchant: string;
  amount: string;
  status: string;
  card_name: string;
  card_no: string;
  category: string;
}

export interface CodefScrapeResponse {
  transactions: CodefTransaction[];
  total_count: number;
}

export interface DetectedSubscription {
  name: string;
  amount: number;
  billing_cycle: string;
  billing_day: number;
  occurrence_count: number;
  last_payment_date: string;
  card_no: string;
  category: string;
}

export interface CodefDetectResponse {
  detected: DetectedSubscription[];
  total_transactions_analyzed: number;
}

export interface CodefImportResponse {
  imported: number;
  skipped: number;
  details: string[];
}

export interface CodefStatus {
  configured: boolean;
  demo_mode: boolean;
  base_url: string;
}

export interface CalendarEvent {
  subscription_id: number;
  subscription_name: string;
  amount: number;
  currency: string;
  date: string;
  logo_url: string | null;
}

export interface CalendarMonth {
  year: number;
  month: number;
  events: CalendarEvent[];
  total_amount: number;
}

export interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface LogoSearchResult {
  logo_url: string;
  source: string;
}

// Admin types
export interface AdminUserSummary {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
}

export interface AdminSubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  total_monthly_revenue: number;
  avg_monthly_per_user: number;
}

export interface AdminTopService {
  name: string;
  count: number;
  total_monthly_amount: number;
}

export interface AdminTopCard {
  card_type: string;
  count: number;
  total_monthly_amount: number;
}

export interface AdminCategoryStats {
  category_name: string;
  subscription_count: number;
  total_monthly_amount: number;
}

export interface AdminRecentUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
  subscription_count: number;
}

export interface AdminDashboard {
  user_summary: AdminUserSummary;
  subscription_stats: AdminSubscriptionStats;
  top_services: AdminTopService[];
  top_cards: AdminTopCard[];
  category_stats: AdminCategoryStats[];
  recent_users: AdminRecentUser[];
}
