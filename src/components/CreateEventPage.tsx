import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PrivateLinkSuccess } from './create-event';
import { StepEssentials } from './create-event/StepEssentials';
import { StepDetails } from './create-event/StepDetails';
import { useEventForm } from '@/hooks/useEventForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface CreateEventPageProps {
  onBack: () => void;
}

export const CreateEventPage = ({ onBack }: CreateEventPageProps) => {
  const { isFeatureBlocked } = useAuthContext();
  const [step, setStep] = useState(1);
  const totalSteps = 2;

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
    handleSubmit,
    validateForm
  } = useEventForm(onBack);

  const handleContinue = useCallback(() => {
    // Validate step 1 essential fields only
    const step1Fields = ['title', 'category', 'date', 'time', 'state', 'city', 'location'] as const;
    let hasError = false;

    // Quick client-side check for empty required fields
    for (const field of step1Fields) {
      if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        hasError = true;
        break;
      }
    }

    if (hasError) {
      // Run full validation to show errors
      validateForm();
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [formData, validateForm]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      onBack();
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
            <p className="text-xs text-primary-foreground/70">Etapa {step} de {totalSteps}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <Progress value={(step / totalSteps) * 100} className="h-1.5" />
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <form onSubmit={handleSubmit} noValidate>
          {step === 1 && (
            <>
              <StepEssentials
                formData={formData}
                errors={errors}
                onInputChange={handleInputChange}
              />
              <div className="mt-8">
                <Button
                  type="button"
                  className="w-full h-12"
                  onClick={handleContinue}
                >
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
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={isSubmitting || generatingImage}
                >
                  {generatingImage ? 'Gerando capa...' : isSubmitting ? 'Criando...' : 'Criar Evento'}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
