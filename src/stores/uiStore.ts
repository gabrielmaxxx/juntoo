/**
 * Store Zustand para estado de UI efêmero — dados que NÃO precisam de
 * persistência no servidor (apenas localStorage quando útil).
 *
 * Regra: tudo que vem do Supabase fica no React Query. O Zustand só gerencia
 * estado local de interface: filtros, wizard steps, modais, contadores visuais.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Tipos ────────────────────────────────────────────────

interface OnboardingState {
  currentStep: number;
  data: {
    name: string;
    avatarUrl: string;
    city: string;
    state: string;
    interests: string[];
    periods: string[];
    days: string[];
  };
}

interface EventWizardState {
  /** Passo atual do wizard de criação (0-indexed) */
  step: number;
  /** Dados parciais do formulário para persistir entre navegações */
  draft: Record<string, unknown>;
}

interface SearchFilters {
  text: string;
  category: string;
  state: string;
  city: string;
  date: Date | undefined;
  priceRange: 'all' | 'free' | 'paid';
}

interface ModalState {
  /** ID do modal aberto (null = nenhum) */
  activeModal: string | null;
  /** Dados extras passados ao modal (ex: eventId para confirmar participação) */
  modalData: Record<string, unknown>;
}

interface UIState {
  // ── Onboarding ──
  onboarding: OnboardingState;
  setOnboardingStep: (step: number) => void;
  setOnboardingData: (data: Partial<OnboardingState['data']>) => void;
  resetOnboarding: () => void;

  // ── Criação de evento (wizard) ──
  eventWizard: EventWizardState;
  setWizardStep: (step: number) => void;
  setWizardDraft: (draft: Record<string, unknown>) => void;
  resetWizard: () => void;

  // ── Filtros de busca ──
  searchFilters: SearchFilters;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  resetSearchFilters: () => void;

  // ── Contadores de não-lidos (cache visual, fonte é o React Query) ──
  unreadCounts: { notifications: number; messages: number; events: number };
  setUnreadCounts: (counts: Partial<UIState['unreadCounts']>) => void;

  // ── Modais / Sheets ──
  modal: ModalState;
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // ── Sidebar ──
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

// ─── Valores iniciais ─────────────────────────────────────

const initialOnboarding: OnboardingState = {
  currentStep: 0,
  data: { name: '', avatarUrl: '', city: '', state: '', interests: [], periods: [], days: [] },
};

const initialWizard: EventWizardState = { step: 0, draft: {} };

const initialFilters: SearchFilters = {
  text: '',
  category: '',
  state: '',
  city: '',
  date: undefined,
  priceRange: 'all',
};

// ─── Store ────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // ── Onboarding ──
      onboarding: initialOnboarding,
      setOnboardingStep: (step) =>
        set((s) => ({ onboarding: { ...s.onboarding, currentStep: step } })),
      setOnboardingData: (data) =>
        set((s) => ({
          onboarding: { ...s.onboarding, data: { ...s.onboarding.data, ...data } },
        })),
      resetOnboarding: () => set({ onboarding: initialOnboarding }),

      // ── Wizard ──
      eventWizard: initialWizard,
      setWizardStep: (step) =>
        set((s) => ({ eventWizard: { ...s.eventWizard, step } })),
      setWizardDraft: (draft) =>
        set((s) => ({ eventWizard: { ...s.eventWizard, draft: { ...s.eventWizard.draft, ...draft } } })),
      resetWizard: () => set({ eventWizard: initialWizard }),

      // ── Filtros ──
      searchFilters: initialFilters,
      setSearchFilters: (filters) =>
        set((s) => ({ searchFilters: { ...s.searchFilters, ...filters } })),
      resetSearchFilters: () => set({ searchFilters: initialFilters }),

      // ── Não-lidos ──
      unreadCounts: { notifications: 0, messages: 0, events: 0 },
      setUnreadCounts: (counts) =>
        set((s) => ({ unreadCounts: { ...s.unreadCounts, ...counts } })),

      // ── Modais ──
      modal: { activeModal: null, modalData: {} },
      openModal: (id, data = {}) =>
        set({ modal: { activeModal: id, modalData: data } }),
      closeModal: () => set({ modal: { activeModal: null, modalData: {} } }),

      // ── Sidebar ──
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'juntoo-ui-store',
      storage: createJSONStorage(() => localStorage),
      // Só persiste onboarding e wizard (filtros e contadores resetam ao abrir)
      partialize: (state) => ({
        onboarding: state.onboarding,
        eventWizard: state.eventWizard,
      }),
    }
  )
);
