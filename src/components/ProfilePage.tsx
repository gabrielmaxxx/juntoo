import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { CATEGORIES } from '@/constants/categories';
import { parseISO, addHours, isBefore } from 'date-fns';
import { 
  Star, 
  Calendar, 
  MapPin, 
  Award, 
  Camera, 
  Edit3, 
  Heart, 
  MessageCircle,
  Trophy,
  Target,
  Users,
  Zap,
  UserPlus,
  Bell
} from 'lucide-react';
import { NotificationPreferencesPage } from './NotificationPreferences';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, refreshProfile } = useAuthContext();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [activeTab, setActiveTab] = useState('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests || []);
  const [userNumber, setUserNumber] = useState<string>('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Helper function to check if event is completed
  const isEventCompleted = (event: Event): boolean => {
    if (event.isRecurring) return false;
    
    const eventDateTime = parseISO(`${event.date}T${event.time}`);
    const eventEndTime = addHours(eventDateTime, 24);
    return isBefore(eventEndTime, new Date());
  };

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
      if (!profile?.user_id) return;
      
      setLoadingEvents(true);
      try {
        const { data: participations, error: participationsError } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', profile.user_id);

        if (participationsError) throw participationsError;
        
        if (!participations || participations.length === 0) {
          setUpcomingEvents([]);
          setCompletedEvents([]);
          setLoadingEvents(false);
          return;
        }

        const eventIds = participations.map(p => p.event_id);

        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);

        if (eventsError) throw eventsError;

        const creatorIds = [...new Set(eventsData?.map(e => e.created_by) || [])];
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', creatorIds);

        const creatorsMap = new Map(
          creatorsData?.map(creator => [creator.user_id, creator]) || []
        );

        const transformedEvents: Event[] = (eventsData || []).map(event => {
          const creator = creatorsMap.get(event.created_by);
          return {
            id: event.id,
            title: event.title,
            category: event.category,
            location: event.location,
            state: event.state || '',
            city: event.city || '',
            date: event.date,
            time: event.time,
            price: event.price?.toString() || '0',
            description: event.description || '',
            imageUrl: event.image_url || '',
            attendees: [],
            createdBy: event.created_by,
            creatorName: creator?.full_name || 'Usuário',
            creatorAvatar: creator?.avatar_url || '',
            isRecurring: event.is_recurring || false,
          };
        });

        const upcoming = transformedEvents.filter(event => !isEventCompleted(event));
        const completed = transformedEvents.filter(event => isEventCompleted(event));

        setUpcomingEvents(upcoming);
        setCompletedEvents(completed);
      } catch (error) {
        console.error('Error fetching user events:', error);
        toast({
          title: "Erro ao carregar eventos",
          description: "Não foi possível carregar seus eventos.",
          variant: "destructive"
        });
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchUserEvents();
  }, [profile, toast]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!profile?.user_id) return;
      
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${profile.user_id},friend_id.eq.${profile.user_id}`);

        if (error) throw error;

        if (data && data.length > 0) {
          const friendIds = data.map(f => 
            f.user_id === profile.user_id ? f.friend_id : f.user_id
          );

          const { data: friendsData, error: friendsError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, city')
            .in('user_id', friendIds);

          if (friendsError) throw friendsError;
          setFriends(friendsData || []);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchFriends();
  }, [profile]);

  useEffect(() => {
    // Parse location to set state and city
    if (profile?.city) {
      const parts = profile.city.split(', ');
      if (parts.length === 2) {
        setSelectedCity(parts[0]);
        setSelectedState(parts[1]);
      }
    }
    
    // Sync local state with profile
    setEditedName(profile?.full_name || '');
    
    // Clean up interests - filter out any malformed data
    if (profile?.interests && Array.isArray(profile.interests)) {
      const cleanInterests = profile.interests.filter((interest: string) => {
        return interest && 
               typeof interest === 'string' && 
                !interest.includes('[') && 
                !interest.includes('"') && 
                !interest.includes('\\') &&
                CATEGORIES.includes(interest as any);
      });
      setSelectedInterests(cleanInterests);
    } else {
      setSelectedInterests([]);
    }
  }, [profile]);

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
        : profile?.city || null;

      await updateProfile({
        full_name: editedName,
        city: location,
        interests: selectedInterests.length > 0 ? selectedInterests : null,
      });
      
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

      // Update profile with new avatar URL - this will trigger optimistic update
      await updateProfile({ avatar_url: avatarUrl });
      
      toast({
        title: "Avatar atualizado!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
      
      // Refresh profile to ensure all components get the update
      await refreshProfile();
      
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

  if (showNotificationPreferences) {
    return <NotificationPreferencesPage onBack={() => setShowNotificationPreferences(false)} />;
  }

  const displayName = profile?.full_name || 'Usuário';
  const displayAvatar = profile?.avatar_url || '';
  const displayLocation = profile?.city || '';

  return (
    <div className="pb-20">
      {/* Profile Header */}
      <div className="bg-white p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="w-20 h-20 cursor-pointer" onClick={() => document.getElementById('avatarUpload')?.click()}>
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-3xl">
                  {displayName.charAt(0).toUpperCase()}
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
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {userNumber && (
                <p className="text-sm text-gray-500">ID: {userNumber}</p>
              )}
              {displayLocation && (
                <p className="text-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {displayLocation}
                </p>
              )}
              <div className="flex items-center mt-2">
                {renderStars(4.8)}
                <span className="ml-2 text-sm text-gray-600">
                  (0 avaliações)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowNotificationPreferences(true)}
              title="Notificações"
              aria-label="Configurações de notificações"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/friend-suggestions')}
              aria-label="Encontrar amigos"
            >
              <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
              Encontrar
            </Button>
            
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Editar perfil">
                  <Edit3 className="w-4 h-4 mr-2" aria-hidden="true" />
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
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
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
                    <Label>Interesses</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CATEGORIES.map((interest) => (
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
        </div>

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
      </div>

      {/* Content Tabs */}
      <div className="bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-12 bg-white border-b border-gray-200 rounded-none">
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Eventos</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">Amigos</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="p-4 space-y-4">
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum post ainda</p>
            </div>
          </TabsContent>

          <TabsContent value="events" className="p-4 space-y-4">
            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : upcomingEvents.length > 0 ? (
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
                          {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        A realizar
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum evento próximo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4">
            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : completedEvents.length > 0 ? (
              completedEvents.map((event) => (
                <Card key={event.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-16 h-16 rounded-lg object-cover grayscale"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      </div>
                      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                        Concluído
                      </Badge>
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

          <TabsContent value="friends" className="p-4 space-y-4">
            {friends.length > 0 ? (
              friends.map((friend) => (
                <Card 
                  key={friend.user_id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/user/${friend.user_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {friend.avatar_url ? (
                        <img 
                          src={friend.avatar_url} 
                          alt={friend.full_name}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-medium text-primary">
                            {friend.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{friend.full_name}</h3>
                        {friend.city && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {friend.city}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum amigo ainda</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
