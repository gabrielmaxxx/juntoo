import { useNavigate } from 'react-router-dom';
import juntooLogo from '@/assets/juntoo-logo.jpg';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-10 w-10 rounded-2xl',
  md: 'h-14 w-14 rounded-[1.35rem]',
  lg: 'h-24 w-24 rounded-[2rem]',
} as const;

const imageScaleMap = {
  sm: 'scale-[1.26]',
  md: 'scale-[1.24]',
  lg: 'scale-[1.18]',
} as const;

export const BrandLogo = ({
  className,
  imageClassName,
  labelClassName,
  showLabel = false,
  size = 'md',
}: BrandLogoProps) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('overflow-hidden bg-primary/10 shadow-sm', sizeMap[size])}>
        <img
          src={juntooLogo}
          alt="Logo do Juntoo"
          className={cn('h-full w-full object-cover object-center', imageScaleMap[size], imageClassName)}
          loading="eager"
        />
      </div>
      {showLabel ? (
        <span className={cn('text-xl font-bold tracking-[0.18em] text-primary-foreground uppercase', labelClassName)}>
          Juntoo
        </span>
      ) : null}
    </div>
  );
};
