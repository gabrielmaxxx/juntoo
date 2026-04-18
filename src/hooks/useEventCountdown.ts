import { useEffect, useState } from 'react';

/**
 * Returns a friendly Portuguese countdown string for events starting soon.
 * Examples: "Começa em 3h 12min", "Começa em 45min", "Acontecendo agora", "Em 2 dias".
 */
export const useEventCountdown = (date: string, time: string) => {
  const [label, setLabel] = useState('');
  const [isImminent, setIsImminent] = useState(false); // <24h
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const compute = () => {
      const target = new Date(`${date}T${time}`).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setLabel('Acontecendo agora');
        setIsLive(true);
        setIsImminent(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);

      setIsLive(false);
      setIsImminent(diff < 24 * 60 * 60 * 1000);

      if (days >= 1) {
        setLabel(`Em ${days} ${days === 1 ? 'dia' : 'dias'}`);
      } else if (hours >= 1) {
        const remMins = mins % 60;
        setLabel(`Começa em ${hours}h${remMins > 0 ? ` ${remMins}min` : ''}`);
      } else {
        setLabel(`Começa em ${mins}min`);
      }
    };

    compute();
    const id = setInterval(compute, 60000); // update every minute
    return () => clearInterval(id);
  }, [date, time]);

  return { label, isImminent, isLive };
};
