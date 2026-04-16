import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Users, MapPin, MessageSquare, Calendar, Shield, Settings, UserPlus, LogOut, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Community, useCommunityDetails, useCommunityChat, RecurringCommunityEvent } from '../hooks/useCommunities';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CommunityPageProps {
  communityId: string;
  onBack: () => void;
}

export const CommunityPage = ({ communityId, onBack }: CommunityPageProps) => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'about' | 'members' | 'chat' | 'events'>('about');
  const {
    community, loading, members, isMember, isPending, isAdmin,
    join, joining, leave, leaving, recurringEvents,
  } = useCommunityDetails(communityId);

  const { messages, send, sending } = useCommunityChat(isMember ? communityId : null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    send(chatInput.trim());
    setChatInput('');
  };

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!community) return null;

  const sections = [
    { key: 'about', label: 'Sobre', icon: Shield },
    { key: 'members', label: `Membros (${community.member_count})`, icon: Users },
    { key: 'events', label: 'Eventos', icon: Calendar },
    ...(isMember ? [{ key: 'chat', label: 'Chat', icon: MessageSquare }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <Avatar className="w-9 h-9 rounded-xl">
            <AvatarImage src={community.avatar_url || undefined} />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm font-bold">
              {community.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-sm truncate">{community.name}</h1>
            <p className="text-xs text-muted-foreground">{community.member_count} membros</p>
          </div>
          {!isMember && !isPending && (
            <Button size="sm" onClick={() => join()} disabled={joining} className="rounded-xl">
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              {community.is_public ? 'Entrar' : 'Solicitar'}
            </Button>
          )}
          {isPending && (
            <Badge variant="outline">Pendente</Badge>
          )}
          {isMember && !isAdmin && (
            <Button variant="outline" size="sm" onClick={() => leave()} disabled={leaving} className="rounded-xl text-xs">
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sair
            </Button>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key as any)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1',
                activeSection === s.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              <s.icon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-28">
        {activeSection === 'about' && (
          <div className="space-y-4">
            {community.description && (
              <div className="bg-card rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                <h3 className="font-semibold text-sm text-foreground mb-2">Sobre</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{community.description}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{community.category}</Badge>
              {community.city && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{community.city}
                </Badge>
              )}
              <Badge variant={community.is_public ? 'default' : 'outline'}>
                {community.is_public ? 'Pública' : 'Privada'}
              </Badge>
            </div>
            {community.rules && (
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Regras
                </h3>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{community.rules}</p>
              </div>
            )}

            {/* Recurring events summary */}
            {recurringEvents.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground">Eventos Recorrentes</h3>
                {recurringEvents.map(re => (
                  <div key={re.id} className="bg-card rounded-xl p-3 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{re.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {DAY_NAMES[re.day_of_week]} • {re.time} • {re.recurrence === 'weekly' ? 'Semanal' : re.recurrence === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'members' && (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-card" style={{ boxShadow: 'var(--shadow-card)' }}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={(member.profiles as any)?.avatar_url || undefined} />
                  <AvatarFallback>{(member.profiles as any)?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{(member.profiles as any)?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                </div>
                {member.role === 'admin' && (
                  <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {activeSection === 'events' && (
          <div className="space-y-3">
            {recurringEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhum evento recorrente configurado.</p>
                {isAdmin && (
                  <p className="text-xs text-primary mt-1">Como admin, você pode configurar eventos recorrentes.</p>
                )}
              </div>
            ) : (
              recurringEvents.map(re => (
                <motion.div
                  key={re.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl p-4 space-y-2"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <h3 className="font-semibold text-foreground text-sm">{re.title}</h3>
                  {re.description && <p className="text-xs text-muted-foreground">{re.description}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{DAY_NAMES[re.day_of_week]} às {re.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{re.location}</span>
                    {re.max_participants && <span className="flex items-center gap-1"><Users className="w-3 h-3" />Máx {re.max_participants}</span>}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {re.recurrence === 'weekly' ? 'Semanal' : re.recurrence === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeSection === 'chat' && isMember && (
          <div className="flex flex-col" style={{ height: 'calc(100dvh - 180px)' }}>
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Diga oi! 👋</p>
              )}
              {messages.map((msg: any) => {
                const isMe = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                    {!isMe && (
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{msg.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2',
                      isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                    )}>
                      {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.profiles?.full_name}</p>}
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Mensagem..."
                className="rounded-xl"
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <Button size="icon" onClick={handleSend} disabled={sending || !chatInput.trim()} className="rounded-xl shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
