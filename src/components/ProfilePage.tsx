import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@/constants/categories';
import { useProfileData } from '@/hooks/useProfileData';
import { useUserReputation } from '@/hooks/useUserReputation';
import { useReputationScore } from '@/hooks/useReputationScore';
import { useAuthContext } from '@/contexts/AuthContext';
import { ReputationSection, ReputationScore, AchievementBadges } from '@/components/reputation';
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
    eventsCreated,
    loadingEvents,
    handleAvatarUpload,
    handleSaveProfile,
  } = useProfileData();

  const { stats, reviews: reputationReviews, badges, loading: loadingReputation } = useUserReputation(profile?.user_id);
  const { scoreData, achievements, loading: loadingScore } = useReputationScore(profile?.user_id);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [editedBio, setEditedBio] = useState(profile?.bio || '');
  const [editedBirthDate, setEditedBirthDate] = useState((profile as any)?.birth_date || '');

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
    setEditedBio(profile?.bio || '');
    setEditedBirthDate((profile as any)?.birth_date || '');

    
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
    const success = await handleSaveProfile(editedName, selectedCity, selectedState, selectedInterests, editedBio, editedBirthDate);
    if (success) {
      setIsEditingProfile(false);
    }
  };

  const displayName = profile?.full_name || 'Usuário';
  const displayAvatar = profile?.avatar_url || '';
  const displayLocation = profile?.city || '';
  const displayBio = profile?.bio || '';
  const { restrictions } = useAuthContext();

  const penaltyLabels: Record<string, string> = {
    restricted: 'Conta restrita', flagged: 'Conta sinalizada',
    priority_review: 'Em revisão prioritária', low_reputation_flag: 'Reputação baixa',
  };

  return (
    <div className="pb-20">
      {restrictions.length > 0 && (
        <Card className="mx-4 mt-4 border-destructive/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              Restrições ativas na sua conta
            </h3>
            <div className="space-y-2">
              {restrictions.map((r, i) => (
                <div key={i} className="text-sm">
                  <Badge variant="destructive" className="text-xs mr-2">
                    {r.restriction_type.startsWith('feature_block_')
                      ? `Função bloqueada: ${r.restriction_type.replace('feature_block_', '')}`
                      : penaltyLabels[r.restriction_type] || r.restriction_type}
                  </Badge>
                  {r.expires_at && (
                    <span className="text-xs text-muted-foreground">
                      até {new Date(r.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <ProfileHeader
        displayName={displayName}
        displayAvatar={displayAvatar}
        displayLocation={displayLocation}
        displayBio={displayBio}
        userNumber={userNumber}
        selectedInterests={selectedInterests}
        uploadingAvatar={uploadingAvatar}
        averageRating={stats?.average_overall || 0}
        totalReviews={stats?.total_reviews || 0}
        eventsAttended={stats?.events_attended || 0}
        eventsCreated={eventsCreated}
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
        editedBio={editedBio}
        setEditedBio={setEditedBio}
        editedBirthDate={editedBirthDate}
        setEditedBirthDate={setEditedBirthDate}

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
            <ReputationScore scoreData={scoreData} loading={loadingScore} />
            <AchievementBadges achievements={achievements} loading={loadingScore} />
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
