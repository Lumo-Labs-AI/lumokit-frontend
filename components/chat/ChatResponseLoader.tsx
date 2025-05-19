import React from 'react';
import Image from 'next/image';

const ChatResponseLoader = () => {
  return (
    <div className="flex items-start" data-testid="chat-response-loader">
      <div className="w-8 h-8 rounded-md flex items-center justify-center mr-3 mt-1 shadow-md ai-icon-container">
        <div className="relative w-full h-full z-10 flex items-center justify-center ai-icon-inner">
          <Image
            src="/lumo-icon.png"
            alt="Lumo AI"
            width={16}
            height={16}
            className="w-5 h-5 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)] z-10"
            priority
          />
        </div>
      </div>
      <div className="bg-white text-[#3a3238] p-4 rounded-2xl shadow-md max-w-[80%] border border-[#d1c7b9] relative min-h-[48px] min-w-[120px]">
        <div className="flex flex-col gap-2">
          <div className="h-2.5 bg-[#e9e4da] rounded w-24 animate-pulse"></div>
          <div className="h-2.5 bg-[#e9e4da] rounded w-32 animate-pulse"></div>
          <div className="h-2.5 bg-[#e9e4da] rounded w-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatResponseLoader;
