import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { parseLocalDate } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sparkles, Search, XCircle, DollarSign, Megaphone } from 'lucide-react';

type SponsorTier = 'basico' | 'segmentado' | 'cpm';

const TIER_LABELS: Record<SponsorTier, string> = {
  basico: 'Destaque básico',
  segmentado: 'Destaque segmentado',
  cpm: 'CPM / impressões',
};

interface EventRow {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  date: string;
  is_sponsored: boolean;
  sponsor_tier: string | null;
  sponsor_expires_at: string | null;
}

interface LogRow {
  id: string;
  event_id: string;
  sponsor_tier: string;
  amount_charged: number | null;
  starts_at: string;
  expires_at: string | null;
  action: string;
  notes: string | null;
  created_at: string;
}

const isActive = (e: EventRow) =>
  e.is_sponsored && (!e.sponsor_expires_at || new Date(e.sponsor_expires_at) > new Date());

export default function AdminSponsorships() {
  const { user, logAction } = useAdminAuth();
  const [sponsored, setSponsored] = useState<EventRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  // search / activation
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<EventRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [tier, setTier] = useState<SponsorTier>('basico');
  const [expiresAt, setExpiresAt] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [ev, lg] = await Promise.all([
      supabase
        .from('events')
        .select('id,title,city,state,date,is_sponsored,sponsor_tier,sponsor_expires_at')
        .eq('is_sponsored', true)
        .order('sponsor_expires_at', { ascending: true, nullsFirst: false }),
      supabase
        .from('sponsored_events_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setSponsored((ev.data as EventRow[]) || []);
    setLogs((lg.data as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const kpis = useMemo(() => {
    const activations = logs.filter((l) => l.action === 'activated');
    const revenue = activations.reduce((sum, l) => sum + Number(l.amount_charged || 0), 0);
    const paid = activations.filter((l) => Number(l.amount_charged || 0) > 0);
    return {
      active: sponsored.filter(isActive).length,
      activations: activations.length,
      revenue,
      avgTicket: paid.length ? revenue / paid.length : 0,
    };
  }, [sponsored, logs]);

  const searchEvents = async () => {
    if (term.trim().length < 2) return;
    setSearching(true);
    const { data, error } = await supabase
      .from('events')
      .select('id,title,city,state,date,is_sponsored,sponsor_tier,sponsor_expires_at')
      .ilike('title', `%${term.trim()}%`)
      .is('cancelled_at', null)
      .order('date', { ascending: false })
      .limit(20);
    setSearching(false);
    if (error) { toast.error('Erro ao buscar eventos'); return; }
    setResults((data as EventRow[]) || []);
  };

  const openActivate = (e: EventRow) => {
    setSelected(e);
    setTier((e.sponsor_tier as SponsorTier) || 'basico');
    setExpiresAt(e.sponsor_expires_at ? e.sponsor_expires_at.slice(0, 10) : '');
    setAmount('');
    setNotes('');
  };

  const activate = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      const expiresIso = expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null;

      const { error: upErr } = await supabase
        .from('events')
        .update({ is_sponsored: true, sponsor_tier: tier, sponsor_expires_at: expiresIso })
        .eq('id', selected.id);
      if (upErr) throw upErr;

      const { error: logErr } = await supabase.from('sponsored_events_log').insert({
        event_id: selected.id,
        sponsor_tier: tier,
        amount_charged: amount ? Number(amount) : null,
        expires_at: expiresIso,
        action: 'activated',
        notes: notes || null,
        created_by: user.id,
      });
      if (logErr) throw logErr;

      await logAction('activate_sponsorship', 'event', selected.id, `${TIER_LABELS[tier]} • ${amount || '0'}`);
      toast.success('Patrocínio ativado');
      setSelected(null);
      setResults([]);
      setTerm('');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao ativar patrocínio');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (e: EventRow) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_sponsored: false, sponsor_expires_at: null })
        .eq('id', e.id);
      if (error) throw error;

      await supabase.from('sponsored_events_log').insert({
        event_id: e.id,
        sponsor_tier: (e.sponsor_tier as SponsorTier) || 'basico',
        action: 'deactivated',
        expires_at: new Date().toISOString(),
        created_by: user.id,
      });
      await logAction('deactivate_sponsorship', 'event', e.id, 'Patrocínio desativado');
      toast.success('Patrocínio desativado');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desativar');
    }
  };

  const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const eventTitle = (id: string) => sponsored.find((e) => e.id === id)?.title || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" aria-hidden="true" />
          Eventos Patrocinados
        </h1>
        <p className="text-sm text-muted-foreground">
          Ativação manual de patrocínio (sem checkout automatizado). O valor é cobrado fora do app e registrado aqui para os KPIs.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Patrocínios ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{kpis.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ativações totais</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{kpis.activations}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita registrada</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(kpis.revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-1">
            <DollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
            {money(kpis.avgTicket)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Patrocínios</TabsTrigger>
          <TabsTrigger value="ativar">Ativar patrocínio</TabsTrigger>
          <TabsTrigger value="log">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={6}>Carregando...</TableCell></TableRow>}
                  {!loading && sponsored.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum evento patrocinado.</TableCell></TableRow>
                  )}
                  {sponsored.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{e.city || '—'}{e.state ? `/${e.state}` : ''}</TableCell>
                      <TableCell>{e.sponsor_tier ? TIER_LABELS[e.sponsor_tier as SponsorTier] : '—'}</TableCell>
                      <TableCell>
                        {e.sponsor_expires_at ? format(new Date(e.sponsor_expires_at), "dd/MM/yyyy", { locale: ptBR }) : 'Sem prazo'}
                      </TableCell>
                      <TableCell>
                        {isActive(e)
                          ? <Badge className="bg-primary text-primary-foreground">Ativo</Badge>
                          : <Badge variant="secondary">Expirado</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openActivate(e)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deactivate(e)}>
                          <XCircle className="h-4 w-4 mr-1" aria-hidden="true" /> Desativar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ativar" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchEvents(); }}
              placeholder="Buscar evento por título..."
              aria-label="Buscar evento"
            />
            <Button onClick={searchEvents} disabled={searching}>
              <Search className="h-4 w-4 mr-1" aria-hidden="true" /> Buscar
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground">Busque um evento para ativar o patrocínio.</TableCell></TableRow>
                  )}
                  {results.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{format(parseLocalDate(e.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{e.city || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openActivate(e)}>
                          <Sparkles className="h-4 w-4 mr-1" aria-hidden="true" /> Patrocinar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-muted-foreground">Sem registros.</TableCell></TableRow>
                  )}
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{format(new Date(l.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell>{eventTitle(l.event_id)}</TableCell>
                      <TableCell>{TIER_LABELS[l.sponsor_tier as SponsorTier]}</TableCell>
                      <TableCell>{l.amount_charged ? money(Number(l.amount_charged)) : '—'}</TableCell>
                      <TableCell>
                        {l.action === 'activated'
                          ? <Badge className="bg-primary text-primary-foreground">Ativação</Badge>
                          : <Badge variant="secondary">Desativação</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{l.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patrocinar “{selected?.title}”</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as SponsorTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIER_LABELS) as SponsorTier[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-expires">Válido até</Label>
              <Input id="sponsor-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-amount">Valor cobrado (R$)</Label>
              <Input id="sponsor-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 150.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-notes">Notas</Label>
              <Textarea id="sponsor-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cobrança manual via Pix, contato do estabelecimento, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={activate} disabled={saving}>{saving ? 'Salvando...' : 'Ativar patrocínio'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
