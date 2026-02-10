import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  showSkeleton?: boolean;
  blurPlaceholder?: boolean;
}

export const LazyImage = ({
  src,
  alt,
  fallback = '/placeholder.svg',
  aspectRatio = 'auto',
  showSkeleton = true,
  blurPlaceholder = true,
  className,
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    auto: ''
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const imageSrc = isInView ? (hasError ? fallback : src) : undefined;

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden', aspectRatioClasses[aspectRatio], className)}
    >
      {/* Blur placeholder background */}
      {blurPlaceholder && !isLoaded && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/5 to-muted-foreground/10" />
        </div>
      )}

      {/* Skeleton fallback */}
      {showSkeleton && !blurPlaceholder && !isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Actual image */}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-all duration-500 ease-out',
          isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'
        )}
        {...props}
      />
    </div>
  );
};
