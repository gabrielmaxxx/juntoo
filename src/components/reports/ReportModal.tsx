import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const REPORT_CATEGORIES_BY_TARGET = {
  event: [
    { value: 'misleading_event', label: 'Evento inexistente' },
    { value: 'sexual_content', label: 'Conteúdo inapropriado' },
    { value: 'fraud', label: 'Evento fraudulento' },
    { value: 'spam', label: 'Spam' },
  ],
  user: [
    { value: 'fake_profile', label: 'Perfil falso' },
    { value: 'harassment', label: 'Assédio' },
    { value: 'suspicious_behavior', label: 'Comportamento inadequado' },
    { value: 'spam', label: 'Spam' },
  ],
  message: [
    { value: 'hate_speech', label: 'Conteúdo ofensivo' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Assédio' },
  ],
} as const;

type ReportTarget = keyof typeof REPORT_CATEGORIES_BY_TARGET;
type ReportCategory = 'harassment' | 'hate_speech' | 'sexual_content' | 'spam' | 'fraud' | 'fake_profile' | 'suspicious_behavior' | 'dangerous_event' | 'misleading_event' | 'other';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId?: string | null;
  reportedEventId?: string | null;
  reportedMessageId?: string | null;
  contextLabel?: string;
}

export const ReportModal = ({
  open,
  onOpenChange,
  reportedUserId,
  reportedEventId,
  reportedMessageId,
  contextLabel,
}: ReportModalProps) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const targetType: ReportTarget = reportedMessageId ? 'message' : reportedEventId ? 'event' : 'user';
  const reportCategories = REPORT_CATEGORIES_BY_TARGET[targetType];

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setEvidenceFile(null);
    setSubmitted(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    setEvidenceFile(file);
  };

  const handleSubmit = async () => {
    if (!user || !category) return;
    setSubmitting(true);

    try {
      let evidenceUrl: string | null = null;

      // Upload evidence if provided
      if (evidenceFile) {
        const ext = evidenceFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('report-evidence')
          .upload(path, evidenceFile);
        if (uploadError) throw uploadError;

        evidenceUrl = path;
      }

      const { error } = await supabase.from('reports').insert({
        reporter_user_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_event_id: reportedEventId || null,
        reported_message_id: reportedMessageId || null,
        category,
        description: description.trim(),
        evidence_image_url: evidenceUrl,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting report:', err);
      toast.error('Erro ao enviar denúncia. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">Obrigado</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Recebemos sua denúncia. Vamos analisar em até 48 horas.
            </DialogDescription>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <DialogTitle>Denunciar conteúdo</DialogTitle>
          </div>
          {contextLabel && (
            <DialogDescription>{contextLabel}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="report-category">Categoria da denúncia *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
              <SelectTrigger id="report-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {reportCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="report-description">Conte-nos o que aconteceu</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a situação com detalhes..."
              className="min-h-[100px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label>Evidência (opcional)</Label>
            <div className="border border-dashed border-border rounded-lg p-4 text-center">
              {evidenceFile ? (
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-sm text-foreground truncate max-w-[200px]">{evidenceFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setEvidenceFile(null)}>
                    Remover
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG ou WebP (máx. 5MB)</span>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Suas denúncias são sempre anônimas. O usuário denunciado não saberá quem fez a denúncia.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={!category || submitting}
            className="w-full"
          >
            {submitting ? 'Enviando...' : 'Enviar Denúncia'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
