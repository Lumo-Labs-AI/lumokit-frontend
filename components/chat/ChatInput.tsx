import Link from "next/link";
import { Send } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

const ChatInput = ({ 
  message, 
  setMessage, 
  handleSendMessage, 
  handleKeyDown, 
  disabled = false,
  isStreaming = false
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isButtonDisabled = !message.trim() || disabled || isStreaming;

  useEffect(() => {
    // Adjust textarea height based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="p-3 border-t border-[#d1c7b9] bg-[#f5f0e6]">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isStreaming}
            className={`w-full p-3 pr-12 bg-white border border-[#d1c7b9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5c7c7d] focus:border-transparent resize-none min-h-[55px] max-h-[120px] ${
              disabled || isStreaming ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ height: '55px' }}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isButtonDisabled}
            className={`absolute right-3 top-1/2 -translate-y-1/2 bg-[#5c7c7d] text-white p-2 rounded-full transition-all ${
              isButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4a6a6b] active:scale-95'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-[#3a3238] flex items-center justify-center hidden sm:flex">
        <span>
          Caution is advised. Do not disclose confidential or sensitive information. You assume full responsibility for all actions taken using this copilot.
        </span>
        <Link href="https://www.lumolabs.ai/lumo-community/report" target="_blank" className="ml-1 text-[#9e4244] hover:underline">
          Get support from Lumo Team.
        </Link>
      </div>
    </div>
  );
};

export default ChatInput;
