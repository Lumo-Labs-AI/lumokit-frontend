"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

// Import components
import ChatSidebar from "@/components/chat/ChatSidebar"
import ChatMessage from "@/components/chat/ChatMessage"
import ChatInput from "@/components/chat/ChatInput"
import MessageSkeleton from "@/components/chat/MessageSkeleton"
import ChatResponseLoader from "@/components/chat/ChatResponseLoader"

// Import types
import { Message, Conversation, ApiMessage, ChatApiRequest } from "@/types/chat"

// Import styles
import "@/styles/chat.css"
import "@/styles/markdown.css"

// Import tools data
import toolsData from "@/data/tools.json"

export default function ChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState("")
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "ai",
      content: "Hello! Welcome to LumoKit. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [walletCreated, setWalletCreated] = useState(false)
  const [walletBalance] = useState("0.00")
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletSignature, setWalletSignature] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutHovered, setLogoutHovered] = useState(false)
  const logoutRef = useRef<HTMLDivElement>(null)
  
  // Pro status related states
  const [isProUser, setIsProUser] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [isProStatusLoading, setIsProStatusLoading] = useState(true)
  const [proStatusError, setProStatusError] = useState<string | null>(null)

  // Conversation related states
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentPublicKey, setAgentPublicKey] = useState<string | null>(null)
  const [agentPrivateKey, setAgentPrivateKey] = useState<string | null>(null)
  
  // New states for model, temperature, and tools
  const [selectedModel, setSelectedModel] = useState("gpt-4.1-mini")
  const [temperature, setTemperature] = useState(0.7)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  
  // Check authentication on load and collect wallet details
  useEffect(() => {
    const checkAuth = () => {
      const signature = localStorage.getItem("walletSignature");
      const publicKey = localStorage.getItem("walletPublicKey");
      
      if (!signature || !publicKey) {
        router.push("/");
      } else {
        setIsAuthenticated(true);
        setWalletAddress(publicKey);
        setWalletSignature(signature);
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);
  
  // Check if agent wallet is created and get keys
  useEffect(() => {
    const agentPublic = localStorage.getItem('agent_public');
    const agentPrivate = localStorage.getItem('agent_private');
    
    if (agentPublic) {
      setWalletCreated(true);
      setAgentPublicKey(agentPublic);
      if (agentPrivate) {
        setAgentPrivateKey(agentPrivate);
      }
    } else {
      setWalletCreated(false);
    }
  }, []);

  // Verify pro status on load
  useEffect(() => {
    const verifyProStatus = async () => {
      if (!walletAddress || !isAuthenticated) return;
      
      setIsProStatusLoading(true);
      setProStatusError(null);
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/verify-pro`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            public_key: walletAddress
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        setIsProUser(data.is_pro);
        setDaysRemaining(data.days_remaining);
      } catch (error) {
        console.error("Error verifying pro status:", error);
        setProStatusError("Failed to verify subscription status");
      } finally {
        setIsProStatusLoading(false);
      }
    };
    
    if (walletAddress && isAuthenticated) {
      verifyProStatus();
    }
  }, [walletAddress, isAuthenticated]);

  // Fetch last conversations from API
  const fetchLastConversations = useCallback(async () => {
    if (!walletAddress || !walletSignature || !isAuthenticated) return;
    
    // Don't show loading state if we already have conversations
    // This prevents the flickering effect
    if (conversations.length === 0) {
      setIsLoadingConversations(true);
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/last-conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          public_key: walletAddress,
          signature: walletSignature
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Only update if conversations actually changed
        // This prevents unnecessary re-renders
        const newConversations = data.conversations || [];
        if (JSON.stringify(newConversations) !== JSON.stringify(conversations)) {
          setConversations(newConversations);
        }
      } else {
        console.error("API returned error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [walletAddress, walletSignature, isAuthenticated, conversations]);
  
  // Initial fetch of conversations
  useEffect(() => {
    if (walletAddress && walletSignature && isAuthenticated) {
      fetchLastConversations();
    }
  }, [walletAddress, walletSignature, isAuthenticated, fetchLastConversations]);

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    
    // Set sidebar collapsed by default on mobile
    if (window.innerWidth < 768) {
      setSidebarExpanded(false)
    }
    
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Load conversation messages from API
  const loadConversation = async (conversationKey: string) => {
    if (!walletAddress || !walletSignature || !isAuthenticated) return;
    
    setIsLoadingMessages(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          public_key: walletAddress,
          signature: walletSignature,
          conversation_key: conversationKey
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Convert API messages to our Message format
        const formattedMessages = data.messages.flatMap((apiMsg: ApiMessage) => {
          // Create user message
          const userMessage: Message = {
            id: `user-${apiMsg.id}`,
            type: "user",
            content: apiMsg.message,
            timestamp: new Date(apiMsg.timestamp),
          };
          
          // Create AI message
          const aiMessage: Message = {
            id: `ai-${apiMsg.id}`,
            type: "ai",
            content: apiMsg.response,
            timestamp: new Date(apiMsg.timestamp),
          };
          
          return [userMessage, aiMessage];
        });
        
        setMessages(formattedMessages);
        setActiveConversationKey(conversationKey);
      } else {
        console.error("API returned error:", data.error);
        startNewChat();
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      startNewChat();
    } finally {
      setIsLoadingMessages(false);
      // Ensure scroll to bottom after a brief delay to let rendering complete
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversationKey: string) => {
    // If already loading, streaming, or same conversation, do nothing
    if (isLoadingMessages || isStreaming || activeConversationKey === conversationKey) return;
    
    // If mobile, collapse sidebar
    if (isMobile) {
      setSidebarExpanded(false);
    }
    
    loadConversation(conversationKey);
    
    // Refresh conversations after loading to update their order
    refreshConversationsAfterAction();
  };

  // Start a new chat
  const startNewChat = useCallback(() => {
    // Prevent starting a new chat when streaming is in progress
    if (isStreaming) return;
    
    setMessages([
      {
        id: "welcome",
        type: "ai",
        content: "Hello! Welcome to LumoKit. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
    setActiveConversationKey(null);
    
    // Ensure scroll to bottom after a brief delay to let rendering complete
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    
    // Refresh conversations to update their order
    // No need to call refreshConversationsAfterAction here as it's handled by activeConversationKey change or other flows.
    // Adding it might cause redundant fetches.
  }, [isStreaming]);
  
  // Make sure we have a welcome message when the page first loads
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      startNewChat();
    }
  }, [isAuthenticated, messages.length, startNewChat]);

  // Generate a unique ID for messages
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Add state for tracking if stream message has been added
  const [hasAddedStreamMessage, setHasAddedStreamMessage] = useState(false);
  
  // Stream chat response
  const streamChatResponse = async (userMessageContent: string) => {
    if (!walletAddress || !walletSignature || !isAuthenticated) return;
    
    // Create user message
    const userMessage: Message = {
      id: generateId(),
      type: "user",
      content: userMessageContent,
      timestamp: new Date(),
    };
    
    // Store current conversation key to ensure responses go to the right conversation
    const currentConversationKey = activeConversationKey;
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field
    setMessage("");
    
    // Set loading state
    setIsStreaming(true);
    setHasAddedStreamMessage(false);
    
    // Generate a unique message ID for this response
    const newStreamMessageId = `ai-response-${Date.now()}`;
    
    // Prepare request body - updated to include model, temperature, and tools
    const requestBody: ChatApiRequest = {
      public_key: walletAddress,
      signature: walletSignature,
      agent_public: agentPublicKey,
      agent_private: agentPrivateKey,
      conversation_key: currentConversationKey,
      message: userMessageContent,
      model_name: selectedModel,
      temperature: temperature,
      tools: selectedTools
    };
    
    try {
      // Initiate streaming request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Get response body as readable stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream');
      }
      
      // Process the stream
      let responseText = '';
      let conversationKey = currentConversationKey;
      let isFirst = true;
      let messageAdded = false; // Local flag to track if we've added the message
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode received chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Handle the first chunk which contains the conversation key
        if (isFirst) {
          try {
            // Extract the conversation key part
            const keyMatch = chunk.match(/{"conversation_key": "([^"]+)"}/);
            if (keyMatch && keyMatch[1]) {
              conversationKey = keyMatch[1];
              setActiveConversationKey(conversationKey);
              
              // If conversation key changed, refresh conversations list
              if (!activeConversationKey || activeConversationKey !== conversationKey) {
                fetchLastConversations();
              }
              
              // Remove the conversation key part from the response
              responseText = chunk.replace(/{"conversation_key": "[^"]+"}\n?/, '');
            } else {
              responseText = chunk;
            }
            isFirst = false;
          } catch (error) {
            console.error('Error processing first chunk:', error);
            responseText = chunk;
            isFirst = false;
          }
        } else {
          // Append subsequent chunks
          responseText += chunk;
        }
        
        // Only add message to state when we have content to show and we're still on the same conversation
        if (responseText.trim() && activeConversationKey === currentConversationKey) {
          if (!messageAdded) {
            // First time we're adding the AI message
            setMessages(prev => [
              ...prev, 
              {
                id: newStreamMessageId,
                type: "ai",
                content: responseText.trim(),
                timestamp: new Date(),
              }
            ]);
            messageAdded = true;
            setHasAddedStreamMessage(true);
          } else {
            // Update existing message with new content
            setMessages(prev => prev.map(m => 
              m.id === newStreamMessageId ? { ...m, content: responseText.trim() } : m
            ));
          }
        }
        
        // Scroll to bottom as message grows
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      
      // At the end, refresh conversation list again to ensure order is correct
      fetchLastConversations();
      
    } catch (error) {
      console.error('Error streaming response:', error);
      // Show error message only if we're still on the same conversation
      if (activeConversationKey === currentConversationKey) {
        setMessages(prev => [
          ...prev, 
          {
            id: generateId(),
            type: "ai",
            content: "I'm sorry, I encountered an error processing your request. Please try again.",
            timestamp: new Date(),
          }
        ]);
      }
    } finally {
      setIsStreaming(false);
      setHasAddedStreamMessage(false);
      
      // Final scroll to bottom if we're still on the same conversation
      if (activeConversationKey === currentConversationKey) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      
      // Refresh the conversations list to get the latest updates
      fetchLastConversations();
    }
  };

  // Auto-refresh conversations periodically, with debouncing
  useEffect(() => {
    if (isAuthenticated && walletAddress && walletSignature) {
      // Refresh less frequently (60 seconds) to reduce flicker
      const intervalId = setInterval(() => {
        if (!isStreaming && !isLoadingMessages) {
          fetchLastConversations();
        }
      }, 60000); // 60 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, walletAddress, walletSignature, isStreaming, isLoadingMessages, fetchLastConversations]);

  // Add function to refresh conversations after any operation that might change them
  const refreshConversationsAfterAction = useCallback(() => {
    // Only refresh if not currently loading
    if (!isLoadingConversations) {
      // Add slight delay to ensure server has processed any changes
      setTimeout(() => {
        fetchLastConversations();
      }, 500);
    }
  }, [isLoadingConversations, fetchLastConversations]);

  // Handle sending a new message
  const handleSendMessage = () => {
    if (message.trim() === "" || isStreaming) return;
    streamChatResponse(message);
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message content to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Handle logout with confirmation
  const initiateLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // Remove auth tokens
    localStorage.removeItem("walletSignature");
    localStorage.removeItem("walletPublicKey");
    
    // Clear settings for a complete logout
    localStorage.removeItem('lumokit_model');
    localStorage.removeItem('lumokit_temperature');
    localStorage.removeItem('lumokit_tools');
    
    router.push("/");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Close logout confirmation when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogoutConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [logoutRef]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load settings from localStorage on initial load - FIXED to ensure tools load correctly
  useEffect(() => {
    // Only load settings if user is authenticated
    if (isAuthenticated) {
      try {
        // Load model preference
        const savedModel = localStorage.getItem('lumokit_model');
        if (savedModel) {
          setSelectedModel(savedModel);
        }
        
        // Load temperature preference
        const savedTemp = localStorage.getItem('lumokit_temperature');
        if (savedTemp) {
          setTemperature(parseFloat(savedTemp));
        }
        
        // Load selected tools
        const savedTools = localStorage.getItem('lumokit_tools');
        console.log('Loading tools from localStorage:', savedTools);
        
        if (savedTools) {
          try {
            const parsedTools = JSON.parse(savedTools);
            console.log('Parsed tools:', parsedTools);
            setSelectedTools(parsedTools);
          } catch (e) {
            console.error('Error parsing saved tools:', e);
            // Fallback to default tools
            const defaultTools = toolsData
              .filter(tool => tool.default_status)
              .map(tool => tool.tool_identifier);
            setSelectedTools(defaultTools);
          }
        } else {
          // If no saved tools, initialize with default tools
          const defaultTools = toolsData
            .filter(tool => tool.default_status)
            .map(tool => tool.tool_identifier);
          console.log('No saved tools, using defaults:', defaultTools);
          setSelectedTools(defaultTools);
        }
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, [isAuthenticated]);
  
  // Define onToolsChange more explicitly to ensure proper state updates
  const handleToolsChange = (newTools: string[]) => {
    console.log('Tools changed in ChatPage:', newTools);
    setSelectedTools(newTools);
    
    // Also directly update localStorage
    localStorage.setItem('lumokit_tools', JSON.stringify(newTools));
  };
  
  // Modified to save ALL tools when changed, not just ensure they are saved
  useEffect(() => {
    if (isAuthenticated && selectedTools) {
      console.log('Saving tools to localStorage:', selectedTools);
      localStorage.setItem('lumokit_tools', JSON.stringify(selectedTools));
      localStorage.setItem('lumokit_model', selectedModel);
      localStorage.setItem('lumokit_temperature', temperature.toString());
    }
  }, [selectedModel, temperature, selectedTools, isAuthenticated]);

  // Show loading state or redirect if not authenticated
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#e9e4da]">
        <p className="text-[#3a3238]">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="h-screen bg-[#e9e4da] flex overflow-hidden">
      {/* Left Sidebar - update the onToolsChange to use the explicit handler */}
      <ChatSidebar 
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        isMobile={isMobile}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        walletCreated={walletCreated}
        initiateLogout={initiateLogout}
        logoutHovered={logoutHovered}
        setLogoutHovered={setLogoutHovered}
        logoutRef={logoutRef}
        showLogoutConfirm={showLogoutConfirm}
        confirmLogout={confirmLogout}
        cancelLogout={cancelLogout}
        conversations={conversations}
        isLoadingConversations={isLoadingConversations}
        activeConversationKey={activeConversationKey}
        onConversationSelect={handleConversationSelect}
        onNewChat={startNewChat}
        isProUser={isProUser}
        daysRemaining={daysRemaining}
        isProStatusLoading={isProStatusLoading}
        proStatusError={proStatusError}
        isStreaming={isStreaming}
        // New props for model, temperature, and tools
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        selectedTools={selectedTools}
        onToolsChange={handleToolsChange}
      />

      {/* Overlay for mobile when sidebar is expanded */}
      {isMobile && sidebarExpanded && (
        <div 
          className="absolute inset-0 bg-black/30 z-20"
          onClick={() => setSidebarExpanded(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#f5f0e6] rounded-3xl m-3 overflow-hidden">
        {/* Chat Content */}
        <div className="flex-1 overflow-auto relative custom-scrollbar">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[#f5f0e6] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiM5ZTQyNDQiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-30 fixed"></div>

          {/* Content Container */}
          <div className="relative z-10 max-w-4xl mx-auto px-6 py-6">
            {/* Chat Messages or Loading Skeleton */}
            {isLoadingMessages ? (
              <MessageSkeleton />
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    copiedId={copiedId} 
                    onCopy={copyToClipboard}
                  />
                ))}
                {isStreaming && !hasAddedStreamMessage && (
                  <ChatResponseLoader />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <ChatInput 
          message={message}
          setMessage={setMessage}
          handleSendMessage={handleSendMessage}
          handleKeyDown={handleKeyDown}
          disabled={isLoadingMessages}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
