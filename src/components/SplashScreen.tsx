import { useEffect, useState } from 'react';
import splashIcon from '@/assets/splash-icon.png';
import logoText from '@/assets/logo-text-white.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Skip splash if already shown this session
    const alreadyShown = sessionStorage.getItem('splash_shown');
    const delay = alreadyShown ? 0 : 500;

    if (delay === 0) {
      onComplete();
      return;
    }

    sessionStorage.setItem('splash_shown', '1');
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200);
    }, delay);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 juntoo-gradient flex flex-col items-center justify-center z-50 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <img 
        src={splashIcon} 
        alt="Juntoo" 
        className="w-24 h-24 object-contain"
      />
      <img 
        src={logoText} 
        alt="Juntoo" 
        className="w-40 h-auto object-contain mt-5"
      />
    </div>
  );
};
