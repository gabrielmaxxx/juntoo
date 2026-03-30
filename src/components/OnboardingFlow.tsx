import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BrandLogo } from '@/components/BrandLogo';
import { CATEGORIES } from '@/constants/categories';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Sparkles, ArrowRight, Check, PartyPopper } from 'lucide-react';
import { Event } from '@/types';

interface OnboardingFlowProps {
  onComplete: () => void;
  onEventClick?: (event: Event) => void;
}

type Step = 'welcome' | 'interests' | 'profile' | 'recommendations';

export const OnboardingFlow = ({ onComplete, onEventClick }: OnboardingFlowProps) => {
  const { user, profile, updateProfile, refreshProfile } = useAuthContext();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests || []);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const steps: Step[] = ['welcome', 'interests', 'profile', 'recommendations'];
  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande (máx 5MB)', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const fetchRecommendedEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const { data } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('is_private', false)
        .gte('date', new Date().toISOString().split('T')[0])
        .in('category', selectedInterests.length > 0 ? selectedInterests : CATEGORIES as unknown as string[])
        .order('participants_count', { ascending: false })
        .limit(6);

      if (data) {
        setRecommendedEvents(data.map(e => ({
          id: e.id!,
          title: e.title!,
          category: e.category!,
          location: e.location!,
          date: e.date!,
          time: e.time!,
          price: e.price?.toString() || '0',
          description: e.description || '',
          imageUrl: e.image_url || '',
          participantsCount: e.participants_count || 0,
          createdBy: e.created_by!,
          creatorName: e.creator_name || undefined,
          creatorAvatar: e.creator_avatar || undefined,
        })));
      }
    } catch {
      // Silently fail, user can still complete onboarding
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedInterests]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setUploading(true);
    try {
      let avatarUrl = profile?.avatar_url || null;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          avatarUrl = urlData.publicUrl;
        }
      }

      await updateProfile({
        full_name: fullName.trim() || profile?.full_name || 'Usuário',
        interests: selectedInterests,
        avatar_url: avatarUrl,
      });

      await fetchRecommendedEvents();
      setStep('recommendations');
    } catch {
      toast({ title: 'Erro ao salvar perfil', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('user_id', user?.id);
      await refreshProfile();
      onComplete();
    } catch {
      onComplete();
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Progress bar */}
      {step !== 'welcome' && (
        <div className="px-6 pt-4">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {stepIndex + 1}/{steps.length}
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <BrandLogo size="lg" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Bem-vindo ao Juntoo! 🎉
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Encontre pessoas e eventos incríveis perto de você. Vamos configurar seu perfil em menos de 1 minuto!
              </p>
            </div>
            <Button
              onClick={() => setStep('interests')}
              className="w-full"
              variant="hero"
            >
              Começar <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Step: Interests */}
        {step === 'interests' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <Sparkles className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">
                O que te interessa?
              </h2>
              <p className="text-sm text-muted-foreground">
                Selecione pelo menos 3 interesses para recomendarmos eventos perfeitos para você.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {(CATEGORIES as readonly string[]).filter(c => c !== 'Outro').map(category => (
                <Badge
                  key={category}
                  variant={selectedInterests.includes(category) ? 'default' : 'outline'}
                  className={`cursor-pointer text-sm py-2 px-4 transition-all ${
                    selectedInterests.includes(category)
                      ? 'bg-primary text-primary-foreground scale-105'
                      : 'hover:bg-primary/10'
                  }`}
                  onClick={() => toggleInterest(category)}
                >
                  {selectedInterests.includes(category) && <Check className="w-3 h-3 mr-1" />}
                  {category}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {selectedInterests.length}/3 selecionados {selectedInterests.length >= 3 ? '✅' : ''}
            </p>

            <Button
              onClick={() => setStep('profile')}
              className="w-full"
              disabled={selectedInterests.length < 3}
            >
              Continuar <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Profile */}
        {step === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Configure seu perfil
              </h2>
              <p className="text-sm text-muted-foreground">
                Perfis com foto têm <span className="font-semibold text-primary">3x mais engajamento</span>!
              </p>
            </div>

            {/* Avatar upload */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden bg-muted group-hover:border-primary transition-colors">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
                      <span className="text-xs text-muted-foreground mt-1 block">Adicionar foto</span>
                    </div>
                  )}
                </div>
                {avatarPreview && (
                  <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5">
                    <Camera className="w-4 h-4" />
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Como quer ser chamado?</label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="text-center text-lg"
                maxLength={100}
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              className="w-full"
              disabled={uploading || !fullName.trim()}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <>Salvar e ver eventos <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </div>
        )}

        {/* Step: Recommendations */}
        {step === 'recommendations' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <PartyPopper className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">
                Tudo pronto! 🎉
              </h2>
              <p className="text-sm text-muted-foreground">
                Encontramos eventos perfeitos para você.
              </p>
            </div>

            {loadingEvents ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : recommendedEvents.length > 0 ? (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {recommendedEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => {
                      handleComplete();
                      onEventClick?.(event);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors flex gap-3 items-center"
                  >
                    <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🎯</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.category} · {event.participantsCount} participantes</p>
                      <p className="text-xs text-primary font-medium">
                        {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhum evento encontrado ainda. Que tal criar o primeiro?</p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleComplete} className="w-full" variant="hero">
                Explorar o Juntoo <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Você pode alterar suas preferências a qualquer momento nas configurações.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
