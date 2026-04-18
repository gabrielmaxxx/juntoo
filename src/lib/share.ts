import { Event } from '@/types';
import { toast } from '@/hooks/use-toast';

/**
 * Build a public, shareable URL for an event.
 * Uses /eventos/:id which is mapped to the event detail in Index.tsx.
 */
export const buildEventUrl = (eventId: string, baseUrl?: string) => {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://juntoo.lovable.app');
  return `${origin}/eventos/${eventId}`;
};

/**
 * Friendly date formatter for share text (Brazilian Portuguese).
 */
const formatShareDate = (date: string, time: string) => {
  try {
    const d = new Date(`${date}T${time}`);
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const hh = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} às ${hh}`;
  } catch {
    return `${date} ${time}`;
  }
};

/**
 * Build the WhatsApp-friendly text for an event.
 */
export const buildShareText = (event: Event, url: string) => {
  const when = formatShareDate(event.date, event.time);
  return `Oi! Tem uma atividade no Juntoo que você pode gostar: ${event.title} — ${when} — ${url}`;
};

/**
 * Open a WhatsApp share dialog with pre-filled text.
 */
export const shareEventOnWhatsApp = (event: Event) => {
  const url = buildEventUrl(event.id);
  const text = buildShareText(event, url);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Share an event using the Web Share API with fallback to clipboard.
 */
export const shareEvent = async (event: Event, baseUrl?: string) => {
  const url = buildEventUrl(event.id, baseUrl);
  const text = buildShareText(event, url);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: event.title,
        text,
        url,
      });
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Link copiado!',
      description: 'Cole no WhatsApp ou em qualquer lugar para compartilhar.',
    });
    return true;
  } catch {
    toast({
      title: 'Erro ao compartilhar',
      description: 'Não foi possível compartilhar o evento.',
      variant: 'destructive',
    });
    return false;
  }
};
