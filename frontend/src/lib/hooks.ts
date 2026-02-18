import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import type {
  Subscription, SubscriptionCreate, PaymentMethod, PaymentMethodCreate,
  Category, DashboardSummary, CancellationLog, SavingsSummary,
  PriceHistory, SubscriptionMember, SharingPlatform, SharedSubscription,
  Organization, BankConnection, CalendarMonth, ImportResult, LogoSearchResult,
  AdminDashboard,
  CodefCardOrg, CodefRegisterCardRequest, CodefRegisterCardResponse,
  CodefScrapeResponse, CodefDetectResponse, CodefImportResponse, CodefStatus,
} from "./types";

// Subscriptions
export function useSubscriptions(params?: { is_active?: boolean; category_id?: number; payment_method_id?: number }) {
  return useQuery<Subscription[]>({
    queryKey: ["subscriptions", params],
    queryFn: () => api.get("/subscriptions", { params }).then((r) => r.data),
  });
}

export function useSubscription(id: number) {
  return useQuery<Subscription>({
    queryKey: ["subscription", id],
    queryFn: () => api.get(`/subscriptions/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubscriptionCreate) => api.post("/subscriptions", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Subscription> & { id: number }) => api.put(`/subscriptions/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => api.post(`/subscriptions/${id}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["cancellations"] }); },
  });
}

// Payment Methods
export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["paymentMethods"],
    queryFn: () => api.get("/payment-methods").then((r) => r.data),
  });
}

export function useExpiringCards(days = 30) {
  return useQuery<PaymentMethod[]>({
    queryKey: ["expiringCards", days],
    queryFn: () => api.get("/payment-methods/expiring", { params: { days } }).then((r) => r.data),
  });
}

export function useCardSubscriptions(id: number) {
  return useQuery<Subscription[]>({
    queryKey: ["cardSubscriptions", id],
    queryFn: () => api.get(`/payment-methods/${id}/subscriptions`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PaymentMethodCreate) => api.post("/payment-methods", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentMethods"] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PaymentMethod> & { id: number }) => api.put(`/payment-methods/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentMethods"] }),
  });
}

export function useMigratePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ oldId, newId, subscriptionIds }: { oldId: number; newId: number; subscriptionIds?: number[] }) =>
      api.post(`/payment-methods/${oldId}/migrate/${newId}`, { subscription_ids: subscriptionIds }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paymentMethods"] }); qc.invalidateQueries({ queryKey: ["subscriptions"] }); },
  });
}

// Categories
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => api.post("/categories", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// Dashboard
export function useDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard/summary").then((r) => r.data),
  });
}

// Cancellations
export function useCancellationLogs() {
  return useQuery<CancellationLog[]>({
    queryKey: ["cancellations"],
    queryFn: () => api.get("/cancellation-logs").then((r) => r.data),
  });
}

export function useSavingsSummary() {
  return useQuery<SavingsSummary>({
    queryKey: ["savingsSummary"],
    queryFn: () => api.get("/cancellation-logs/savings-summary").then((r) => r.data),
  });
}

// Price History
export function usePriceHistory(subscriptionId: number) {
  return useQuery<PriceHistory[]>({
    queryKey: ["priceHistory", subscriptionId],
    queryFn: () => api.get(`/subscriptions/${subscriptionId}/price-history`).then((r) => r.data),
    enabled: subscriptionId > 0,
  });
}

// Subscription Members
export function useSubscriptionMembers(subscriptionId: number) {
  return useQuery<SubscriptionMember[]>({
    queryKey: ["subscriptionMembers", subscriptionId],
    queryFn: () => api.get(`/subscriptions/${subscriptionId}/members`).then((r) => r.data),
    enabled: subscriptionId > 0,
  });
}

export function useAddSubscriptionMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subId, ...data }: { subId: number; name: string; email?: string; share_amount?: number; share_percentage?: number; is_owner?: boolean }) =>
      api.post(`/subscriptions/${subId}/members`, data).then((r) => r.data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["subscriptionMembers", v.subId] }),
  });
}

