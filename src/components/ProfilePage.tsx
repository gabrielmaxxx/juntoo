import { useState, useEffect } from 'react';
import { User, Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { 
  Star, 
  Calendar, 
  MapPin, 
  Award, 
  Camera, 
  Edit3, 
  Heart, 
  MessageCircle,
  Settings,
  Trophy,
  Target,
  Users,
  Zap,
  Upload
} from 'lucide-react';

const INTEREST_OPTIONS = [
  'Esportes', 'Música', 'Arte', 'Tecnologia', 'Culinária', 'Viagem',
  'Fotografia', 'Leitura', 'Cinema', 'Dança', 'Natureza', 'Fitness'
];

interface ProfilePageProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const ProfilePage = ({ user, onUserUpdate }: ProfilePageProps) => {
  const { updateProfile, profile } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [activeTab, setActiveTab] = useState('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [userNumber, setUserNumber] = useState<string>('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchUserNumber = async () => {
      if (profile?.user_id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_number')
          .eq('user_id', profile.user_id)
          .single();

        if (data && !error) {
          setUserNumber(data.user_number.toString().padStart(6, '0'));
        }
      }
    };

    fetchUserNumber();
  }, [profile]);

  useEffect(() => {
    const fetchUserEvents = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        try {
          await supabase.rpc('update_event_status');
        } catch (rpcError) {
          console.log('Could not update event status:', rpcError);
        }

        const { data: participantData, error: participantError } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', authUser.id);

        if (participantError) throw participantError;

        const eventIds = participantData?.map(p => p.event_id) || [];

        if (eventIds.length > 0) {
          const { data: upcomingData, error: upcomingError } = await supabase
            .from('events')
            .select('*')
            .in('id', eventIds)
            .eq('status', 'upcoming')
            .order('date', { ascending: true });

          if (upcomingError) throw upcomingError;

          const { data: completedData, error: completedError } = await supabase
            .from('events')
            .select('*')
            .in('id', eventIds)
            .eq('status', 'completed')
            .order('date', { ascending: false });

          if (completedError) throw completedError;

          const transformEvents = (events: any[]): Event[] => {
            return events.map(event => ({
              id: event.id,
              title: event.title,
              category: event.category,
              location: event.location,
              date: event.date,
              time: event.time,
              price: event.price?.toString() || 'Gratuito',
              description: event.description || '',
              imageUrl: event.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
              attendees: [],
              createdBy: event.created_by
            }));
          };

          setUpcomingEvents(transformEvents(upcomingData || []));
          setCompletedEvents(transformEvents(completedData || []));
        }
      } catch (error) {
        console.error('Erro ao carregar eventos do usuário:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchUserEvents();
  }, []);

  useEffect(() => {
    // Parse location to set state and city
    if (user.location) {
      const parts = user.location.split(', ');
      if (parts.length === 2) {
        setSelectedCity(parts[0]);
        setSelectedState(parts[1]);
      }
    }
    
    // Clean up interests - filter out any malformed data
    if (user.interests && Array.isArray(user.interests)) {
      const cleanInterests = user.interests.filter((interest: string) => {
        // Only keep valid interest strings that don't contain JSON artifacts
        return interest && 
               typeof interest === 'string' && 
               !interest.includes('[') && 
               !interest.includes('"') && 
               !interest.includes('\\') &&
               INTEREST_OPTIONS.includes(interest);
      });
      setSelectedInterests(cleanInterests);
    } else {
      setSelectedInterests([]);
    }
  }, [user]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSaveProfile = async () => {
    try {
      const location = selectedCity && selectedState 
        ? `${selectedCity}, ${selectedState}` 
        : editedUser.location;

      await updateProfile({
        full_name: editedUser.name,
        city: location || null,
        interests: selectedInterests.length > 0 ? selectedInterests : null,
        avatar_url: editedUser.avatarUrl || null
      });
      
      const updatedUser = {
        ...editedUser,
        location: location || '',
        interests: selectedInterests
      };
      
      onUserUpdate?.(updatedUser);
      setIsEditingProfile(false);
      
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingAvatar(true);

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Usuário não autenticado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add timestamp to force reload
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: avatarUrl });
      
      // Update local state
      setEditedUser(prev => ({ ...prev, avatarUrl }));
      
      // Update parent component
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          avatarUrl
        });
      }
      
      toast({
        title: "Avatar atualizado!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
      
      // Force page reload to update all avatar instances
      window.location.reload();
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar a imagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const badgeIcons = {
    'Award': Award,
    'Trophy': Trophy,
    'Target': Target,
    'Users': Users,
    'Zap': Zap
  };

  return (
    <div className="pb-20">
      {/* Profile Header */}
      <div className="bg-white p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="w-20 h-20 cursor-pointer" onClick={() => document.getElementById('avatarUpload')?.click()}>
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-3xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="avatarUpload" className="absolute -bottom-1 -right-1 cursor-pointer">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                  {uploadingAvatar ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </div>
              </Label>
              <Input
                id="avatarUpload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              {userNumber && (
                <p className="text-sm text-gray-500">ID: {userNumber}</p>
              )}
              <p className="text-gray-600 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {user.location}
              </p>
              <div className="flex items-center mt-2">
                {renderStars(user.rating || 0)}
                <span className="ml-2 text-sm text-gray-600">
                  ({user.reviews} avaliações)
                </span>
              </div>
            </div>
          </div>
          
          <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editedUser.name}
                    onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select value={selectedState} onValueChange={(value) => {
                    setSelectedState(value);
                    setSelectedCity('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZIL_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedState ? "Selecione sua cidade" : "Primeiro selecione o estado"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedState && BRAZIL_STATES_AND_CITIES[selectedState as keyof typeof BRAZIL_STATES_AND_CITIES]?.map((cityName) => (
                        <SelectItem key={cityName} value={cityName}>
                          {cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editedUser.bio || ''}
                    onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Interesses</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {INTEREST_OPTIONS.map((interest) => (
                      <Badge
                        key={interest}
                        variant={selectedInterests.includes(interest) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button onClick={handleSaveProfile} className="w-full">
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {user.bio && (
          <p className="text-gray-700 mb-4">{user.bio}</p>
        )}

        {/* Interests */}
        {selectedInterests && selectedInterests.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Interesses</h3>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map((interest, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {user.badges && user.badges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Conquistas</h3>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge, index) => {
                const IconComponent = badgeIcons[badge.icon as keyof typeof badgeIcons] || Award;
                return (
                  <div key={index} className="flex items-center bg-gray-50 rounded-full px-3 py-1">
                    <IconComponent className={`w-4 h-4 mr-2 ${badge.color}`} />
                    <span className="text-xs font-medium">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-12 bg-white border-b border-gray-200 rounded-none">
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Eventos</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="p-4 space-y-4">
            {user.posts && user.posts.length > 0 ? (
              user.posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <p className="text-gray-800 mb-3">{post.content}</p>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          {post.likes}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {post.comments}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum post ainda</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="p-4 space-y-4">
            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Carregando eventos...</p>
              </div>
            ) : upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      </div>
                      <Badge variant="outline">Inscrito</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum evento inscrito</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4">
            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : completedEvents && completedEvents.length > 0 ? (
              completedEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      </div>
                      <Badge variant="secondary">Participou</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum evento no histórico</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};