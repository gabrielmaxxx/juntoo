import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Lock, Share2, Copy, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';

interface CreateEventPageProps {
  onBack: () => void;
}

export const CreateEventPage = ({ onBack }: CreateEventPageProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [privateLink, setPrivateLink] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    state: '',
    city: '',
    location: '',
    date: '',
    time: '',
    price: '',
    maxParticipants: '',
    isPrivate: false,
    isRecurring: false,
    recurrenceType: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
    recurrenceEndDate: '',
    imageUrl: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const categories = [
    'Esportes',
    'Música',
    'Arte',
    'Tecnologia',
    'Culinária',
    'Fitness',
    'Educação',
    'Social',
    'Negócios',
    'Outro'
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 5MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
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

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Generate image if no image was uploaded
      if (!imageUrl && formData.category) {
        setGeneratingImage(true);
        toast({
          title: "Gerando capa...",
          description: "Criando uma imagem para o seu evento.",
        });

        try {
          const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-event-image', {
            body: { category: formData.category }
          });

          if (imageError) throw imageError;
          
          if (imageData?.imageUrl) {
            imageUrl = imageData.imageUrl;
            console.log('Image generated successfully');
          }
        } catch (error) {
          console.error('Error generating image:', error);
          // Continue without image if generation fails
          toast({
            title: "Aviso",
            description: "Não foi possível gerar a imagem automaticamente. O evento será criado sem capa.",
            variant: "destructive"
          });
        } finally {
          setGeneratingImage(false);
        }
      }

      // Criar o evento principal
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        state: formData.state,
        city: formData.city,
        location: formData.location,
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

      if (error) {
        throw error;
      }

      // Adicionar criador como participante
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: data.id,
          user_id: user.id
        });

      if (participantError) {
        console.error('Erro ao adicionar criador como participante:', participantError);
      }

      // Gerar eventos recorrentes se necessário
      if (formData.isRecurring && formData.recurrenceType !== 'none') {
        const recurringEvents = generateRecurringEvents(data, formData);
        
        if (recurringEvents.length > 0) {
          const { error: recurringError } = await supabase
            .from('events')
            .insert(recurringEvents);

          if (recurringError) {
            console.error('Erro ao criar eventos recorrentes:', recurringError);
            toast({
              title: "Aviso",
              description: "O evento principal foi criado, mas houve erro ao criar as repetições.",
              variant: "destructive"
            });
          }
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
        onBack();
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

  // Função para gerar eventos recorrentes
  const generateRecurringEvents = (parentEvent: any, formData: any) => {
    const events = [];
    const startDate = new Date(formData.date);
    const endDate = formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate) : null;
    
    // Limitar a 52 repetições (1 ano) se não houver data de término
    const maxOccurrences = 52;
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    while (occurrenceCount < maxOccurrences) {
      // Calcular próxima data baseado no tipo de recorrência
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

      // Verificar se ultrapassou a data de término
      if (endDate && currentDate > endDate) {
        break;
      }

      // Criar evento recorrente
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
        is_recurring: false, // Eventos filhos não são recorrentes
        recurrence_type: 'none',
        parent_event_id: parentEvent.id,
        image_url: parentEvent.image_url,
        created_by: parentEvent.created_by
      });

      occurrenceCount++;
    }

    return events;
  };

  const copyPrivateLink = () => {
    navigator.clipboard.writeText(privateLink);
    toast({
      title: "Link copiado!",
      description: "O link do evento privado foi copiado para a área de transferência.",
    });
  };

  if (privateLink) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center">
                <Lock className="w-5 h-5 text-primary" />
                Evento Privado Criado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Seu evento privado foi criado com sucesso! Compartilhe este link único para convidar participantes:
              </p>
              
              <div className="p-3 bg-muted rounded-lg break-all text-sm">
                {privateLink}
              </div>
              
              <div className="flex gap-2">
                <Button onClick={copyPrivateLink} className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(privateLink)}`, '_blank')}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              
              <Button onClick={onBack} variant="outline" className="w-full">
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Criar Evento</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Evento *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Futebol no parque"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva seu evento..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Data, Horário e Recorrência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="recurring">Evento Recorrente</Label>
                    <p className="text-sm text-muted-foreground">
                      O evento se repetirá automaticamente
                    </p>
                  </div>
                  <Switch
                    id="recurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => {
                      handleInputChange('isRecurring', checked);
                      if (!checked) {
                        handleInputChange('recurrenceType', 'none');
                        handleInputChange('recurrenceEndDate', '');
                      }
                    }}
                  />
                </div>

                {formData.isRecurring && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceType">Frequência de Repetição</Label>
                      <Select 
                        value={formData.recurrenceType} 
                        onValueChange={(value) => handleInputChange('recurrenceType', value)}
                        required={formData.isRecurring}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                          <SelectItem value="biweekly">Quinzenalmente</SelectItem>
                          <SelectItem value="monthly">Mensalmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recurrenceEndDate">Data de Término (Opcional)</Label>
                      <Input
                        id="recurrenceEndDate"
                        type="date"
                        value={formData.recurrenceEndDate}
                        onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                        min={formData.date}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.recurrenceEndDate 
                          ? 'O evento se repetirá até esta data' 
                          : 'Sem data de término, o evento se repetirá por até 1 ano (52 ocorrências)'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => {
                      handleInputChange('state', value);
                      handleInputChange('city', ''); // Reset city when state changes
                    }} 
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {BRAZIL_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => handleInputChange('city', value)} 
                    required
                    disabled={!formData.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.state ? "Selecione" : "Escolha estado"} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[300px]">
                      {formData.state && BRAZIL_STATES_AND_CITIES[formData.state]?.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Endereço/Local Específico *</Label>
                <Input
                  id="location"
                  placeholder="Ex: Parque da Cidade, Quadra 1"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Máx. Participantes</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    placeholder="Ilimitado"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto de Capa do Evento</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Uma imagem será gerada automaticamente se você não fizer upload
                </p>
                
                {formData.imageUrl ? (
                  <div className="relative">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <label htmlFor="imageUpload" className="cursor-pointer block">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-foreground font-medium mb-1">
                        {uploadingImage ? 'Carregando imagem...' : 'Clique para adicionar foto de capa (opcional)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG até 5MB
                      </p>
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="private">Evento Privado</Label>
                  <p className="text-sm text-muted-foreground">
                    Apenas pessoas com o link podem ver e participar
                  </p>
                </div>
                <Switch
                  id="private"
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => handleInputChange('isPrivate', checked)}
                />
              </div>
            </CardContent>
          </Card>

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