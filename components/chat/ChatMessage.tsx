import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import Image from 'next/image';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { 
  MarkdownView, 
  containsMarkdown, 
  initializeCodeBlockCopyButtons,
  containsThinkingBlocks,
  hasCompleteThinkingBlocks
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
  isStreaming?: boolean; // Add streaming state
}

interface ChatMessageProps {
  message: Message;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

// Memoized ChatMessage component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, copiedId, onCopy }: ChatMessageProps) => {
  const [hasMarkdown, setHasMarkdown] = useState(false);
  const [codeBlocks, setCodeBlocks] = useState<{code: string, language: string}[]>([]);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stable refs to prevent infinite loops
  const messageContentRef = useRef<string>('');
  const lastProcessedHashRef = useRef<string>('');
  const processedDataRef = useRef<ProcessedContentResult | null>(null);
  const isFirstRenderRef = useRef(true);
  
  // Create a stable content hash for change detection
  const contentHash = useMemo(() => {
    let hash = 0;
    const str = `${message.id}-${message.content}-${message.type}-${message.isStreaming || false}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }, [message.id, message.content, message.type, message.isStreaming]);
  
  // Define the interface for processed content result
  interface ProcessedContentResult {
    hasThinkingBlocks: boolean;
    hasCompleteThinking: boolean;
    hasMarkdown: boolean;
    codeBlocks: {code: string, language: string}[];
    contentHash: string;
  }
  
  // Stable content processing - only when content actually changes
  const processedContent = useMemo(() => {
    // Skip processing if content hasn't changed
    if (lastProcessedHashRef.current === contentHash && processedDataRef.current) {
      return processedDataRef.current;
    }
    
    // Skip processing for user messages
    if (message.type !== "ai") {
      return null;
    }
    
    // Prevent processing during streaming updates unless content meaningfully changed
    if (message.isStreaming && messageContentRef.current) {
      const contentDiff = Math.abs(message.content.length - messageContentRef.current.length);
      if (contentDiff < 10 && message.content.includes(messageContentRef.current.slice(0, -50))) {
        return processedDataRef.current;
      }
    }
    
    setIsProcessing(true);
    
    try {
      // Store current content
      messageContentRef.current = message.content;
      
      // Check for thinking blocks
      const hasThinkingBlocks = containsThinkingBlocks(message.content);
      const hasCompleteThinking = hasCompleteThinkingBlocks(message.content);
      
      // Check for markdown
      const hasMarkdownSyntax = containsMarkdown(message.content);
      const hasMarkdownLinks = /\[.+?\]\(.+?\)/.test(message.content);
      const shouldUseMarkdown = hasMarkdownSyntax || hasMarkdownLinks || hasThinkingBlocks;
      
      const result: ProcessedContentResult = {
        hasThinkingBlocks,
        hasCompleteThinking,
        hasMarkdown: shouldUseMarkdown,
        codeBlocks: hasMarkdownSyntax ? extractCodeBlocks(message.content) : [],
        contentHash
      };
      
      // Cache the result
      processedDataRef.current = result;
      lastProcessedHashRef.current = contentHash;
      
      return result;
    } catch {
      console.error("Error processing markdown");
      return {
        hasThinkingBlocks: false,
        hasCompleteThinking: false,
        hasMarkdown: false,
        codeBlocks: [],
        contentHash
      };
    } finally {
      setIsProcessing(false);
    }
  }, [contentHash, message.content, message.type, message.isStreaming]);
  
  // Error detection - only run when content changes significantly
  useEffect(() => {
    if (message.type !== "ai") return;
    
    // Only check for errors on meaningful content changes
    if (isFirstRenderRef.current || Math.abs(message.content.length - messageContentRef.current.length) > 20) {
      try {
        if (message.content.trim().startsWith('{') && message.content.includes('"error"')) {
          const errorData = JSON.parse(message.content);
          if (errorData.error) {
            setIsError(true);
            setErrorMessage(errorData.error);
            return;
          }
        }
        setIsError(false);
        setErrorMessage(null);
      } catch {
        setIsError(false);
        setErrorMessage(null);
      }
    }
  }, [message.content, message.type]);
  
  // Update component state only when processed content changes
  useEffect(() => {
    if (!processedContent) return;
    
    // Batch state updates to prevent flickering
    const updateState = () => {
      setHasMarkdown(processedContent.hasMarkdown);
      setCodeBlocks(processedContent.codeBlocks);
      
      if (!isInitialized) {
        setIsInitialized(true);
        isFirstRenderRef.current = false;
      }
    };
    
    // Use requestAnimationFrame for smooth updates
    const rafId = requestAnimationFrame(updateState);
    return () => cancelAnimationFrame(rafId);
  }, [processedContent, isInitialized]);

  // Stable markdown processing
  const processedMarkdown = useMemo(() => {
    if (!hasMarkdown || !message.content) return null;
    
    // Use the actual content hash to prevent unnecessary processing
    const key = `${message.id}-${contentHash}`;
    
    return {
      key,
      content: message.content,
      isStreaming: message.isStreaming || false
    };
  }, [hasMarkdown, message.content, message.id, contentHash, message.isStreaming]);

  // Initialize interactive elements with proper debouncing
  const initializeInteractiveElements = useCallback(() => {
    if (!hasMarkdown || !isInitialized || isProcessing) return;
    
    const timeoutId = setTimeout(() => {
      try {
        initializeCodeBlockCopyButtons(message.id, onCopy);
        
        // Ensure global toggle function
        if (typeof window !== 'undefined' && !window.toggleThinkingBlock) {
          window.toggleThinkingBlock = function(blockId: string) {
            const container = document.getElementById(blockId);
            if (!container) return;
            
            const content = container.querySelector('.thinking-complete-content') as HTMLElement;
            const chevron = container.querySelector('.thinking-complete-chevron') as HTMLElement;
            const toggleText = container.querySelector('.thinking-complete-toggle-text') as HTMLElement;
            
            if (!content || !chevron || !toggleText) return;
            
            const isExpanded = content.getAttribute('data-expanded') === 'true';
            const newState = !isExpanded;
            
            content.setAttribute('data-expanded', newState.toString());
            chevron.style.transform = newState ? 'rotate(180deg)' : 'rotate(0deg)';
            toggleText.textContent = newState ? 'Hide Process' : 'Show Process';
            
            if (newState) {
              const steps = container.querySelectorAll('.thinking-step');
              steps.forEach((step, index) => {
                if (step instanceof HTMLElement) {
                  step.style.animationDelay = (index * 0.1) + 's';
                  step.style.animation = 'none';
                  void step.offsetHeight; // Force reflow
                  step.style.animation = 'stepReveal 0.5s ease-out forwards';
                }
              });
            }
          };
        }
        
        // Fix links
        const messageElement = document.querySelector(`.message-${message.id}`);
        if (messageElement) {
          const links = messageElement.querySelectorAll('a:not([data-link-initialized])');
          
          links.forEach((link) => {
            if (link instanceof HTMLAnchorElement) {
              link.setAttribute('data-link-initialized', 'true');
              
              const href = link.getAttribute('href');
              if (!href && link.className.includes('external-link')) {
                const potentialUrl = link.textContent?.trim();
                if (potentialUrl && (potentialUrl.startsWith('http') || 
                                     potentialUrl.startsWith('https') || 
                                     potentialUrl.includes('.'))) {
                  const fixedUrl = potentialUrl.startsWith('http') ? potentialUrl : `https://${potentialUrl}`;
                  link.setAttribute('href', fixedUrl);
                }
              }
              
