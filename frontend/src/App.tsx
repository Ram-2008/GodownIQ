import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./layout/AppLayout";
import { FullScreenSpinner } from "./components/FullScreenSpinner";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";
import { StaffSignupRequestPage } from "./pages/StaffSignupRequest";
import { ForgotPasswordPage } from "./pages/ForgotPassword";
import { ResetPasswordPage } from "./pages/ResetPassword";

const PurchaseEntryPage = lazy(() => import("./pages/PurchaseEntry").then((m) => ({ default: m.PurchaseEntryPage })));
const PurchaseHistoryPage = lazy(() => import("./pages/PurchaseHistory").then((m) => ({ default: m.PurchaseHistoryPage })));
const ExpensesPage = lazy(() => import("./pages/Expenses").then((m) => ({ default: m.ExpensesPage })));
const DashboardPage = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const CalendarPage = lazy(() => import("./pages/Calendar").then((m) => ({ default: m.CalendarPage })));
const StockPage = lazy(() => import("./pages/Stock").then((m) => ({ default: m.StockPage })));
const PaymentsPage = lazy(() => import("./pages/Payments").then((m) => ({ default: m.PaymentsPage })));
const ReportsPage = lazy(() => import("./pages/Reports").then((m) => ({ default: m.ReportsPage })));
const MonthlyComparisonPage = lazy(() => import("./pages/MonthlyComparison").then((m) => ({ default: m.MonthlyComparisonPage })));
const SupplierComparisonPage = lazy(() => import("./pages/SupplierComparison").then((m) => ({ default: m.SupplierComparisonPage })));
const SupplierIncidentsPage = lazy(() => import("./pages/SupplierIncidents").then((m) => ({ default: m.SupplierIncidentsPage })));
const ForecastPage = lazy(() => import("./pages/Forecast").then((m) => ({ default: m.ForecastPage })));
const ActivityLogPage = lazy(() => import("./pages/ActivityLog").then((m) => ({ default: m.ActivityLogPage })));
const UsersPage = lazy(() => import("./pages/Users").then((m) => ({ default: m.UsersPage })));

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<FullScreenSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/request-access" element={<StaffSignupRequestPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entry"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PurchaseEntryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PurchaseHistoryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CalendarPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <StockPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ExpensesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <PaymentsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/comparison"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <MonthlyComparisonPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <SupplierComparisonPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <ForecastPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier-incidents"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout><SupplierIncidentsPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <ActivityLogPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <UsersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
