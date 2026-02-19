import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Subscriptions from "./pages/Subscriptions";
import SubscriptionForm from "./pages/SubscriptionForm";
import SubscriptionDetail from "./pages/SubscriptionDetail";
import PaymentMethods from "./pages/PaymentMethods";
import PaymentMethodForm from "./pages/PaymentMethodForm";
import PaymentMethodDetail from "./pages/PaymentMethodDetail";
import Cancellations from "./pages/Cancellations";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Calendar from "./pages/Calendar";
import SharingPlatforms from "./pages/SharingPlatforms";
import Organizations from "./pages/Organizations";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로딩 중...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로딩 중...</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로딩 중...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />

            {/* Protected routes */}
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/subscriptions/new" element={<SubscriptionForm />} />
              <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
              <Route path="/subscriptions/:id/edit" element={<SubscriptionForm />} />
              <Route path="/cards" element={<PaymentMethods />} />
              <Route path="/cards/new" element={<PaymentMethodForm />} />
              <Route path="/cards/:id" element={<PaymentMethodDetail />} />
              <Route path="/cancellations" element={<Cancellations />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/sharing" element={<SharingPlatforms />} />
              <Route path="/organizations" element={<Organizations />} />
            </Route>

            {/* Admin routes */}
            <Route element={<AdminGuard><AppLayout /></AdminGuard>}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
