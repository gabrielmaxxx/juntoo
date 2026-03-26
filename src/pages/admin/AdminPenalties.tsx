import { PenaltyHistory } from '@/components/moderation/PenaltyHistory';

export default function AdminPenalties() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Histórico de Punições</h1>
      <PenaltyHistory />
    </div>
  );
}