              if (link.getAttribute('href') && 
                  (link.getAttribute('href')?.startsWith('http') || 
                   link.getAttribute('href')?.startsWith('https'))) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                
                link.addEventListener('click', () => {
                  link.classList.add('link-clicked');
                }, { once: true });
              }
              
              if (link.getAttribute('data-markdown-formatted') === 'true') {
                link.classList.add('markdown-link');
              }
            }
          });
        }
      } catch (error) {
        console.error("Error initializing interactive elements:", error);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [hasMarkdown, isInitialized, isProcessing, message.id, onCopy]);

  // Initialize elements when ready
  useEffect(() => {
    if (hasMarkdown && isInitialized && !isProcessing) {
      const cleanup = initializeInteractiveElements();
      return cleanup;
    }
  }, [hasMarkdown, isInitialized, isProcessing, initializeInteractiveElements]);
  
  // Show loading state only for AI messages that aren't initialized yet
  if (message.type === "ai" && !isInitialized && !isError && !isProcessing) {
    return (
      <div className="flex items-start">
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
        <div className="bg-white text-[#3a3238] p-4 rounded-2xl shadow-md max-w-[80%] relative group border border-[#d1c7b9] animate-pulse">
          <div className="h-4 bg-[#f5f0e6] rounded w-3/4"></div>
        </div>
      </div>
    );
  }
  
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
        ) : message.type === "ai" && hasMarkdown && processedMarkdown ? (
          <>
            <MarkdownView 
              key={processedMarkdown.key}
              markdown={processedMarkdown.content} 
              className="ai-markdown break-words" 
              isStreaming={processedMarkdown.isStreaming}
              messageId={message.id}
            />
            
            {codeBlocks.length > 0 && !containsMarkdown(message.content) && (
              <div className="mt-3">
                {codeBlocks.map((block, index) => (
                  <div key={`${message.id}-code-${index}`} className="bg-[#3a3238] rounded-lg overflow-hidden my-3 border border-[#4a4248]">
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.copiedId === nextProps.copiedId
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;