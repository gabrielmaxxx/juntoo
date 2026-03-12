import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserProfilePage from "./pages/UserProfilePage";
import { FriendSuggestionsPage } from "./components/FriendSuggestionsPage";
import { AuthPage } from "./pages/AuthPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";
import { PWAPrompt } from "./components/PWAPrompt";
import { RealtimeCacheProvider } from "./components/RealtimeCacheProvider";

// Admin pages (lazy loaded)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminMetrics = lazy(() => import("./pages/admin/AdminMetrics"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const AdminFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeCacheProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAPrompt />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/user/:userId" element={<UserProfilePage />} />
                  <Route path="/friend-suggestions" element={<FriendSuggestionsPage />} />

                  {/* Admin Backoffice */}
                  <Route path="/admin" element={<Suspense fallback={<AdminFallback />}><AdminLayout /></Suspense>}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
                    <Route path="reports" element={<Suspense fallback={<AdminFallback />}><AdminReports /></Suspense>} />
                    <Route path="users" element={<Suspense fallback={<AdminFallback />}><AdminUsers /></Suspense>} />
                    <Route path="events" element={<Suspense fallback={<AdminFallback />}><AdminEvents /></Suspense>} />
                    <Route path="verifications" element={<Suspense fallback={<AdminFallback />}><AdminVerifications /></Suspense>} />
                    <Route path="metrics" element={<Suspense fallback={<AdminFallback />}><AdminMetrics /></Suspense>} />
                    <Route path="logs" element={<Suspense fallback={<AdminFallback />}><AdminLogs /></Suspense>} />
                  </Route>

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </RealtimeCacheProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
