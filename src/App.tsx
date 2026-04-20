import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";
import { PWAPrompt } from "./components/PWAPrompt";
import { RealtimeCacheProvider } from "./components/RealtimeCacheProvider";
import { CookieStorageNotice } from "./components/CookieStorageNotice";
import { queryClient } from "./lib/queryClient";

// Lazy-loaded pages (not needed on initial render)
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const FriendSuggestionsPage = lazy(() => import("./components/FriendSuggestionsPage").then(m => ({ default: m.FriendSuggestionsPage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then(m => ({ default: m.AuthPage })));
const LegalPage = lazy(() => import("./pages/LegalPage"));

// Admin pages (lazy loaded)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminMetrics = lazy(() => import("./pages/admin/AdminMetrics"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminPenalties = lazy(() => import("./pages/admin/AdminPenalties"));
const AdminActivityLogs = lazy(() => import("./pages/admin/AdminActivityLogs"));

const PageFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
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
                    <Route path="/auth" element={<Suspense fallback={<PageFallback />}><AuthPage /></Suspense>} />
                    <Route path="/u/:handle" element={<Suspense fallback={<PageFallback />}><PublicProfile /></Suspense>} />
                    <Route path="/perfil/:handle" element={<Suspense fallback={<PageFallback />}><PublicProfile /></Suspense>} />
                    <Route path="/user/:userId" element={<Suspense fallback={<PageFallback />}><UserProfilePage /></Suspense>} />
                    <Route path="/friend-suggestions" element={<Suspense fallback={<PageFallback />}><FriendSuggestionsPage /></Suspense>} />
                    <Route path="/termos" element={<Suspense fallback={<PageFallback />}><LegalPage /></Suspense>} />
                    <Route path="/events/join/:privateCode" element={<Index />} />
                    <Route path="/eventos/:eventId" element={<Index />} />

                    {/* Admin Backoffice */}
                    <Route path="/admin" element={<Suspense fallback={<PageFallback />}><AdminLayout /></Suspense>}>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
                      <Route path="reports" element={<Suspense fallback={<PageFallback />}><AdminReports /></Suspense>} />
                      <Route path="users" element={<Suspense fallback={<PageFallback />}><AdminUsers /></Suspense>} />
                      <Route path="events" element={<Suspense fallback={<PageFallback />}><AdminEvents /></Suspense>} />
                      <Route path="verifications" element={<Suspense fallback={<PageFallback />}><AdminVerifications /></Suspense>} />
                      <Route path="penalties" element={<Suspense fallback={<PageFallback />}><AdminPenalties /></Suspense>} />
                      <Route path="metrics" element={<Suspense fallback={<PageFallback />}><AdminMetrics /></Suspense>} />
                      <Route path="logs" element={<Suspense fallback={<PageFallback />}><AdminLogs /></Suspense>} />
                      <Route path="activity-logs" element={<Suspense fallback={<PageFallback />}><AdminActivityLogs /></Suspense>} />
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
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
