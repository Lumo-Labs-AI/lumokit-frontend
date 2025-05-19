import React from 'react';

const ConversationSkeleton = () => {
  return (
    <div className="flex flex-col w-full p-2 rounded-md text-left mb-1 animate-pulse">
      <div className="w-3/4 h-4 bg-white/50 rounded"></div>
    </div>
  );
};

export default ConversationSkeleton;
