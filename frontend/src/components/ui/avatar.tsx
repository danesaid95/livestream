import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, alt, fallback, size = 'md', className, ...props }: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const showFallback = !src || hasError;
  const initials = fallback ? getInitials(fallback) : alt ? getInitials(alt) : '?';

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-pink-600',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold text-white">
          {initials}
        </div>
      )}
    </div>
  );
}
