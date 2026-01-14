import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { eventFormSchema, EventFormData, defaultEventFormData } from '@/lib/validations/eventSchema';

interface UseEventFormResult {
  formData: EventFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  generatingImage: boolean;
  uploadingImage: boolean;
  privateLink: string;
  handleInputChange: (field: keyof EventFormData, value: string | boolean) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeImage: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  validateForm: () => boolean;
}

export const useEventForm = (onSuccess: () => void): UseEventFormResult => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<EventFormData>(defaultEventFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [privateLink, setPrivateLink] = useState('');

  const handleInputChange = useCallback((field: keyof EventFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const result = eventFormSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          newErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(newErrors);
      
      // Show first error as toast
      const firstError = result.error.errors[0];
      if (firstError) {
        toast({
          title: "Erro de validação",
          description: firstError.message,
          variant: "destructive"
        });
      }
      return false;
    }
    
    setErrors({});
    return true;
  }, [formData, toast]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem JPG, PNG ou WebP.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `event-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
      
      toast({
        title: "Imagem carregada!",
        description: "A foto de capa foi carregada com sucesso.",
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar a imagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = useCallback(() => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  }, []);

  const generateRecurringEvents = (parentEvent: any, formData: EventFormData) => {
    const events = [];
    const startDate = new Date(formData.date);
    const endDate = formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate) : null;
    
    const maxOccurrences = 52;
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    while (occurrenceCount < maxOccurrences) {
      switch (formData.recurrenceType) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          return events;
      }

      if (endDate && currentDate > endDate) {
        break;
      }

      events.push({
        title: parentEvent.title,
        description: parentEvent.description,
        category: parentEvent.category,
        state: parentEvent.state,
        city: parentEvent.city,
        location: parentEvent.location,
        date: currentDate.toISOString().split('T')[0],
        time: parentEvent.time,
        price: parentEvent.price,
        max_participants: parentEvent.max_participants,
        is_private: parentEvent.is_private,
        is_recurring: false,
        recurrence_type: 'none',
        parent_event_id: parentEvent.id,
        image_url: parentEvent.image_url,
        created_by: parentEvent.created_by
      });

      occurrenceCount++;
    }

    return events;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para criar eventos.",
          variant: "destructive"
        });
        return;
      }

      let imageUrl = formData.imageUrl;

      // Generate image if not uploaded
      if (!imageUrl) {
        setGeneratingImage(true);
        toast({
          title: "Gerando capa...",
          description: "Criando uma imagem para o seu evento.",
        });

        try {
          const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-event-image', {
            body: { category: formData.category || 'Outro' }
          });

          if (imageError) throw imageError;
          
          if (imageData?.imageUrl) {
            imageUrl = imageData.imageUrl;
          }
        } catch (error) {
          console.error('Error generating image:', error);
          toast({
            title: "Aviso",
            description: "Não foi possível gerar a imagem automaticamente. O evento será criado sem capa.",
            variant: "destructive"
          });
        } finally {
          setGeneratingImage(false);
        }
      }

      const eventData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        category: formData.category,
        state: formData.state,
        city: formData.city,
        location: formData.location.trim(),
        date: formData.date,
        time: formData.time,
        price: formData.price ? parseFloat(formData.price) : 0,
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        is_private: formData.isPrivate,
        is_recurring: formData.isRecurring,
        recurrence_type: formData.isRecurring ? formData.recurrenceType : 'none',
        recurrence_end_date: formData.isRecurring && formData.recurrenceEndDate ? formData.recurrenceEndDate : null,
        image_url: imageUrl || null,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from('event_participants')
        .insert({ event_id: data.id, user_id: user.id });

      // Generate recurring events if needed
      if (formData.isRecurring && formData.recurrenceType !== 'none') {
        const recurringEvents = generateRecurringEvents(data, formData);
        
        if (recurringEvents.length > 0) {
          await supabase.from('events').insert(recurringEvents);
        }
      }

      if (data?.is_private && data?.private_code) {
        const link = `${window.location.origin}/events/join/${data.private_code}`;
        setPrivateLink(link);
      }

      toast({
        title: "Evento criado com sucesso!",
        description: formData.isPrivate 
          ? "Seu evento privado foi criado. Compartilhe o link para convidar participantes."
          : formData.isRecurring 
            ? "Seu evento e suas repetições foram criados com sucesso."
            : "Seu evento público foi criado e já está visível para todos.",
      });

      if (!formData.isPrivate) {
        onSuccess();
      }

    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: "Erro ao criar evento",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    generatingImage,
    uploadingImage,
    privateLink,
    handleInputChange,
    handleImageUpload,
    removeImage,
    handleSubmit,
    validateForm
  };
};
