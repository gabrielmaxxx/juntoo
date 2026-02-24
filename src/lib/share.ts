import { Event } from '@/types';
import { toast } from '@/hooks/use-toast';

/**
 * Share an event using the Web Share API with fallback to clipboard.
 */
export const shareEvent = async (event: Event, baseUrl?: string) => {
  const url = `${baseUrl || window.location.origin}/?event=${event.id}`;
  const text = `🎉 ${event.title}\n📍 ${event.location}\n📅 ${event.date} às ${event.time}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: event.title,
        text,
        url,
      });
      return true;
    } catch (err) {
      // User cancelled share - not an error
      if ((err as Error).name === 'AbortError') return false;
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n\n${url}`);
    toast({
      title: 'Link copiado!',
      description: 'O link do evento foi copiado para a área de transferência.',
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
