import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Copy, Eye, EyeOff, AlertTriangle, CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

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

interface AgentWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWallet: () => Promise<void>;
  walletInfo: {
    publicKey: string;
    privateKey: string;
  } | null;
  isGenerating: boolean;
  error: string | null;
  portfolioData: WalletPortfolio | null;
  isLoadingPortfolio: boolean;
  portfolioError: string | null;
  publicKey: string | null;
}

const AgentWalletModal: React.FC<AgentWalletModalProps> = ({
  isOpen,
  onClose,
  onCreateWallet,
  walletInfo,
  isGenerating,
  error,
  portfolioData,
  isLoadingPortfolio,
  portfolioError,
  publicKey
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFinalResetConfirm, setShowFinalResetConfirm] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Close modal with escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Reset all confirmation dialogs when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowResetConfirm(false);
      setShowFinalResetConfirm(false);
    }
  }, [isOpen]);

  // Copy functions
  const copyToClipboard = (text: string, type: 'public' | 'private' | 'address') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        if (type === 'public') {
          setCopiedPublic(true);
          setTimeout(() => setCopiedPublic(false), 2000);
        } else if (type === 'private') {
          setCopiedPrivate(true);
          setTimeout(() => setCopiedPrivate(false), 2000);
        } else {
          setCopiedAddress(true);
          setTimeout(() => setCopiedAddress(false), 2000);
        }
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  // Reset wallet function
  const resetWallet = () => {
    // Remove wallet data from local storage
    localStorage.removeItem('agent_public');
    localStorage.removeItem('agent_private');
    
    // Close the modal - this will trigger a re-render of the parent component
    onClose();
    
    // Reload the page to reflect changes
    window.location.reload();
  };
  
  // Add refresh function
  const refreshWalletData = () => {
    window.location.reload();
  };
  
  // Find SOL balance from portfolio data
  const solBalance = portfolioData?.items.find(item => item.symbol === 'SOL');
  
  // Filter tokens with value over 0.1 USD
  const significantTokens = portfolioData?.items.filter(item => 
    item.symbol !== 'SOL' && item.valueUsd >= 0.1
  ) || [];
  
  // Format number to 2-6 decimal places based on value
  const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-[#f5f0e6] to-[#e9e4da] rounded-xl shadow-2xl w-full max-w-lg transform transition-all animate-scaleIn flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header with decoration - Fixed height to prevent content cut-off */}
        <div className="relative overflow-hidden z-10 flex-shrink-0">
          {/* Background gradient header */}
          <div className="bg-gradient-to-r from-[#5c7c7d] to-[#5c7c7d]/70 pt-16 pb-10 px-6 relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/4"></div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
            
            {/* Header content */}
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-bold">Agent Wallet</h3>
              <p className="text-white/80 text-sm mt-1">
                {!publicKey ? 'Create a secure wallet for your AI agent' : 'Your agent wallet details and balances'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Content area with better height calculation */}
        <div className="overflow-y-auto overscroll-contain flex-1">
          {!publicKey ? (
            /* Wallet Creation Section */
            <div className="p-6">
              <div className="mb-6 space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-2 text-[#3a3238]">
                    <div className="bg-[#5c7c7d]/10 rounded-full p-1.5 mt-0.5">
                      <AlertTriangle size={16} className="text-[#5c7c7d]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Important Information</h4>
                      <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[#3a3238]/80">
                        <li className="flex items-start gap-1.5">
                          <div className="min-w-[6px] h-[6px] rounded-full bg-[#5c7c7d] mt-1.5"></div>
                          <span>Store the private key for your generated wallet securely.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <div className="min-w-[6px] h-[6px] rounded-full bg-[#5c7c7d] mt-1.5"></div>
                          <span>This wallet will be used by the toolkit framework for any transactions based on AI agent tool calls.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <div className="min-w-[6px] h-[6px] rounded-full bg-[#5c7c7d] mt-1.5"></div>
                          <span>We do not store this information in our databases and have no access to your agent wallet.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <div className="min-w-[6px] h-[6px] rounded-full bg-[#5c7c7d] mt-1.5"></div>
                          <span>Your wallet information is stored encrypted in your browser. Even if you log out and log in with another wallet, your agent wallet remains available.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <div className="min-w-[6px] h-[6px] rounded-full bg-[#5c7c7d] mt-1.5"></div>
                          <span>If you clear your browser cache, the agent wallet may be lost and you might need to create it again.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                className={`w-full py-3 px-4 bg-[#5c7c7d] hover:bg-[#4a6a6b] text-white font-bold rounded-lg shadow-md transition-all duration-300 flex items-center justify-center gap-2 ${isGenerating ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                onClick={onCreateWallet}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Generating Wallet...</span>
                  </>
                ) : (
                  <span>Generate Wallet</span>
                )}
              </button>
              
              {error && (
                <div className="mt-4 bg-red-100 border border-red-300 text-red-800 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : walletInfo ? (
            /* Newly Created Wallet Display */
            <div className="p-6">
              
              {/* Reload notice - ADDED NEW SECTION */}
              <div className="mb-6 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg p-3 flex items-start gap-2 animate-pulse">
                <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Save the private key</p>
                  <p className="text-xs mt-1">Your agent wallet has been generated and encrypted on your device, please reload the page to activate your agent wallet for AI actions.</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    <span>Reload Now</span>
                  </button>
                </div>
              </div>
            
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="text-[#3a3238] font-medium text-sm mb-2">Public Key</h4>
                  <div className="flex items-center justify-between bg-[#5c7c7d]/10 p-3 rounded-md text-sm font-mono break-all">
                    <span className="text-[#3a3238] text-xs sm:text-sm">{walletInfo.publicKey}</span>
                    <button 
                      onClick={() => copyToClipboard(walletInfo.publicKey, 'public')}
                      className="ml-2 p-1.5 rounded-md bg-white hover:bg-[#5c7c7d]/5 transition-colors flex-shrink-0"
                    >
                      {copiedPublic ? 
                        <CheckCircle2 size={16} className="text-green-600" /> : 
                        <Copy size={16} className="text-[#5c7c7d]" />
                      }
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[#3a3238] font-medium text-sm">Private Key</h4>
                    <button 
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="p-1.5 rounded-md hover:bg-[#5c7c7d]/10 transition-colors"
                    >
                      {showPrivateKey ? 
                        <EyeOff size={16} className="text-[#5c7c7d]" /> : 
                        <Eye size={16} className="text-[#5c7c7d]" />
                      }
                    </button>
                  </div>
                  <div className="relative">
                    <div className={`flex items-center justify-between bg-[#5c7c7d]/10 p-3 rounded-md text-sm font-mono break-all ${!showPrivateKey && 'select-none'}`}>
                      {showPrivateKey ? (
                        <span className="text-[#3a3238] text-xs sm:text-sm">{walletInfo.privateKey}</span>
                      ) : (
                        <span className="text-[#3a3238]">••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
                      )}
                      <button 
                        onClick={() => copyToClipboard(walletInfo.privateKey, 'private')}
                        className="ml-2 p-1.5 rounded-md bg-white hover:bg-[#5c7c7d]/5 transition-colors flex-shrink-0"
                      >
                        {copiedPrivate ? 
                          <CheckCircle2 size={16} className="text-green-600" /> : 
                          <Copy size={16} className="text-[#5c7c7d]" />
                        }
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-medium text-[#5c7c7d] flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>Copy your private key and keep it in a safe place</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Existing Wallet Portfolio View */
            <div className="p-6 space-y-6">
              {/* Portfolio Data */}
              {isLoadingPortfolio && !portfolioData ? (
                <div className="bg-white rounded-lg p-6 shadow-sm flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <Loader2 size={24} className="animate-spin text-[#5c7c7d]" />
                    <span className="text-sm text-[#3a3238] mt-2">Loading wallet data...</span>
                  </div>
                </div>
              ) : portfolioError ? (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-2 text-red-600">
                    <AlertTriangle size={18} />
                    <div>
                      <h4 className="font-medium text-sm">{portfolioError}</h4>
                      <p className="text-xs mt-1 text-red-500">Please try again later or contact support if the issue persists.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* SOL Balance - Add refresh button */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[#3a3238] font-medium text-sm">Solana Balance</h4>
                      {/* Add refresh button */}
                      <button 
                        onClick={refreshWalletData}
                        className="p-1.5 rounded-full hover:bg-[#5c7c7d]/10 transition-colors flex items-center gap-1 text-xs text-[#5c7c7d]"
                        title="Refresh wallet data"
                      >
                        <RefreshCw size={14} className="text-[#5c7c7d]" />
                        <span>Refresh</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between bg-[#5c7c7d]/5 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full overflow-hidden w-10 h-10 bg-white flex-shrink-0 p-1">
                          <div className="relative w-full h-full">
                            {/* Replace img with Image component */}
                            <Image 
                              src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" 
                              alt="SOL"
                              className="object-contain"
                              width={32}
                              height={32}
                              onError={(e) => {
                                // Fallback for broken image
                                const imgElement = e.target as HTMLImageElement;
                                imgElement.src = '/lumo-icon.png';
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-[#3a3238]">SOL</span>
                          <div className="flex items-center text-sm text-[#3a3238]/70">
                            <span>{solBalance ? formatNumber(solBalance.uiAmount) : '0'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#3a3238]">
                          ${solBalance ? formatNumber(solBalance?.valueUsd || 0) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* SPL Tokens with value > 0.1 USD */}
                  {significantTokens.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[#3a3238] font-medium text-sm">Token Balances</h4>
                      </div>
                      
                      <div className="space-y-2">
                        {significantTokens.map((token) => (
                          <div 
                            key={token.address}
                            className="flex items-center justify-between bg-[#5c7c7d]/5 p-3 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="rounded-full overflow-hidden w-10 h-10 bg-white flex-shrink-0 p-1">
                                <div className="relative w-full h-full">
                                  {/* Replace img with Image component */}
                                  <Image 
                                    src={token.logoURI || token.icon || `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${token.address}/logo.png`}
                                    alt={token.symbol}
                                    className="object-contain"
                                    width={32}
                                    height={32}
                                    onError={(e) => {
                                      // Fallback for broken images
                                      const imgElement = e.target as HTMLImageElement;
                                      imgElement.src = '/lumo-icon.png';
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-[#3a3238]">{token.symbol}</span>
                                <div className="flex flex-col sm:flex-row sm:items-center text-sm text-[#3a3238]/70">
                                  <span>{formatNumber(token.uiAmount)}</span>
                                  <span className="hidden sm:inline mx-1">•</span>
                                  <span className="text-xs">{token.name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#3a3238]">${formatNumber(token.valueUsd)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state when no tokens are available */}
                  {!solBalance && significantTokens.length === 0 && (
                    <div className="bg-white rounded-lg p-6 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-[#5c7c7d]/10 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle size={24} className="text-[#5c7c7d]" />
                      </div>
                      <h4 className="font-medium text-[#3a3238] mb-1">No funds available</h4>
                      <p className="text-sm text-[#3a3238]/70">Your agent wallet doesn&apos;t have any funds yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Footer for existing wallet view */}
        {publicKey && !walletInfo && (
          <div className="p-4 border-t border-[#d1c7b9]/30 bg-[#e9e4da] mt-auto flex-shrink-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              {/* Reset Wallet in footer */}
              <div className="relative inline-flex">
                <button 
                  onClick={() => !showResetConfirm && setShowResetConfirm(true)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                    showResetConfirm 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw size={12} className={showResetConfirm ? "animate-spin text-white" : ""} />
                  <span>Reset Wallet</span>
                </button>
                
                {/* Confirmation dropdown positioned above the button */}
                {showResetConfirm && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-xl border border-red-200 p-3 w-[250px] sm:w-64 z-50 animate-fadeIn">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-600">This action cannot be undone!</p>
                        <p className="text-xs text-gray-600 mt-1">Your funds will be inaccessible unless you&apos;ve backed up your private key.</p>
                      </div>
                    </div>
                    
                    {!showFinalResetConfirm ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowFinalResetConfirm(true)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
                        >
                          Continue
                        </button>
                        <button 
                          onClick={() => setShowResetConfirm(false)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-red-50 p-2 rounded border border-red-200 text-xs text-red-700 font-medium text-center">
                          Are you absolutely sure?
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={resetWallet}
                            className="flex-1 bg-red-700 hover:bg-red-800 text-white text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
                          >
                            <AlertCircle size={10} />
                            <span>Yes, Reset Wallet</span>
                          </button>
                          <button 
                            onClick={() => {
                              setShowFinalResetConfirm(false);
                              setShowResetConfirm(false);
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Wallet address display with copy button */}
              <div className="flex items-center bg-white/30 rounded-md py-1 px-2">
                <span className="text-xs text-gray-600 mr-1">Address:</span>
                <span className="text-xs font-mono text-[#5c7c7d] font-medium truncate max-w-[100px]">
                  {publicKey ? (publicKey.slice(0, 4) + '...' + publicKey.slice(-4)) : ''}
                </span>
                <button
                  onClick={() => publicKey && copyToClipboard(publicKey, 'address')}
                  className="ml-1 p-1 rounded-full hover:bg-white/50 transition-colors"
                  title="Copy full address"
                >
                  {copiedAddress ? 
                    <CheckCircle2 size={12} className="text-green-600" /> : 
                    <Copy size={12} className="text-[#5c7c7d]" />
                  }
                </button>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-[#5c7c7d] hover:bg-[#4a6a6b] text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
        
        {/* Simple Close Button for New Wallet View only */}
        {walletInfo && (
          <div className="p-4 border-t border-[#d1c7b9]/30 bg-[#e9e4da] mt-auto flex-shrink-0">
            <button 
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-[#5c7c7d] hover:bg-[#4a6a6b] text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentWalletModal;
