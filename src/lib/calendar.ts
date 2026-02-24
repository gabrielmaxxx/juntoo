import { Event } from '@/types';
import { toast } from '@/hooks/use-toast';

/**
 * Generate an .ics calendar file and trigger download.
 */
export const addToCalendar = (event: Event) => {
  try {
    const startDate = formatICSDate(event.date, event.time);
    const endDate = formatICSDate(event.date, event.time, 2); // 2h duration

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Juntoo//Events//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description || '')}`,
      `LOCATION:${escapeICS(event.location)}`,
      `URL:${window.location.origin}/?event=${event.id}`,
      'STATUS:CONFIRMED',
      `UID:${event.id}@juntoo.app`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Evento exportado!',
      description: 'O arquivo .ics foi baixado. Abra-o para adicionar ao seu calendário.',
    });
  } catch {
    toast({
      title: 'Erro',
      description: 'Não foi possível gerar o arquivo do calendário.',
      variant: 'destructive',
    });
  }
};

/**
 * Format date/time to ICS format (YYYYMMDDTHHMMSS)
 */
const formatICSDate = (date: string, time: string, addHours = 0): string => {
  const [year, month, day] = date.split('-');
  const [hours, minutes] = time.split(':');
  
  let h = parseInt(hours, 10) + addHours;
  const d = parseInt(day, 10);
  
  // Simple overflow handling
  if (h >= 24) h = 23;

  return `${year}${month.padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${minutes.padStart(2, '0')}00`;
};

const escapeICS = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};
