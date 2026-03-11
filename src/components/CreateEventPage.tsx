import { Button } from '@/components/ui/button';
import {
  EventFormHeader,
  BasicInfoSection,
  DateTimeSection,
  LocationSection,
  AdditionalDetailsSection,
  PrivacySection,
  PrivateLinkSuccess
} from './create-event';
import { useEventForm } from '@/hooks/useEventForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface CreateEventPageProps {
  onBack: () => void;
}

export const CreateEventPage = ({ onBack }: CreateEventPageProps) => {
  const { isFeatureBlocked } = useAuthContext();
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
    handleSubmit
  } = useEventForm(onBack);

  // Block if feature is restricted
  if (isFeatureBlocked('create_events')) {
    return (
      <div className="min-h-dvh bg-background">
        <EventFormHeader onBack={onBack} />
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

  // Show success screen for private events
  if (privateLink) {
    return <PrivateLinkSuccess privateLink={privateLink} onBack={onBack} />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <EventFormHeader onBack={onBack} />

      <div className="max-w-lg mx-auto px-4 pb-24 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 pb-6" noValidate>
          <BasicInfoSection
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          <DateTimeSection
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          <LocationSection
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          <AdditionalDetailsSection
            formData={formData}
            errors={errors}
            uploadingImage={uploadingImage}
            generatingImage={generatingImage}
            onInputChange={handleInputChange}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onGenerateCover={generateCoverImage}
          />

          <PrivacySection
            formData={formData}
            onInputChange={handleInputChange}
          />

          <Button 
            type="submit" 
            className="w-full h-12" 
            disabled={isSubmitting || generatingImage}
          >
            {generatingImage ? 'Gerando capa...' : isSubmitting ? 'Criando...' : 'Criar Evento'}
          </Button>
        </form>
      </div>
    </div>
  );
};
