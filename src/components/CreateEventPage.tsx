import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, PartyPopper, Share2, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PrivateLinkSuccess } from './create-event';
import { WizardCategory } from './create-event/WizardCategory';
import { WizardTitle } from './create-event/WizardTitle';
import { WizardDescription } from './create-event/WizardDescription';
import { WizardDateTime } from './create-event/WizardDateTime';
import { WizardLocation } from './create-event/WizardLocation';
import { WizardCapacity } from './create-event/WizardCapacity';
import { WizardPreview } from './create-event/WizardPreview';
import { useEventForm } from '@/hooks/useEventForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { EventFormData } from '@/lib/validations/eventSchema';
import { Confetti } from '@/components/ui/confetti';
import { motion, AnimatePresence } from 'framer-motion';

const DRAFT_KEY = 'juntoo_event_draft';
const TOTAL_STEPS = 7; // 0=category, 1=title, 2=desc, 3=datetime, 4=location, 5=capacity, 6=preview

interface CreateEventPageProps {
  onBack: () => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export const CreateEventPage = ({ onBack }: CreateEventPageProps) => {
  const { isFeatureBlocked } = useAuthContext();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSuccess = useCallback(() => {
    setShowSuccess(true);
    setShowConfetti(true);
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const {
    formData,
    errors,
    isSubmitting,
    generatingImage,
    uploadingImage,
    privateLink,
    handleInputChange,
    handleImageUpload,
    removeImage,
    generateCoverImage,
    handleSubmit: originalHandleSubmit,
    validateForm,
  } = useEventForm(handleSuccess);

  // Restore draft from localStorage
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.data) {
          Object.entries(parsed.data).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
              handleInputChange(key as keyof EventFormData, value as string | boolean);
            }
          });
        }
      }
    } catch { /* ignore */ }
  }, [handleInputChange]);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data: formData }));
    }, 500);
    return () => clearTimeout(timer);
  }, [step, formData]);

  const goTo = useCallback((target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }, [step]);

  const next = useCallback(() => goTo(step + 1), [goTo, step]);
  const prev = useCallback(() => {
    if (step === 0) onBack();
    else goTo(step - 1);
  }, [goTo, step, onBack]);

  const handleCategorySelect = useCallback((category: string) => {
    handleInputChange('category', category);
    // Auto-advance after short delay
    setTimeout(() => {
      setDirection(1);
      setStep(1);
    }, 200);
  }, [handleInputChange]);

  const handleFieldChange = useCallback((field: string, value: string | boolean) => {
    handleInputChange(field as keyof EventFormData, value);
  }, [handleInputChange]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      // Find first missing required field and go to that step
      if (!formData.category) return goTo(0);
      if (formData.title.trim().length < 3) return goTo(1);
      if (!formData.date || !formData.time) return goTo(3);
      if (!formData.state || !formData.city || formData.location.trim().length < 3) return goTo(4);
      return;
    }
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await originalHandleSubmit(fakeEvent);
  }, [validateForm, originalHandleSubmit, formData, goTo]);

  // Feature blocked
  if (isFeatureBlocked('create_events')) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="bg-primary text-primary-foreground p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/20" aria-label="Voltar">
              <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            </Button>
            <h1 className="text-xl font-bold">Criar Evento</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center mt-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Função bloqueada</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Sua permissão para criar eventos foi temporariamente bloqueada por um moderador.
          </p>
          <Button variant="outline" onClick={onBack}>Voltar</Button>
        </div>
      </div>
    );
  }

  if (privateLink) {
    return <PrivateLinkSuccess privateLink={privateLink} onBack={onBack} />;
  }

  if (showSuccess) {
    return (
      <>
        <Confetti active={showConfetti} />
        <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
          <div className="text-center space-y-5 max-w-sm animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-[bounce_0.6s_ease-out]">
              <PartyPopper className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Seu evento foi criado! 🎉</h1>
              <p className="text-sm text-muted-foreground">
                O evento já está visível para todos. Compartilhe com seus amigos para reunir mais pessoas!
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-2.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Eventos compartilhados têm <strong className="text-primary">3x mais</strong> participantes</span>
            </div>
            <div className="space-y-2 pt-2">
              <Button className="w-full h-12" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: formData.title, text: `Vem pro evento "${formData.title}"!`, url: window.location.origin }).catch(() => {});
                } else {
                  const text = encodeURIComponent(`Vem pro evento "${formData.title}"! ${window.location.origin}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }
              }}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar evento
              </Button>
              <Button variant="outline" className="w-full h-12" onClick={onBack}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir para o início
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const STEP_LABELS = ['Categoria', 'Nome', 'Descrição', 'Data', 'Local', 'Vagas', 'Revisar'];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shrink-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-semibold">Criar Evento</h1>
            <p className="text-xs text-primary-foreground/70">
              {STEP_LABELS[step]} • Etapa {step + 1} de {TOTAL_STEPS}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto w-full px-4 pt-3 shrink-0">
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} className="h-1.5" />
      </div>

      {/* Step content with slide animation */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {step === 0 && (
                <WizardCategory
                  selected={formData.category}
                  onSelect={handleCategorySelect}
                />
              )}

              {step === 1 && (
                <WizardTitle
                  title={formData.title}
                  category={formData.category}
                  onChange={(v) => handleInputChange('title', v)}
                  onNext={next}
                />
              )}

              {step === 2 && (
                <WizardDescription
                  description={formData.description || ''}
                  onChange={(v) => handleInputChange('description', v)}
                  onNext={next}
                  onSkip={next}
                />
              )}

              {step === 3 && (
                <WizardDateTime
                  date={formData.date}
                  time={formData.time}
                  isRecurring={formData.isRecurring}
                  recurrenceType={formData.recurrenceType}
                  recurrenceEndDate={formData.recurrenceEndDate || ''}
                  onChange={handleFieldChange}
                  onNext={next}
                />
              )}

              {step === 4 && (
                <WizardLocation
                  state={formData.state}
                  city={formData.city}
                  location={formData.location}
                  onChange={handleFieldChange}
                  onNext={next}
                />
              )}

              {step === 5 && (
                <WizardCapacity
                  maxParticipants={formData.maxParticipants || ''}
                  isPrivate={formData.isPrivate}
                  price={formData.price || ''}
                  onChange={handleFieldChange}
                  onNext={next}
                />
              )}

              {step === 6 && (
                <WizardPreview
                  formData={formData}
                  isSubmitting={isSubmitting}
                  generatingImage={generatingImage}
                  uploadingImage={uploadingImage}
                  onSubmit={handleSubmit}
                  onEdit={goTo}
                  onImageUpload={handleImageUpload}
                  onGenerateCover={generateCoverImage}
                  onRemoveImage={removeImage}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
