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

interface CreateEventPageProps {
  onBack: () => void;
}

export const CreateEventPage = ({ onBack }: CreateEventPageProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateLink, setPrivateLink] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    date: '',
    time: '',
    price: '',
    maxParticipants: '',
    isPrivate: false,
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

      const eventData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        location: formData.location,
        date: formData.date,
        time: formData.time,
        price: formData.price ? parseFloat(formData.price) : 0,
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        is_private: formData.isPrivate,
        image_url: formData.imageUrl || null,
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

      // Automatically add creator as participant
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: data.id,
          user_id: user.id
        });

      if (participantError) {
        console.error('Erro ao adicionar criador como participante:', participantError);
      }

      if (data?.is_private && data?.private_code) {
        const link = `${window.location.origin}/events/join/${data.private_code}`;
        setPrivateLink(link);
      }

      toast({
        title: "Evento criado com sucesso!",
        description: formData.isPrivate 
          ? "Seu evento privado foi criado. Compartilhe o link para convidar participantes."
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

      <div className="max-w-md mx-auto p-4 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                Data e Horário
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Local e Detalhes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Local *</Label>
                <Input
                  id="location"
                  placeholder="Ex: Parque da Cidade, Quadra 1"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                />
              </div>

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
                        {uploadingImage ? 'Carregando imagem...' : 'Clique para adicionar foto de capa'}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar Evento'}
          </Button>
        </form>
      </div>
    </div>
  );
};