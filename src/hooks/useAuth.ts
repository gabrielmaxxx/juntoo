// Re-export from AuthContext for backward compatibility
// All auth state is now managed by AuthContext for single source of truth
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
export type { UserProfile } from '@/contexts/AuthContext';
