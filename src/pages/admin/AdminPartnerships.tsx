import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Handshake, Plus, TrendingUp, Percent, BadgeCheck } from 'lucide-react';

type PartnershipStatus = 'prospeccao' | 'conversa_aberta' | 'teste_agendado' | 'parceria_ativa' | 'encerrada';
type PartnershipModality = 'troca_de_valor' | 'destaque_simples' | 'comissao_evento' | 'assinatura_empresarial';

interface PartnershipLead {
  id: string;
  establishment_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: PartnershipStatus;
  modality: PartnershipModality;
  monthly_value: number | null;
  last_interaction_at: string;
  notes: string | null;
  business_verification_id: string | null;
  created_at: string;
}

const STATUS_COLUMNS: { key: PartnershipStatus; label: string }[] = [
  { key: 'prospeccao', label: 'Prospecção' },
  { key: 'conversa_aberta', label: 'Conversa aberta' },
  { key: 'teste_agendado', label: 'Teste agendado' },
  { key: 'parceria_ativa', label: 'Parceria ativa' },
  { key: 'encerrada', label: 'Encerrada' },
];

const MODALITY_LABELS: Record<PartnershipModality, string> = {
  troca_de_valor: 'Troca de valor',
  destaque_simples: 'Destaque simples',
  comissao_evento: 'Comissão por evento',
  assinatura_empresarial: 'Assinatura empresarial',
};

const emptyForm = {
  establishment_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  status: 'prospeccao' as PartnershipStatus,
  modality: 'troca_de_valor' as PartnershipModality,
  monthly_value: '',
  notes: '',
  business_verification_id: '',
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminPartnerships() {
  const { user, logAction } = useAdminAuth();
  const [leads, setLeads] = useState<PartnershipLead[]>([]);
  const [verifications, setVerifications] = useState<{ id: string; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    const [leadsRes, verifRes] = await Promise.all([
      supabase.from('partnership_leads').select('*').order('last_interaction_at', { ascending: false }),
      supabase.from('business_verifications').select('id, company_name').eq('status', 'approved'),
    ]);
    setLeads((leadsRes.data as PartnershipLead[]) || []);
    setVerifications(verifRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Realtime sync between admins
  useEffect(() => {
    const channel = supabase.channel('admin-partnerships-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partnership_leads' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeLeads = leads.filter(l => l.status === 'parceria_ativa');
  const totalTicket = activeLeads.reduce((sum, l) => sum + (Number(l.monthly_value) || 0), 0);
  const avgTicket = activeLeads.length ? totalTicket / activeLeads.length : 0;
  const conversion = leads.length ? (activeLeads.length / leads.length) * 100 : 0;

  const createLead = async () => {
    if (!form.establishment_name.trim()) {
      toast.error('Informe o nome do estabelecimento.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('partnership_leads').insert({
      establishment_name: form.establishment_name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      status: form.status,
      modality: form.modality,
      monthly_value: form.monthly_value ? Number(form.monthly_value) : null,
      notes: form.notes.trim() || null,
      business_verification_id: form.business_verification_id || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error('Não foi possível criar o lead.');
      return;
    }
    await logAction('partnership_lead_created', 'partnership_lead', undefined, form.establishment_name);
    toast.success('Lead criado.');
    setForm(emptyForm);
    setDialogOpen(false);
    fetchAll();
  };

  const changeStatus = async (lead: PartnershipLead, status: PartnershipStatus) => {
    const { error } = await supabase
      .from('partnership_leads')
      .update({ status, last_interaction_at: new Date().toISOString() })
      .eq('id', lead.id);
    if (error) {
      toast.error('Não foi possível atualizar o status.');
      return;
    }
    await logAction('partnership_lead_status_changed', 'partnership_lead', lead.id, status);
    toast.success('Status atualizado.');
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            Parcerias comerciais
          </h1>
          <p className="text-xs text-muted-foreground">Funil do Pilar 1 de monetização</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo lead
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <BadgeCheck className="w-4 h-4" /> Parcerias ativas
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{activeLeads.length}</p>
            <p className="text-xs text-muted-foreground">de {leads.length} leads no funil</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="w-4 h-4" /> Receita mensal somada
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{brl(totalTicket)}</p>
            <p className="text-xs text-muted-foreground">ticket médio {brl(avgTicket)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Percent className="w-4 h-4" /> Conversão exploratória → ativa
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{conversion.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">parcerias ativas / total de leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {STATUS_COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.key);
          return (
            <div key={col.key} className="bg-muted/40 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-foreground">{col.label}</h2>
                <Badge variant="secondary" className="text-[10px]">{colLeads.length}</Badge>
              </div>

              {colLeads.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-4 text-center">Nenhum lead</p>
              )}

              {colLeads.map(lead => (
                <Card key={lead.id} className="shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{lead.establishment_name}</p>
                      {lead.contact_name && (
                        <p className="text-[11px] text-muted-foreground">{lead.contact_name}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{MODALITY_LABELS[lead.modality]}</Badge>
                      {lead.business_verification_id && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <BadgeCheck className="w-3 h-3" /> Verificado
                        </Badge>
                      )}
                    </div>

                    {lead.monthly_value != null && (
                      <p className="text-xs font-medium text-foreground">{brl(Number(lead.monthly_value))}/mês</p>
                    )}

                    {(lead.contact_email || lead.contact_phone) && (
                      <p className="text-[11px] text-muted-foreground break-all">
                        {[lead.contact_email, lead.contact_phone].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {lead.notes && (
                      <p className="text-[11px] text-muted-foreground line-clamp-3">{lead.notes}</p>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                      Última interação: {format(new Date(lead.last_interaction_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>

                    <Select value={lead.status} onValueChange={(v) => changeStatus(lead, v as PartnershipStatus)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map(s => (
                          <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>

      {/* Novo lead */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo lead de parceria</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="est">Estabelecimento *</Label>
              <Input id="est" value={form.establishment_name} onChange={e => setForm({ ...form, establishment_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cname">Contato</Label>
              <Input id="cname" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cmail">E-mail</Label>
                <Input id="cmail" type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cphone">Telefone</Label>
                <Input id="cphone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PartnershipStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Select value={form.modality} onValueChange={(v) => setForm({ ...form, modality: v as PartnershipModality })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODALITY_LABELS) as PartnershipModality[]).map(m => (
                      <SelectItem key={m} value={m}>{MODALITY_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="val">Valor mensal (R$)</Label>
              <Input id="val" type="number" min="0" step="0.01" value={form.monthly_value} onChange={e => setForm({ ...form, monthly_value: e.target.value })} />
            </div>

            {verifications.length > 0 && (
              <div className="space-y-1.5">
                <Label>Empresa verificada no app (opcional)</Label>
                <Select value={form.business_verification_id} onValueChange={(v) => setForm({ ...form, business_verification_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {verifications.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={createLead} disabled={saving}>{saving ? 'Salvando...' : 'Criar lead'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
