import { useState, RefObject, useEffect } from "react";
import Image from "next/image";
import { Plus, Settings, Wallet, ChevronLeft, ChevronRight, Copy, CheckCheck, RefreshCw } from "lucide-react";
import ProStatusSkeleton from "@/components/chat/ProStatusSkeleton";
import ConversationSkeleton from "@/components/chat/ConversationSkeleton";
import ProUpgradeModal from "./ProUpgradeModal";
import AgentWalletModal from "./AgentWalletModal";
import ToolsAndSettingsModal from "./ToolsAndSettingsModal";
import { Conversation } from "@/types/chat";

interface ChatSidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  isMobile: boolean;
  walletAddress: string | null;
  walletBalance: string;
  walletCreated: boolean;
  initiateLogout: () => void;
  logoutHovered: boolean;
  setLogoutHovered: (hovered: boolean) => void;
  logoutRef: RefObject<HTMLDivElement | null>;
  showLogoutConfirm: boolean;
  confirmLogout: () => void;
  cancelLogout: () => void;
  conversations: Conversation[];
  isLoadingConversations: boolean;
  activeConversationKey: string | null;
  onConversationSelect: (conversationKey: string) => void;
  onNewChat: () => void;
  isProUser?: boolean;
  daysRemaining?: number | null;
  isProStatusLoading?: boolean;
  proStatusError?: string | null;
  isStreaming?: boolean;
  // Added props for model and tools settings
  selectedModel: string;
  onModelChange: (model: string) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
}

interface WalletPortfolioItem {
  address: string;
  name: string;
  symbol: string;
  balance: number;
  uiAmount: number;
  decimals: number;
  icon?: string;
  logoURI?: string;
  priceUsd: number;
  valueUsd: number;
  chainId: string;
}

interface WalletPortfolio {
  wallet: string;
  totalUsd: number;
  items: WalletPortfolioItem[];
}