export function useRemoveSubscriptionMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subId, memberId }: { subId: number; memberId: number }) =>
      api.delete(`/subscriptions/${subId}/members/${memberId}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["subscriptionMembers", v.subId] }),
  });
}

// Sharing Platforms
export function useSharingPlatforms() {
  return useQuery<SharingPlatform[]>({
    queryKey: ["sharingPlatforms"],
    queryFn: () => api.get("/sharing-platforms").then((r) => r.data),
  });
}

// Shared Subscriptions
export function useSharedSubscriptions() {
  return useQuery<SharedSubscription[]>({
    queryKey: ["sharedSubscriptions"],
    queryFn: () => api.get("/shared-subscriptions").then((r) => r.data),
  });
}

export function useCreateSharedSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SharedSubscription, "id" | "user_id" | "created_at" | "updated_at" | "subscription_name" | "platform_name">) =>
      api.post("/shared-subscriptions", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sharedSubscriptions"] }),
  });
}

export function useDeleteSharedSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/shared-subscriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sharedSubscriptions"] }),
  });
}

// Organizations
export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });
}

export function useOrganization(id: number) {
  return useQuery<Organization>({
    queryKey: ["organization", id],
    queryFn: () => api.get(`/organizations/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.post("/organizations", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/organizations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useAddOrgMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, email, role }: { orgId: number; email: string; role: string }) =>
      api.post(`/organizations/${orgId}/members`, { user_email: email, role }).then((r) => r.data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["organization", v.orgId] }),
  });
}

export function useRemoveOrgMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, memberId }: { orgId: number; memberId: number }) =>
      api.delete(`/organizations/${orgId}/members/${memberId}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["organization", v.orgId] }),
  });
}

// Bank Connections
export function useBankConnections() {
  return useQuery<BankConnection[]>({
    queryKey: ["bankConnections"],
    queryFn: () => api.get("/bank-connections").then((r) => r.data),
  });
}

export function useCreateBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { institution_name: string; provider?: string; account_identifier?: string }) =>
      api.post("/bank-connections", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankConnections"] }),
  });
}

export function useDeleteBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/bank-connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankConnections"] }),
  });
}

// Calendar
export function useCalendarMonth(year: number, month: number) {
  return useQuery<CalendarMonth>({
    queryKey: ["calendar", year, month],
    queryFn: () => api.get(`/calendar/${year}/${month}`).then((r) => r.data),
  });
}

// Data Export/Import
export function useImportSubscriptions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<ImportResult>("/data/import/subscriptions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

// Logo Search
export function useLogoSearch(name: string) {
  return useQuery<LogoSearchResult>({
    queryKey: ["logo", name],
    queryFn: () => api.get("/logo/search", { params: { name } }).then((r) => r.data),
    enabled: name.length >= 2,
  });
}

// Admin
export function useAdminDashboard() {
  return useQuery<AdminDashboard>({
    queryKey: ["adminDashboard"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data),
  });
}

// Codef
export function useCodefStatus() {
  return useQuery<CodefStatus>({
    queryKey: ["codefStatus"],
    queryFn: () => api.get("/codef/status").then((r) => r.data),
  });
}

export function useCodefCardCompanies() {
  return useQuery<CodefCardOrg[]>({
    queryKey: ["codefCardCompanies"],
    queryFn: () => api.get("/codef/card-companies").then((r) => r.data),
  });
}

export function useCodefRegisterCard() {
  const qc = useQueryClient();
  return useMutation<CodefRegisterCardResponse, Error, CodefRegisterCardRequest>({
    mutationFn: (data) => api.post("/codef/register-card", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bankConnections"] }); },
  });
}

export function useCodefScrape() {
  return useMutation<CodefScrapeResponse, Error, { bank_connection_id: number; months_back?: number }>({
    mutationFn: (data) => api.post("/codef/scrape", data).then((r) => r.data),
  });
}

export function useCodefDetect() {
  const qc = useQueryClient();
  return useMutation<CodefDetectResponse, Error, { bank_connection_id: number; months_back?: number }>({
    mutationFn: (data) => api.post("/codef/detect", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bankConnections"] }); },
  });
}

export function useCodefImport() {
  const qc = useQueryClient();
  return useMutation<CodefImportResponse, Error, { bank_connection_id: number; subscriptions: { name: string; amount: number; billing_cycle: string; billing_day: number }[] }>({
    mutationFn: (data) => api.post("/codef/import", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["bankConnections"] }); },
  });
}

export function useCodefDeleteConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/codef/connection/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankConnections"] }),
  });
}
