import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, CheckCircle, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/constants/categories';
import { BrandLogo } from '@/components/BrandLogo';
import { Checkbox } from '@/components/ui/checkbox';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const Logo = () => (
  <div className="mb-8 flex justify-center">
    <BrandLogo size="lg" className="justify-center" />
  </div>
);

export const AuthPage = () => {
  const [view, setView] = useState<AuthView>('login');
  // Lazy-load city data only when signup form is shown
  const [BRAZIL_STATES, setBrazilStates] = useState<{ value: string; label: string }[]>([]);
  const [BRAZIL_STATES_AND_CITIES, setBrazilCities] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    if (view === 'signup') {
      import('@/data/brazilStatesAndCities').then(mod => {
        setBrazilStates(mod.BRAZIL_STATES);
        mod.loadCities().then(setBrazilCities);
      });
    }
  }, [view]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [city, setCity] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const { toast } = useToast();

  // Check if user is coming from password reset link
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    if (type === 'recovery' && accessToken) {
      setView('reset-password');
    }
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, insira seu email.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 8 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setPasswordResetSuccess(true);
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi redefinida com sucesso.",
      });

      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        setView('login');
        setPassword('');
        setConfirmPassword('');
        setPasswordResetSuccess(false);
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 8 caracteres.",
        variant: "destructive"
      });
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast({
        title: "Senha fraca",
        description: "A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número.",
        variant: "destructive"
      });
      return;
    }

    if (!fullName || !selectedState || !city || selectedInterests.length === 0) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            city: `${city}, ${selectedState}`,
            interests: selectedInterests
          }
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: data.user.id,
            full_name: fullName,
            city: `${city}, ${selectedState}`,
            interests: selectedInterests
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        toast({
          title: "Conta criada com sucesso!",
          description: "Você já pode usar o aplicativo.",
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta e poder fazer login.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword && password !== '';

  // Forgot Password View
  const renderForgotPassword = () => (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => {
          setView('login');
          setResetEmailSent(false);
        }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Voltar para login"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Voltar para login
      </button>

      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold">Recuperar senha</h2>
        <p className="text-sm text-muted-foreground">
          Digite seu email e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      {resetEmailSent ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Email enviado!</h3>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setResetEmailSent(false);
              setEmail('');
            }}
          >
            Enviar para outro email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-base font-semibold">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              required
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold rounded-full bg-blue-600 hover:bg-blue-700" 
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
    </div>
  );

  // Reset Password View (after clicking email link)
  const renderResetPassword = () => (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold">Criar nova senha</h2>
        <p className="text-sm text-muted-foreground">
          Digite sua nova senha abaixo.
        </p>
      </div>

      {passwordResetSuccess ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Senha atualizada!</h3>
            <p className="text-sm text-muted-foreground">
              Você será redirecionado para o login em instantes...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-base font-semibold">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type="password"
                placeholder="************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                required
                minLength={8}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password" className="text-base font-semibold">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="************"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12"
                required
                minLength={8}
              />
              {password && confirmPassword && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordsMatch ? 'senhas coincidem' : 'senhas diferentes'}
                </span>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold rounded-full bg-blue-600 hover:bg-blue-700" 
            disabled={loading || !passwordsMatch}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      )}
    </div>
  );

  // Login View
  const renderLogin = () => (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-semibold">Usuário</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-semibold">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="************"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12"
          required
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold rounded-full bg-blue-600 hover:bg-blue-700" 
        disabled={loading}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
      
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium rounded-full flex items-center justify-center gap-3"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </Button>
      </div>
      
      <div className="text-center space-y-2 pt-2">
        <button
          type="button"
          className="text-sm underline hover:text-primary"
          onClick={() => setView('forgot-password')}
        >
          Esqueceu a senha?
        </button>
        <br />
        <button
          type="button"
          className="text-sm underline hover:text-primary"
          onClick={() => setView('signup')}
        >
          Primeiro acesso?
        </button>
      </div>
    </form>
  );

  // Signup View
  const renderSignup = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-base font-semibold">Nome completo</Label>
        <Input
          id="fullName"
          placeholder="Seu nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-12"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-base font-semibold">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state" className="text-base font-semibold">Estado</Label>
        <Select value={selectedState} onValueChange={(value) => {
          setSelectedState(value);
          setCity('');
        }}>
          <SelectTrigger className="h-12">
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

      <div className="space-y-2">
        <Label htmlFor="city" className="text-base font-semibold">Cidade</Label>
        <Select value={city} onValueChange={setCity} disabled={!selectedState}>
          <SelectTrigger className="h-12">
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

      <div className="space-y-2">
        <Label className="text-base font-semibold">Interesses (selecione pelo menos um)</Label>
        <div className="flex flex-wrap gap-2">
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
      
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-base font-semibold">Criar senha</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type="password"
            placeholder="************"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12"
            required
            minLength={8}
          />
          {password && confirmPassword && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordsMatch ? 'as senhas são iguais' : 'as senhas não coincidem'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-base font-semibold">Confirmar senha</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type="password"
            placeholder="************"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12"
            required
            minLength={8}
          />
          {password && confirmPassword && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordsMatch ? 'as senhas são iguais' : 'as senhas não coincidem'}
            </span>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold rounded-full bg-blue-600 hover:bg-blue-700" 
        disabled={loading}
      >
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </Button>

      <div className="text-center pt-2">
        <button
          type="button"
          className="text-sm underline hover:text-primary"
          onClick={() => setView('login')}
        >
          Possuo cadastro?
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          {view !== 'forgot-password' && view !== 'reset-password' && <Logo />}
          
          {view === 'login' && renderLogin()}
          {view === 'signup' && renderSignup()}
          {view === 'forgot-password' && renderForgotPassword()}
          {view === 'reset-password' && renderResetPassword()}
        </CardContent>
      </Card>
    </div>
  );
};
