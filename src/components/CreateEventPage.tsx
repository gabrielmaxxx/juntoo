import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, PartyPopper, Share2, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PrivateLinkSuccess } from './create-event';
import { StepEssentials } from './create-event/StepEssentials';
import { StepDetails } from './create-event/StepDetails';
import { TemplatePicker } from './create-event/TemplatePicker';
import { useEventForm } from '@/hooks/useEventForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { EventFormData } from '@/lib/validations/eventSchema';
import { Confetti } from '@/components/ui/confetti';
import { useGeolocation } from '@/hooks/useGeolocation';
import { BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';

interface CreateEventPageProps {
  onBack: () => void;
}

// step 0 = template picker, 1 = essentials, 2 = details
type Step = 0 | 1 | 2;

export const CreateEventPage = ({ onBack }: CreateEventPageProps) => {
  const { isFeatureBlocked } = useAuthContext();
  const [step, setStep] = useState<Step>(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const totalFormSteps = 2;

  const handleSuccess = useCallback(() => {
    setShowSuccess(true);
    setShowConfetti(true);
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
    validateForm
  } = useEventForm(handleSuccess);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    await originalHandleSubmit(e);
  }, [originalHandleSubmit]);

  const handleTemplateSelect = useCallback((prefill: Partial<EventFormData>) => {
    Object.entries(prefill).forEach(([key, value]) => {
      if (value !== undefined) {
        handleInputChange(key as keyof EventFormData, value as string | boolean);
      }
    });
    setStep(1);
  }, [handleInputChange]);

  const handleContinue = useCallback(() => {
    const step1Fields = ['title', 'category', 'date', 'time', 'state', 'city', 'location'] as const;
    let hasError = false;
    for (const field of step1Fields) {
      if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        hasError = true;
        break;
      }
    }
    if (hasError) {
      validateForm();
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [formData, validateForm]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      onBack();
    } else if (step === 1) {
      setStep(0);
    } else {
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, onBack]);

  // Block if feature is restricted
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

  const formStep = step as 1 | 2;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="text-primary-foreground hover:bg-primary-foreground/20" aria-label="Voltar">
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Criar Evento</h1>
            {step > 0 && (
              <p className="text-xs text-primary-foreground/70">Etapa {step} de {totalFormSteps}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress — only on form steps */}
      {step > 0 && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <Progress value={(step / totalFormSteps) * 100} className="h-1.5" />
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {step === 0 && (
          <TemplatePicker
            onSelect={handleTemplateSelect}
            onSkip={() => setStep(1)}
          />
        )}

        {step > 0 && (
          <form onSubmit={handleSubmit} noValidate>
            {step === 1 && (
              <>
                <StepEssentials formData={formData} errors={errors} onInputChange={handleInputChange} />
                <div className="mt-8">
                  <Button type="button" className="w-full h-12" onClick={handleContinue}>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <StepDetails
                  formData={formData}
                  errors={errors}
                  uploadingImage={uploadingImage}
                  generatingImage={generatingImage}
                  onInputChange={handleInputChange}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={removeImage}
                  onGenerateCover={generateCoverImage}
                />
                <div className="mt-8">
                  <Button type="submit" className="w-full h-12" disabled={isSubmitting || generatingImage}>
                    {generatingImage ? 'Gerando capa...' : isSubmitting ? 'Criando...' : 'Criar Evento'}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
