import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EventEditDialogProps {
  open: boolean;
  onClose: () => void;
  event: {
    title: string;
    description: string;
    location: string;
    date: string;
    time: string;
  };
  onSave: (updates: { title?: string; description?: string; location?: string; date?: string; time?: string }) => Promise<boolean>;
}

export const EventEditDialog = ({ open, onClose, event, onSave }: EventEditDialogProps) => {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [location, setLocation] = useState(event.location);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, string> = {};
    if (title !== event.title) updates.title = title;
    if (description !== event.description) updates.description = description;
    if (location !== event.location) updates.location = location;
    if (date !== event.date) updates.date = date;
    if (time !== event.time) updates.time = time;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    const success = await onSave(updates);
    setSaving(false);
    if (success) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">Local</Label>
            <Input id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Horário</Label>
              <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
