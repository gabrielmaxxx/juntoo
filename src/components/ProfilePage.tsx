import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CATEGORIES } from '@/constants/categories';
import { useProfileData } from '@/hooks/useProfileData';
import {
  ProfileHeader,
  ProfileEditDialog,
  ProfileEvents,
  ProfileFriends,
} from './profile';

export const ProfilePage = () => {
  const {
    profile,
    userNumber,
    upcomingEvents,
    completedEvents,
    friends,
    loadingEvents,
    handleAvatarUpload,
    handleSaveProfile,
  } = useProfileData();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [activeTab, setActiveTab] = useState('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests || []);

  useEffect(() => {
    if (profile?.city) {
      const parts = profile.city.split(', ');
      if (parts.length === 2) {
        setSelectedCity(parts[0]);
        setSelectedState(parts[1]);
      }
    }
    setEditedName(profile?.full_name || '');
    
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

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const onAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadingAvatar(true);
    await handleAvatarUpload(event);
    setUploadingAvatar(false);
  };

  const onSaveProfile = async () => {
    const success = await handleSaveProfile(editedName, selectedCity, selectedState, selectedInterests);
    if (success) {
      setIsEditingProfile(false);
    }
  };

  const displayName = profile?.full_name || 'Usuário';
  const displayAvatar = profile?.avatar_url || '';
  const displayLocation = profile?.city || '';

  return (
    <div className="pb-20">
      <ProfileHeader
        displayName={displayName}
        displayAvatar={displayAvatar}
        displayLocation={displayLocation}
        userNumber={userNumber}
        selectedInterests={selectedInterests}
        uploadingAvatar={uploadingAvatar}
        onAvatarUpload={onAvatarUpload}
        onEditClick={() => setIsEditingProfile(true)}
      />

      <ProfileEditDialog
        open={isEditingProfile}
        onOpenChange={setIsEditingProfile}
        editedName={editedName}
        setEditedName={setEditedName}
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedInterests={selectedInterests}
        toggleInterest={toggleInterest}
        onSave={onSaveProfile}
      />

      <div className="bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-12 bg-background border-b border-border rounded-none">
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Eventos</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">Amigos</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="p-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum post ainda</p>
            </div>
          </TabsContent>

          <TabsContent value="events" className="p-4">
            <ProfileEvents events={upcomingEvents} loading={loadingEvents} type="upcoming" />
          </TabsContent>

          <TabsContent value="history" className="p-4">
            <ProfileEvents events={completedEvents} loading={loadingEvents} type="completed" />
          </TabsContent>

          <TabsContent value="friends" className="p-4">
            <ProfileFriends friends={friends} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
