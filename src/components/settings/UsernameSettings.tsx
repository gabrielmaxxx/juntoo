/**
 * UsernameSettings — campo de configuração do username público.
 *
 * Permite ao usuário definir/alterar seu @username (3-30 caracteres,
 * minúsculas, números e underscore). Mostra preview da URL pública.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AtSign, Check, Loader2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export const UsernameSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  // Load current username
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) {
          setCurrentUsername(data.username);
          setUsername(data.username);
        }
      });
  }, [user]);

  // Live availability check (debounced)
  useEffect(() => {
    if (!username || username === currentUsername) {
      setAvailable(null);
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setAvailable(false);
      return;
    }
    setChecking(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      setAvailable(!data);
      setChecking(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [username, currentUsername]);

  const handleSave = async () => {
    if (!user || !USERNAME_REGEX.test(username)) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.toLowerCase() })
      .eq('user_id', user.id);
    setSaving(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message.includes('duplicate')
          ? 'Este nome de usuário já está em uso.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    setCurrentUsername(username);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    toast({ title: 'Salvo!', description: 'Seu @username foi atualizado.' });
  };

  const publicUrl = currentUsername
    ? `https://juntoo.lovable.app/u/${currentUsername}`
    : null;

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast({ title: 'Link copiado!' });
  };

  const isValid = USERNAME_REGEX.test(username);
  const canSave =
    isValid && username !== currentUsername && available === true && !saving;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AtSign className="h-5 w-5 text-primary" />
          Nome de usuário público
        </CardTitle>
        <CardDescription>
          Crie um link curto e compartilhável para seu perfil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="username">@username</Label>
          <div className="relative">
            <Input
              id="username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              placeholder="seunome"
              maxLength={30}
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              {!checking && available === true && <Check className="w-4 h-4 text-primary" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            3-30 caracteres · letras minúsculas, números e underscore
          </p>
          {username && !isValid && (
            <p className="text-xs text-destructive mt-1">
              Use apenas letras minúsculas, números e _ (mín. 3 caracteres)
            </p>
          )}
          {isValid && available === false && username !== currentUsername && (
            <p className="text-xs text-destructive mt-1">Já está em uso</p>
          )}
        </div>

        {publicUrl && (
          <div className="bg-muted rounded-md p-3 flex items-center gap-2">
            <code className="text-xs flex-1 truncate">{publicUrl}</code>
            <Button size="icon" variant="ghost" onClick={handleCopy} aria-label="Copiar link">
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" asChild aria-label="Abrir link">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}

        <Button onClick={handleSave} disabled={!canSave} className="w-full">
          {saving ? 'Salvando...' : currentUsername ? 'Atualizar' : 'Definir username'}
        </Button>
      </CardContent>
    </Card>
  );
};
