import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface OnboardingData {
  fullName: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  city: string;
  state: string;
  interests: string[];
  availability: {
    periods: string[];
    days: string[];
  };
}

interface OnboardingContextType {
  step: number;
  setStep: (s: number) => void;
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  canSkip: boolean;
  totalSteps: number;
}

const STORAGE_KEY = 'juntoo_onboarding_progress';

const defaultData: OnboardingData = {
  fullName: '',
  avatarFile: null,
  avatarPreview: null,
  city: '',
  state: '',
  interests: [],
  availability: { periods: [], days: [] },
};

const OnboardingCtx = createContext<OnboardingContextType | null>(null);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
};

function loadSaved(): { step: number; data: Partial<OnboardingData> } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const OnboardingProvider = ({ children, initialName, initialAvatar, initialInterests }: {
  children: ReactNode;
  initialName?: string;
  initialAvatar?: string | null;
  initialInterests?: string[];
}) => {
  const saved = loadSaved();

  const [step, setStepRaw] = useState(saved?.step ?? 1);
  const [data, setData] = useState<OnboardingData>(() => ({
    ...defaultData,
    fullName: saved?.data?.fullName || initialName || '',
    avatarPreview: saved?.data?.avatarPreview || initialAvatar || null,
    city: saved?.data?.city || '',
    state: saved?.data?.state || '',
    interests: saved?.data?.interests || initialInterests || [],
    availability: saved?.data?.availability || defaultData.availability,
  }));

  const totalSteps = 4;

  const setStep = useCallback((s: number) => {
    setStepRaw(Math.max(1, Math.min(totalSteps, s)));
  }, []);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  // Persist to localStorage (excluding File objects)
  useEffect(() => {
    const serializable = {
      step,
      data: {
        fullName: data.fullName,
        avatarPreview: data.avatarPreview,
        city: data.city,
        state: data.state,
        interests: data.interests,
        availability: data.availability,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [step, data]);

  return (
    <OnboardingCtx.Provider value={{ step, setStep, data, updateData, canSkip: step >= 2, totalSteps }}>
      {children}
    </OnboardingCtx.Provider>
  );
};

export const clearOnboardingStorage = () => localStorage.removeItem(STORAGE_KEY);
