import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rectangular' }) => {
  const baseClasses = 'skeleton bg-gray-800 rounded';
  
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };
  
  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  );
};

export const CoinBalanceSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
    <Skeleton variant="circular" className="w-12 h-12" />
    <div className="flex-1">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-6 w-32" />
    </div>
  </div>
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <div className="p-4">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-2/3 mb-4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>
  </div>
);

export const LeaderboardSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <Skeleton variant="circular" className="w-10 h-10 mb-3" />
        <Skeleton className="h-6 w-16 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    ))}
  </div>
);
