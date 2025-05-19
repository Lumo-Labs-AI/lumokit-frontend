import React from 'react';

const MessageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* AI Message Skeleton */}
      <div className="flex items-start">
        <div className="w-8 h-8 rounded-md bg-[#e9e4da] flex-shrink-0 mr-3 mt-1"></div>
        <div className="bg-white p-4 rounded-2xl shadow-md max-w-[80%] w-[70%] h-20 border border-[#d1c7b9]"></div>
      </div>
      
      {/* User Message Skeleton */}
      <div className="flex items-start justify-end">
        <div className="bg-[#5c7c7d]/70 p-4 rounded-2xl shadow-md max-w-[80%] w-[60%] h-12 border border-[#4a6a6b]"></div>
        <div className="w-8 h-8 rounded-full bg-[#d88c6a]/70 flex-shrink-0 ml-3 mt-1"></div>
      </div>
      
      {/* AI Message Skeleton */}
      <div className="flex items-start">
        <div className="w-8 h-8 rounded-md bg-[#e9e4da] flex-shrink-0 mr-3 mt-1"></div>
        <div className="bg-white p-4 rounded-2xl shadow-md max-w-[80%] w-[80%] h-28 border border-[#d1c7b9]"></div>
      </div>
    </div>
  );
};

export default MessageSkeleton;
