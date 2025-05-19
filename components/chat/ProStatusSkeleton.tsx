import React from 'react';

const ProStatusSkeleton = () => {
  return (
    <div className="p-3 mb-3 bg-gradient-to-r from-[#9e4244]/80 to-[#d88c6a]/80 rounded-lg shadow-sm overflow-hidden relative animate-pulse">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-8"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/5 rounded-full translate-y-8 -translate-x-8"></div>
      
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center shadow-sm">
            <div className="w-3 h-3 bg-white/40 rounded-sm"></div>
          </div>
          <div>
            <div className="h-3 w-20 rounded bg-white/30"></div>
            <div className="h-2 w-24 rounded bg-white/20 mt-1"></div>
          </div>
        </div>
      </div>
      
      {/* Status skeleton */}
      <div className="bg-white/10 rounded-md p-2 mb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-white/20 rounded-full"></div>
            <div className="h-2 w-16 bg-white/20 rounded"></div>
          </div>
          <div className="h-3 w-10 bg-white/20 rounded"></div>
        </div>
      </div>
      
      {/* Button skeleton */}
      <div className="h-7 w-full bg-white/30 rounded-md"></div>
    </div>
  );
};

export default ProStatusSkeleton;