const ChatSidebar = ({
  sidebarExpanded,
  setSidebarExpanded,
  isMobile,
  walletAddress,
  walletBalance,
  initiateLogout,
  logoutHovered,
  setLogoutHovered,
  logoutRef,
  showLogoutConfirm,
  confirmLogout,
  cancelLogout,
  conversations,
  isLoadingConversations,
  activeConversationKey,
  onConversationSelect,
  onNewChat,
  isProUser = false,
  daysRemaining = null,
  isProStatusLoading = false,
  proStatusError = null,
  isStreaming = false,
  // Added props with defaults
  selectedModel = "gpt-4.1-mini",
  onModelChange = () => {},
  temperature = 0.7,
  onTemperatureChange = () => {},
  selectedTools = [],
  onToolsChange = () => {},
}: ChatSidebarProps) => {
  // Add state for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Get subscription amount from env variable with fallback
  const PAYMENT_AMOUNT = process.env.NEXT_PUBLIC_PRO_SUBSCRIPTION_AMOUNT || "22000";
  
  // Add states for agent wallet
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [agentWalletPublicKey, setAgentWalletPublicKey] = useState<string | null>(null);
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<{publicKey: string, privateKey: string} | null>(null);
  const [copiedAgentWallet, setCopiedAgentWallet] = useState(false);
  
  // Add state for wallet portfolio data
  const [portfolioData, setPortfolioData] = useState<WalletPortfolio | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  
  // New state variable for tools and settings modal
  const [showToolsSettingsModal, setShowToolsSettingsModal] = useState(false);
  
  // Shorten wallet address for display
  const shortenAddress = (address: string | null) => {
    if (!address) return "";
    return `${address.slice(0, 3)}...${address.slice(-3)}`;
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };
  
  // Load agent wallet from local storage
  useEffect(() => {
    const storedPublicKey = localStorage.getItem('agent_public');
    if (storedPublicKey) {
      setAgentWalletPublicKey(storedPublicKey);
    }
  }, []);
  
  // Handle wallet creation
  const createAgentWallet = async () => {
    setIsGeneratingWallet(true);
    setWalletError(null);
    setWalletInfo(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/generate-wallet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate wallet');
      }
      
      const data = await response.json();
      
      // Set wallet info for display
      setWalletInfo({
        publicKey: data.public_key,
        privateKey: data.private_key
      });
      
      // Store in local storage
      localStorage.setItem('agent_public', data.public_key);
      localStorage.setItem('agent_private', data.encrypted_private_key);
      
      // Update state to reflect wallet creation
      setAgentWalletPublicKey(data.public_key);
      
    } catch (error) {
      console.error('Error generating wallet:', error);
      setWalletError(error instanceof Error ? error.message : 'Failed to generate wallet');
    } finally {
      setIsGeneratingWallet(false);
    }
  };
  
  // Copy agent wallet address
  const copyAgentWallet = () => {
    if (agentWalletPublicKey) {
      navigator.clipboard.writeText(agentWalletPublicKey);
      setCopiedAgentWallet(true);
      setTimeout(() => setCopiedAgentWallet(false), 2000);
    }
  };
  
  // View wallet details
  const handleViewWallet = () => {
    setShowWalletModal(true);
  };

  // Fetch wallet portfolio data - removed interval, keeping the initial fetch
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!agentWalletPublicKey) return;
      
      setIsLoadingPortfolio(true);
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/wal-portfolio/${agentWalletPublicKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch portfolio data: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setPortfolioData(data.data);
          setPortfolioError(null);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        setPortfolioError('Failed to fetch wallet data');
      } finally {
        setIsLoadingPortfolio(false);
      }
    };
    
    // Fetch immediately if we have a wallet key - keep only this, remove the interval
    if (agentWalletPublicKey) {
      fetchPortfolioData();
    }
    
  }, [agentWalletPublicKey]);
  
  // Add function to refresh by reloading the page
  const refreshWalletData = () => {
    window.location.reload();
  };
  
  // Format USD value to 2 decimal places
  const formatUsd = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <>
      <div
        className={`${
          sidebarExpanded ? "w-[320px]" : "w-[50px]"
        } bg-[#e9e4da] flex flex-col transition-all duration-300 relative ${
          isMobile && sidebarExpanded ? "absolute inset-y-0 left-0 z-30 shadow-xl" : ""
        }`}
      >
        {/* Toggle Button - Always Visible */}
        <div
          className={`absolute ${sidebarExpanded ? "right-4 top-4" : "left-1/2 top-4 -translate-x-1/2"} z-10 bg-[#f5f0e6] w-8 h-8 rounded flex items-center justify-center cursor-pointer hover:bg-white transition-colors`}
          onClick={toggleSidebar}
        >
          {sidebarExpanded ? (
            <ChevronLeft size={18} className="text-[#9e4244]" />
          ) : (
            <ChevronRight size={18} className="text-[#9e4244]" />
          )}
        </div>

        {sidebarExpanded && (
          <>
            {/* Logo */}
            <div className="flex items-center gap-3 p-4 px-5 border-b border-[#d1c7b9]">
              <div className="relative w-[160px] h-[36px]">
                <Image
                  src="/logo.png"
                  alt="LumoKit Logo"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-auto py-4 custom-scrollbar">
              {/* New Chat Button */}
              <div className="px-4 mb-5">
                <button 
                  className={`flex items-center gap-2 w-full p-3 rounded-md text-[#3a3238] transition-colors ${
                    isStreaming ? 
                    'bg-[#f5f0e6]/50 opacity-60 cursor-not-allowed' : 
                    'bg-[#f5f0e6] hover:bg-white'
                  }`}
                  onClick={onNewChat}
                  disabled={isStreaming}
                >
                  <Plus size={18} className="text-[#9e4244]" />
                  <span className="font-medium">New Chat</span>
                </button>
              </div>

              {/* Previous Conversations */}
              <div className="px-4 mb-6">
                <h3 className="text-[#3a3238] font-medium text-sm mb-2 px-1 flex justify-between items-center">
                  <span>Recent Conversations</span>
                </h3>
                {/* Fixed height container to prevent layout shifts */}
                <div className="bg-[#f5f0e6] rounded-lg p-2 border border-[#d1c7b9]/50 min-h-[100px]">
                  {isLoadingConversations && conversations.length === 0 ? (
                    // Only show skeleton loaders when initially loading with no data
                    Array(3).fill(0).map((_, index) => (
                      <ConversationSkeleton key={`skeleton-${index}`} />
                    ))
                  ) : conversations.length > 0 ? (
                    <div className="space-y-1">
                      {conversations.map((conv) => (
                        <button
                          key={conv.conversation_key}
                          className={`flex flex-col w-full p-2 rounded-md text-left transition-colors mb-1 last:mb-0 ${
                            activeConversationKey === conv.conversation_key 
                              ? 'bg-white' 
                              : isStreaming ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/50'
                          }`}
                          onClick={() => onConversationSelect(conv.conversation_key)}
                          disabled={isStreaming}
                        >
                          <p className="text-[#3a3238] text-sm truncate">{conv.last_message_preview}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Show empty state when no conversations
                    <div className="text-center py-4 text-sm text-[#3a3238]/60">
                      No recent conversations
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-[#d1c7b9] mt-auto">
              {/* Pro Plan */}
              {isProStatusLoading ? (
                <ProStatusSkeleton />
              ) : (
                <div className="p-3 mb-3 bg-gradient-to-r from-[#9e4244] to-[#d88c6a] rounded-lg text-white shadow-sm overflow-hidden relative">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-8"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/5 rounded-full translate-y-8 -translate-x-8"></div>
                  
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center shadow-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-sm">Subscription</span>
                        <span className="text-xs block text-white/90">{PAYMENT_AMOUNT} $LUMO/month</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Plan Indicator - Modified to show days remaining inline */}
                  <div className="bg-white/10 rounded-md p-2 mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                      <span className="text-xs font-medium">Current Plan:</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`text-xs font-bold ${isProUser ? 'bg-green-500/30' : 'bg-white/20'} px-2 py-0.5 rounded`}>
                        {isProUser ? 'Pro' : 'Free'}
                      </span>
                      
                      {/* Days remaining tooltip for Pro users */}
                      {isProUser && daysRemaining !== null && (
                        <div className="relative ml-1.5 group">
                          <div className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                            <span>{daysRemaining}d</span>
                          </div>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {daysRemaining} days remaining
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Error Message */}
                  {proStatusError && (
                    <div className="bg-red-500/20 rounded-md p-2 mb-2.5 text-xs">
                      {proStatusError}
                    </div>
                  )}
                  
                  {/* Upgrade/Renew Button - Modified to open modal */}
                  <button 
                    className="w-full bg-white hover:bg-[#f5f0e6] text-[#9e4244] font-medium text-sm py-1.5 rounded-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <span>{isProUser ? 'Renew Pro' : 'Upgrade to Pro'}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Agent Wallet - Updated with refresh button */}
              <div className="p-4 mb-4 bg-[#f5f0e6] rounded-lg border border-[#d1c7b9]/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#5c7c7d]/30 to-[#5c7c7d]/10"></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#5c7c7d] rounded-md flex items-center justify-center shadow-md">
                    <Wallet size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#3a3238] font-bold block">Agent Wallet</span>
                      {agentWalletPublicKey && (
                        <div className="flex items-center gap-1 ml-1">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded bg-[#5c7c7d]/20 text-[#5c7c7d]"
                          >
                            {shortenAddress(agentWalletPublicKey)}
                          </span>
                          <button 
                            onClick={copyAgentWallet}
                            className="p-1 rounded hover:bg-white transition-colors" 
                            title="Copy address"
                          >
                            {copiedAgentWallet ? (
                              <CheckCheck size={12} className="text-green-600" />
                            ) : (
                              <Copy size={12} className="text-[#5c7c7d]" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    {!agentWalletPublicKey && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#9e4244]/20 text-[#9e4244]">
                          Not Created
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/50 p-2 rounded-md">
                  <span className="text-[#3a3238] text-sm">Total Value:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#3a3238] font-bold">
                      {isLoadingPortfolio && !portfolioData ? (
                        <span className="inline-block w-12 h-4 bg-[#e9e4da] animate-pulse rounded"></span>
                      ) : portfolioData ? (
                        `$${formatUsd(portfolioData.totalUsd)}`
                      ) : (
                        `$${walletBalance}`
                      )}
                    </span>
                    {/* Add refresh button */}
                    {agentWalletPublicKey && (
                      <button 
                        onClick={refreshWalletData}
                        className="p-1 rounded-full hover:bg-white transition-colors flex-shrink-0" 
                        title="Refresh wallet data"
                      >
                        <RefreshCw size={14} className="text-[#5c7c7d]" />
                      </button>
                    )}
                  </div>
                </div>
                
                {agentWalletPublicKey ? (
                  <button 
                    className="w-full mt-3 py-2 bg-[#5c7c7d]/20 text-[#5c7c7d] text-sm font-medium rounded-md hover:bg-[#5c7c7d]/30 transition-colors"
                    onClick={handleViewWallet}
                  >
                    View Wallet
                  </button>
                ) : (
                  <button 
                    className="w-full mt-3 py-2 bg-[#5c7c7d] text-white text-sm font-medium rounded-md hover:bg-[#4a6a6b] transition-colors"
                    onClick={() => setShowWalletModal(true)}
                  >
                    Create Wallet
                  </button>
                )}
              </div>

              {/* Tools and Settings - Updated to use the modal */}
              <div className="bg-gradient-to-r from-[#f5f0e6] to-[#e9e4da] rounded-lg p-1 mb-4 border border-[#d1c7b9]/50 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9e4244]/20 to-[#d88c6a]/20"></div>
                <button 
                  className="flex items-center gap-2 w-full p-3 rounded-md text-[#3a3238] hover:bg-white/70 transition-all group"
                  onClick={() => setShowToolsSettingsModal(true)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#9e4244] to-[#d88c6a] rounded-md flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Settings size={16} className="text-white" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tools and Settings</span>
                    <span className="text-xs text-[#3a3238]/70">Customize your experience</span>
                  </div>
                </button>
              </div>
              
              {/* Logout Section */}
              <div className="relative" ref={ref => {
                // Only assign if logoutRef.current can accept the value
                if (logoutRef && typeof logoutRef === 'object' && 'current' in logoutRef) {
                  logoutRef.current = ref;
                }
              }}>
                <div 
                  className={`flex items-center justify-between p-2.5 px-3 rounded-lg transition-all duration-300 logout-btn-cool cursor-pointer bg-[#f0eadd] hover:bg-gradient-to-r hover:from-[#f0eadd] hover:to-[#f7f2e7] border border-transparent hover:border-[#d1c7b9] logout-pulse ${
                    logoutHovered ? 'shadow-md' : ''
                  }`}
                  onMouseEnter={() => setLogoutHovered(true)}
                  onMouseLeave={() => setLogoutHovered(false)}
                  onClick={initiateLogout}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      logoutHovered ? 'bg-gradient-to-br from-[#9e4244] to-[#d88c6a]' : 'bg-[#e9e4da]'
                    }`}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={logoutHovered ? "white" : "#3a3238"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="logout-icon-slide"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                      </svg>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`font-medium transition-all duration-300 logout-text ${
                        logoutHovered ? 'text-[#9e4244]' : 'text-[#3a3238]'
                      }`}>Log out</span>
                      
                      {walletAddress && (
                        <>
                          <span className="text-[#3a3238]/30 mx-1">•</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                            logoutHovered 
                              ? 'bg-[#9e4244]/10 text-[#9e4244]' 
                              : 'bg-[#e9e4da] text-[#3a3238]/70'
                          }`}>
                            {shortenAddress(walletAddress)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center transition-all duration-300 ${
                    logoutHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'
                  }`}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke={logoutHovered ? "#9e4244" : "#3a3238"} 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </div>
                
                {/* Logout Confirmation */}
                {showLogoutConfirm && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-xl border border-[#d1c7b9] p-3 logout-confirm z-50">
                    <p className="text-[#3a3238] font-medium text-sm mb-3">Are you sure you want to log out?</p>
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-[#9e4244] to-[#d88c6a] text-white text-sm rounded-lg font-medium hover:opacity-90 active:scale-95 transition-all"
                        onClick={confirmLogout}
                      >
                        Yes, logout
                      </button>
                      <button 
                        className="py-2 px-3 border border-[#d1c7b9] text-[#3a3238] text-sm rounded-lg font-medium hover:bg-[#f5f0e6] active:scale-95 transition-all"
                        onClick={cancelLogout}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* When collapsed, only show the logo */}
        {!sidebarExpanded && (
          <div className="flex flex-col items-center pt-16">
            <div className="relative w-8 h-8">
              <Image
                src="/lumo-icon.png" 
                alt="LumoKit Icon"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Pro Upgrade Modal */}
      <ProUpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
      
      {/* Agent Wallet Modal - Updated with portfolio data */}
      <AgentWalletModal
        isOpen={showWalletModal}
        onClose={() => {
          setShowWalletModal(false);
          setWalletInfo(null);
          setWalletError(null);
        }}
        onCreateWallet={createAgentWallet}
        walletInfo={walletInfo}
        isGenerating={isGeneratingWallet}
        error={walletError}
        portfolioData={portfolioData}
        isLoadingPortfolio={isLoadingPortfolio}
        portfolioError={portfolioError}
        publicKey={agentWalletPublicKey}
      />
      
      {/* Tools and Settings Modal - New */}
      <ToolsAndSettingsModal
        isOpen={showToolsSettingsModal}
        onClose={() => setShowToolsSettingsModal(false)}
        isProUser={isProUser}
        selectedTools={selectedTools}
        onToolsChange={onToolsChange}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        temperature={temperature}
        onTemperatureChange={onTemperatureChange}
      />
    </>
  );
};

export default ChatSidebar;
