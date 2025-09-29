import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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

interface ProfilePageProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const ProfilePage = ({ user, onUserUpdate }: ProfilePageProps) => {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [activeTab, setActiveTab] = useState('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        full_name: editedUser.name,
        city: editedUser.location || null,
        interests: editedUser.interests || null,
        avatar_url: editedUser.avatarUrl || null
      });
      
      onUserUpdate?.(editedUser);
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

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: data.publicUrl });
      
      setEditedUser(prev => ({ ...prev, avatarUrl: data.publicUrl }));
      
      toast({
        title: "Avatar atualizado!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
      
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
      {/* Stories Section */}
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
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
          {user.stories?.filter(story => new Date(story.expiresAt) > new Date()).map((story) => (
            <div key={story.id} className="story-ring rounded-full">
              <img
                src={story.imageUrl}
                alt="Story"
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
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
                  <Label htmlFor="location">Cidade</Label>
                  <Input
                    id="location"
                    value={editedUser.location || ''}
                    onChange={(e) => setEditedUser({...editedUser, location: e.target.value})}
                  />
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
                  <Label htmlFor="interests">Interesses (separados por vírgula)</Label>
                  <Input
                    id="interests"
                    value={editedUser.interests?.join(', ') || ''}
                    onChange={(e) => setEditedUser({...editedUser, interests: e.target.value.split(', ')})}
                  />
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
        {user.interests && user.interests.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Interesses</h3>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, index) => (
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
            {user.eventsRegistered && user.eventsRegistered.length > 0 ? (
              user.eventsRegistered.map((event) => (
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
            {user.eventsAttended && user.eventsAttended.length > 0 ? (
              user.eventsAttended.map((event) => (
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