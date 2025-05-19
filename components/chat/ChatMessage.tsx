import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { 
  MarkdownView, 
  containsMarkdown, 
  initializeCodeBlockCopyButtons
} from '@/utils/markdownProcessor';

// Add a fallback implementation for extractCodeBlocks
const extractCodeBlocks = (markdown: string): { code: string, language: string }[] => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: { code: string, language: string }[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    codeBlocks.push({
      language: match[1] || 'plaintext',
      code: match[2].trim()
    });
  }
  
  return codeBlocks;
};

export interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  hasCode?: boolean;
  code?: string;
}

interface ChatMessageProps {
  message: Message;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

const ChatMessage = ({ message, copiedId, onCopy }: ChatMessageProps) => {
  const [hasMarkdown, setHasMarkdown] = useState(false);
  const [codeBlocks, setCodeBlocks] = useState<{code: string, language: string}[]>([]);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Detect API error messages in JSON format
  useEffect(() => {
    if (message.type === "ai") {
      try {
        // Check for error messages in JSON format
        if (message.content.trim().startsWith('{') && message.content.includes('"error"')) {
          const errorData = JSON.parse(message.content);
          if (errorData.error) {
            setIsError(true);
            setErrorMessage(errorData.error);
            return;
          }
        }
        
        // Reset error state if no error is found
        setIsError(false);
        setErrorMessage(null);
      } catch (error: unknown) {
        console.debug("JSON parsing failed:", error);
        setIsError(false);
        setErrorMessage(null);
      }
    }
  }, [message.content, message.type]);
  
  // Detect markdown content including explicit markdown links
  useEffect(() => {
    if (message.type === "ai" && !isError) {
      try {
        // Check for both ordinary markdown and explicit markdown-formatted links
        const hasMarkdownSyntax = containsMarkdown(message.content);
        const hasMarkdownLinks = /\[.+?\]\(.+?\)/.test(message.content);
        
        // Set hasMarkdown if either condition is true
        setHasMarkdown(hasMarkdownSyntax || hasMarkdownLinks);
        
        if (hasMarkdownSyntax) {
          // Extract code blocks if markdown is detected
          const extractedBlocks = extractCodeBlocks(message.content);
          setCodeBlocks(extractedBlocks);
        }
      } catch (error: unknown) {
        console.error("Error processing markdown:", error);
        setHasMarkdown(false);
      }
    }
  }, [message.content, message.type, isError]);

  // Initialize interactive elements for markdown content
  useEffect(() => {
    if (hasMarkdown) {
      try {
        // Increased timeout to ensure the DOM is fully updated
        setTimeout(() => {
          // Initialize code block copy buttons
          initializeCodeBlockCopyButtons(message.id, onCopy);
          
          // Fix and debug links in the markdown
          const messageElement = document.querySelector(`.message-${message.id}`);
          if (messageElement) {
            const links = messageElement.querySelectorAll('a');
            
            links.forEach((link, index) => {
              if (link instanceof HTMLAnchorElement) {
                // Check for missing href attribute
                const href = link.getAttribute('href');
                console.log(`Link #${index}:`, { href, classes: link.className });
                
                // Try to recover href if it's missing
                if (!href && link.className.includes('external-link')) {
                  // Extract URL from text content if it looks like a URL
                  const potentialUrl = link.textContent?.trim();
                  if (potentialUrl && (potentialUrl.startsWith('http') || 
                                       potentialUrl.startsWith('https') || 
                                       potentialUrl.includes('.'))) {
                    // Force set href attribute
                    const fixedUrl = potentialUrl.startsWith('http') ? potentialUrl : `https://${potentialUrl}`;
                    console.log(`Fixing missing href for ${potentialUrl} -> ${fixedUrl}`);
                    link.setAttribute('href', fixedUrl);
                  }
                }
                
                // Always ensure external links open in new tab
                if (link.getAttribute('href') && 
                    (link.getAttribute('href')?.startsWith('http') || 
                     link.getAttribute('href')?.startsWith('https'))) {
                  link.setAttribute('target', '_blank');
                  link.setAttribute('rel', 'noopener noreferrer');
                  
                  // Add click animation
                  link.addEventListener('click', () => {
                    link.classList.add('link-clicked');
                  });
                }
                
                // Debug: Log all link properties
                if (!link.getAttribute('href')) {
                  console.warn('Link missing href:', {
                    text: link.textContent,
                    class: link.className,
                    attributes: Array.from(link.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
                  });
                }
                
                // Check for markdown formatting
                if (link.getAttribute('data-markdown-formatted') === 'true') {
                  link.classList.add('markdown-link');
                }
              }
            });
          }
        }, 300);
      } catch (error) {
        console.error("Error initializing interactive elements:", error);
      }
    }
  }, [hasMarkdown, message.id, onCopy]);
  
  return (
    <div className={`flex items-start ${message.type === "user" ? "justify-end" : ""}`}>
      {message.type === "ai" && (
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
      )}
      <div
        className={`${
          message.type === "user" ? "bg-[#5c7c7d] text-white" : "bg-white text-[#3a3238]"
        } p-4 rounded-2xl shadow-md max-w-[80%] relative group border ${
          message.type === "user" ? "border-[#4a6a6b]" : isError ? "border-red-300" : "border-[#d1c7b9]"
        } message-${message.id} break-words`}
      >
        {message.type === "ai" && isError ? (
          <div className="error-message-container animate-fadeIn">
            <div className="flex items-start gap-2 mb-2">
              <div className="bg-red-100 p-1.5 rounded-full">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div className="font-medium text-red-600">Error Message</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-700 break-words">
              {errorMessage}
            </div>
          </div>
        ) : message.type === "ai" && hasMarkdown ? (
          <>
            <MarkdownView markdown={message.content} className="ai-markdown break-words" />
            
            {/* Display code blocks separately if needed */}
            {codeBlocks.length > 0 && !containsMarkdown(message.content) && (
              <div className="mt-3">
                {codeBlocks.map((block, index) => (
                  <div key={index} className="bg-[#3a3238] rounded-lg overflow-hidden my-3 border border-[#4a4248]">
                    <div className="p-4 font-mono text-sm overflow-auto text-[#f5f0e6] break-words">
                      <pre className="whitespace-pre-wrap break-words">{block.code}</pre>
                    </div>
                    <div className="flex justify-between bg-[#4a4248] px-4 py-2">
                      <span className="text-xs text-[#d1c7b9]">{block.language}</span>
                      <button
                        className="flex items-center text-[#d1c7b9] hover:bg-[#5a525a] p-1 rounded transition-colors"
                        onClick={() => onCopy(block.code, `code-block-${index}-${message.id}`)}
                      >
                        {copiedId === `code-block-${index}-${message.id}` ? (
                          <>
                            <Check size={14} className="text-[#d88c6a]" />
                            <span className="ml-1 text-xs text-[#d88c6a]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span className="ml-1 text-xs">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className={`${message.type === "user" ? "text-white" : "text-[#3a3238]"} break-words`}>{message.content}</p>
        )}

        {/* Copy button for AI messages */}
        {message.type === "ai" && !isError && (
          <button
            className="absolute top-2 right-2 p-1.5 rounded-full bg-[#f5f0e6] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#e9e4da]"
            onClick={() => onCopy(message.content + (message.code ? "\n\n" + message.code : ""), message.id)}
          >
            {copiedId === message.id ? (
              <Check size={14} className="text-[#9e4244]" />
            ) : (
              <Copy size={14} className="text-[#3a3238]" />
            )}
          </button>
        )}

        {/* Message timestamp */}
        <div
          className={`text-[10px] mt-1 text-right ${
            message.type === "user" ? "text-white/70" : isError ? "text-red-500/70" : "text-[#3a3238]/50"
          }`}
        >
          {message.timestamp.getHours().toString().padStart(2, '0')}:{message.timestamp.getMinutes().toString().padStart(2, '0')}
        </div>
      </div>
      {message.type === "user" && (
        <div className="w-8 h-8 bg-[#d88c6a] rounded-full flex items-center justify-center ml-3 mt-1 shadow-md">
          <span className="text-white font-medium">U</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
