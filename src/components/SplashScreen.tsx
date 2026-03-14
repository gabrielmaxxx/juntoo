import { useEffect, useState } from 'react';
import splashIcon from '@/assets/splash-icon.png';
import logoText from '@/assets/logo-text-white.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 juntoo-gradient flex flex-col items-center justify-center z-50 transition-opacity duration-300 ${
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