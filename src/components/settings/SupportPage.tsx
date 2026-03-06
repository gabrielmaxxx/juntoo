import { useState } from 'react';
import { ArrowLeft, MessageCircle, Bug, HelpCircle, ChevronDown, ChevronUp, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SupportPageProps {
  onBack: () => void;
}

const FAQ_ITEMS = [
  {
    question: 'Como criar um evento?',
    answer: 'Toque no botão "+" na barra de navegação inferior. Preencha os detalhes do evento como título, data, horário e local, depois toque em "Criar Evento".',
  },
  {
    question: 'Como encontrar eventos perto de mim?',
    answer: 'Use a aba "Busca" para filtrar eventos por categoria, localização e data. Você também receberá notificações de novos eventos que combinam com seus interesses.',
  },
  {
    question: 'Como enviar uma mensagem para outro usuário?',
    answer: 'Acesse o perfil do usuário e toque em "Enviar Mensagem". Você também pode acessar suas conversas pela aba de mensagens no topo da tela.',
  },
  {
    question: 'Como alterar minha foto de perfil?',
    answer: 'Vá até seu perfil e toque na foto de perfil ou no ícone da câmera. Selecione uma imagem do seu dispositivo.',
  },
  {
    question: 'Posso criar eventos privados?',
    answer: 'Sim! Ao criar um evento, ative a opção "Evento Privado". Um código exclusivo será gerado para que apenas pessoas convidadas possam acessar.',
  },
  {
    question: 'Como cancelar minha participação em um evento?',
    answer: 'Acesse os detalhes do evento e toque no botão "Sair do evento". Sua participação será cancelada imediatamente.',
  },
];

export const SupportPage = ({ onBack }: SupportPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactCategory, setContactCategory] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmitContact = async () => {
    if (!contactSubject.trim() || !contactMessage.trim() || !contactCategory) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setSending(true);
    // Simulate sending — in production, this would call an edge function or support API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSending(false);

    toast({ title: 'Mensagem enviada!', description: 'Responderemos em até 48 horas pelo seu e-mail.' });
    setContactSubject('');
    setContactMessage('');
    setContactCategory('');
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Ajuda e Suporte</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* FAQ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Perguntas Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="border-b border-border last:border-0">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between py-3 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-2">{item.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <p className="text-sm text-muted-foreground pb-3 animate-fade-in">{item.answer}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Fale Conosco
            </CardTitle>
            <CardDescription>Envie sua dúvida, sugestão ou reporte um problema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={contactCategory} onValueChange={setContactCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Reportar problema</SelectItem>
                  <SelectItem value="suggestion">Sugestão</SelectItem>
                  <SelectItem value="question">Dúvida</SelectItem>
                  <SelectItem value="account">Problema com conta</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Resumo do seu contato"
              />
            </div>
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Descreva em detalhes..."
                rows={4}
              />
            </div>
            <Button onClick={handleSubmitContact} disabled={sending} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar mensagem'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
