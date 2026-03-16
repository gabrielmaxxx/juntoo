import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@/constants/categories';
import { useProfileData } from '@/hooks/useProfileData';
import { useUserReputation } from '@/hooks/useUserReputation';
import { useAuthContext } from '@/contexts/AuthContext';
import { ReputationSection } from '@/components/reputation';
import {
  ProfileHeader,
  ProfileEditDialog,
  ProfileEvents,
  ProfileFriends,
} from './profile';

export const ProfilePage = () => {
  const {
    user,
    profile,
    userNumber,
    upcomingEvents,
    completedEvents,
    friends,
    loadingEvents,
    handleAvatarUpload,
    handleSaveProfile,
  } = useProfileData();

  const { stats, reviews: reputationReviews, badges, loading: loadingReputation } = useUserReputation(profile?.user_id);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [activeTab, setActiveTab] = useState('reputation');
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
        averageRating={stats?.average_overall || 0}
        totalReviews={stats?.total_reviews || 0}
        verified={profile?.verified}
        businessVerified={profile?.business_verified}
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
            <TabsTrigger value="reputation" className="flex-1">Reputação</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Eventos</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">Amigos</TabsTrigger>
          </TabsList>

          <TabsContent value="reputation" className="mt-0">
            <ReputationSection stats={stats} reviews={reputationReviews} badges={badges} loading={loadingReputation} />
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
