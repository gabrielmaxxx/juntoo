import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

/**
 * Accessible live region component for announcing dynamic content changes.
 * Uses aria-live to notify screen readers of state changes.
 */
export const LiveRegion = ({
  message,
  politeness = 'polite',
  clearAfter = 5000,
}: LiveRegionProps) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (message) {
      // Clear first, then set — forces re-announcement of same message
      setAnnouncement('');
      const setTimer = setTimeout(() => setAnnouncement(message), 100);
      
      const clearTimer = clearAfter > 0
        ? setTimeout(() => setAnnouncement(''), clearAfter)
        : undefined;

      return () => {
        clearTimeout(setTimer);
        if (clearTimer) clearTimeout(clearTimer);
      };
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

/**
 * Hook to manage live region announcements
 */
export const useLiveAnnouncement = () => {
  const [message, setMessage] = useState('');

  const announce = (text: string) => {
    setMessage('');
    // Use timeout to force re-announcement
    setTimeout(() => setMessage(text), 50);
  };

  return { message, announce };
};
