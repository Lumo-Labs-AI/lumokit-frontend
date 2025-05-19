import React, { useRef, useEffect, useState } from 'react';
import { X, Check, ArrowRight, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { 
  createTransferCheckedInstruction, 
  getAssociatedTokenAddress, 
  getMint, 
  createAssociatedTokenAccountInstruction, 
  getAccount,
  TokenAccountNotFoundError 
} from '@solana/spl-token';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { publicKey, signTransaction, connected } = useWallet();
  
  // Transaction states
  const [isProcessing, setIsProcessing] = useState(false);
  const [txnSuccess, setTxnSuccess] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [txnHash, setTxnHash] = useState<string | null>(null);
  const [hasNoTokens, setHasNoTokens] = useState(false);
  
  // Environment variables with fallbacks to ensure they're always strings
  const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_LUMO_TOKEN_ADDRESS || "4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump";
  const PAYMENT_AMOUNT = process.env.NEXT_PUBLIC_PRO_SUBSCRIPTION_AMOUNT || "22000";
  const RECEIVER_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS || "CsTmcGZ5UMRzM2DmWLjayc2sTK2zumwfS4E8yyCFtK51";
  const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  
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
  
  // Reset transaction states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setTxnSuccess(false);
      setTxnError(null);
      setTxnHash(null);
      setHasNoTokens(false);
    }
  }, [isOpen]);
  
  const handleProUpgrade = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setTxnError("Wallet not connected. Please connect your wallet first.");
      return;
    }
    
    setIsProcessing(true);
    setTxnError(null);
    
    try {
      // Connect to Solana network using the custom RPC URL instead of clusterApiUrl
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      
      // Create token public keys
      const tokenMint = new PublicKey(TOKEN_ADDRESS);
      const receiverWallet = new PublicKey(RECEIVER_ADDRESS);
      
      try {
        // Get associated token accounts
        const senderTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          publicKey
        );
        
        const receiverTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          receiverWallet
        );
        
        // Get token mint info to determine decimals
        const mintInfo = await getMint(connection, tokenMint);
        const decimals = mintInfo.decimals;
        const amount = BigInt(Math.floor(parseFloat(PAYMENT_AMOUNT) * 10 ** decimals));
        
        // Check if sender token account exists and has sufficient balance
        let hasToken = false;
        let tokenBalance = BigInt(0);
        
        try {
          const senderTokenAccountInfo = await getAccount(connection, senderTokenAccount);
          hasToken = true;
          tokenBalance = BigInt(senderTokenAccountInfo.amount);
        } catch (error) {
          if (error instanceof TokenAccountNotFoundError) {
            hasToken = false;
          } else {
            throw error;
          }
        }
        
        // Handle token account not found or insufficient balance
        if (!hasToken) {
          setHasNoTokens(true);
          throw new Error(`You do not have any $LUMO tokens in your wallet. Please acquire some tokens before upgrading.`);
        }
        
        if (tokenBalance < amount) {
          // Convert BigInt to readable format with decimals
          const formattedBalance = Number(tokenBalance) / (10 ** decimals);
          const formattedAmount = Number(amount) / (10 ** decimals);
          
          setHasNoTokens(true);
          throw new Error(`Insufficient balance. You have ${formattedBalance.toLocaleString()} $LUMO but need ${formattedAmount.toLocaleString()} $LUMO tokens.`);
        }

        // Create transaction and add instructions
        const transaction = new Transaction();

        // Create receiver ATA if needed
        const receiverInfo = await connection.getAccountInfo(receiverTokenAccount);
        if (!receiverInfo) {
          const createATAIx = createAssociatedTokenAccountInstruction(
            publicKey,
            receiverTokenAccount,
            receiverWallet,
            tokenMint
          );
          transaction.add(createATAIx);
        }

        // Use createTransferCheckedInstruction for proper token decimals checks
        const transferInstruction = createTransferCheckedInstruction(
          senderTokenAccount,
          tokenMint,
          receiverTokenAccount,
          publicKey,
          amount,
          decimals
        );
        transaction.add(transferInstruction);
        
        // Get recent blockhash with error handling
        let blockhashResponse;
        try {
          blockhashResponse = await connection.getLatestBlockhash('finalized');
          console.log("Blockhash retrieved successfully");
        } catch (bhError) {
          console.error("Blockhash error:", bhError);
        }
        
        if (!blockhashResponse) {
          throw new Error("Could not fetch latest blockhash.");
        }

        transaction.recentBlockhash = blockhashResponse.blockhash;
        transaction.feePayer = publicKey;
        
        // Sign transaction
        const signedTransaction = await signTransaction(transaction);
        
        // Send transaction
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        console.log("Transaction sent, signature:", signature);
        
        // Confirm transaction
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash: blockhashResponse.blockhash,
          lastValidBlockHeight: blockhashResponse.lastValidBlockHeight
        }, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        // Store transaction hash
        setTxnHash(signature);
        setTxnSuccess(true);
        
        // Call backend to update subscription status
        await updateSubscriptionStatus(publicKey.toString(), signature);
        
      } catch (error) {
        console.error('Transaction processing error:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Transaction error:', error);
      setTxnError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Call backend to update subscription status
  const updateSubscriptionStatus = async (walletAddress: string, signature: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/upgrade-pro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_key: walletAddress,
          transaction_signature: signature,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription status');
      }
      
    } catch (error) {
      console.error('Error updating subscription:', error);
      // We don't set transaction error here because payment was successful
      // The subscription might be updated on the next login
    }
  };
  
  // New function to redirect to DEX
  const redirectToDEX = () => {
    window.open(`https://jup.ag/swap/SOL-LUMO`, '_blank');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-[#f5f0e6] to-[#e9e4da] rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-scaleIn flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header - Fixed height and non-scrollable */}
        <div className="relative overflow-hidden z-10 flex-shrink-0">
          {/* Background gradient header */}
          <div className="bg-gradient-to-r from-[#9e4244] to-[#d88c6a] pt-16 pb-10 px-6 relative">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/4"></div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
            
            {/* Pro badge */}
            <div className="absolute top-4 left-4 bg-white/20 rounded-md px-2.5 py-1 text-sm font-bold text-white">
              PRO PLAN
            </div>
            
            {/* Header content */}
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-bold">Upgrade to Pro</h3>
              <p className="text-white/80 text-sm mt-1">Enhance your LumoKit experience with premium features</p>
            </div>
          </div>
          
          {/* Pro tier pricing */}
          <div className="absolute top-32 right-6 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#9e4244] rounded-full"></div>
              <span className="text-[#9e4244] font-bold">{PAYMENT_AMOUNT} $LUMO</span>
              <span className="text-[#3a3238]/70 text-xs">/month</span>
            </div>
          </div>
        </div>
        
        {/* Content area with flex-1 to take remaining space */}
        <div className="overflow-y-auto overscroll-contain flex-1">
          <div className="px-6 py-6">
            <h4 className="text-[#3a3238] font-medium text-sm mb-4">Pro features you&apos;ll unlock:</h4>
            
            {/* Features comparison */}
            <div className="space-y-4 mb-6">
              {/* Requests */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#9e4244] to-[#d88c6a] rounded-md flex items-center justify-center">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M7 22a5 5 0 0 1-2-4"></path>
                        <path d="M3.3 14A10 10 0 0 1 2 10c0-4 2-7 5-9"></path>
                        <path d="M13 22a5 5 0 0 0 2-4"></path>
                        <path d="M20.7 14a10 10 0 0 0 1.3-4c0-4-2-7-5-9"></path>
                        <path d="M12 2v10"></path>
                        <path d="M12 12v4"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Daily Requests</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f5f0e6] rounded-md p-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#3a3238]/70">Free</span>
                    <span className="text-sm font-bold">10/day</span>
                  </div>
                  <div className="bg-[#9e4244]/10 rounded-md p-2 flex items-center justify-between border border-[#9e4244]/20">
                    <span className="text-xs font-medium text-[#9e4244]">Pro</span>
                    <span className="text-sm font-bold text-[#9e4244]">200/day</span>
                  </div>
                </div>
              </div>
              
              {/* Models */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#9e4244] to-[#d88c6a] rounded-md flex items-center justify-center">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v8"></path>
                        <path d="M18.4 6.6a9 9 0 0 0-12.8 0"></path>
                        <path d="M15 22v-3.3"></path>
                        <path d="M18.6 17.8A9 9 0 0 0 15 8.8"></path>
                        <path d="M9 22v-3.3"></path>
                        <path d="M5.4 17.8A9 9 0 0 1 9 8.8"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Model Access</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f5f0e6] rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#3a3238]/70">Free</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium">Basic models</span>
                    </div>
                  </div>
                  <div className="bg-[#9e4244]/10 rounded-md p-2 border border-[#9e4244]/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#9e4244]">Pro</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium text-[#9e4244]">All models</span>
                      <span className="bg-[#9e4244] text-white text-xs px-1.5 py-0.5 rounded-sm">+Pro</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tools */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#9e4244] to-[#d88c6a] rounded-md flex items-center justify-center">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Tool Access</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f5f0e6] rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#3a3238]/70">Free</span>
                    </div>
                    <div className="text-sm font-medium">Limited to 3 tools</div>
                  </div>
                  <div className="bg-[#9e4244]/10 rounded-md p-2 border border-[#9e4244]/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#9e4244]">Pro</span>
                    </div>
                    <div className="text-sm font-medium text-[#9e4244]">Unlimited tools</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed at bottom with flex-shrink-0 */}
        <div className="p-6 border-t border-[#d1c7b9]/30 bg-[#e9e4da] flex-shrink-0">
          {/* Transaction success message */}
          {txnSuccess && (
            <div className="mb-4 bg-green-100 border border-green-300 text-green-800 rounded-lg p-3 animate-fadeIn flex items-start gap-2">
              <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                <Check size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Payment successful!</p>
                <p className="text-xs mt-1">Your payment has been received, pro subscription should be activated shortly.</p>
                {txnHash && (
                  <a 
                    href={`https://explorer.solana.com/tx/${txnHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 underline mt-1 inline-block"
                  >
                    View transaction
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* Transaction error message */}
          {txnError && (
            <div className="mb-4 bg-red-100 border border-red-300 text-red-800 rounded-lg p-3 animate-fadeIn">
              <div className="flex items-start gap-2 mb-2">
                <div className="bg-red-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                  <AlertTriangle size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">Transaction failed</p>
                  <p className="text-xs mt-1">{txnError}</p>
                </div>
              </div>
              
              {/* No tokens error - show special prompts */}
              {hasNoTokens && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs font-medium mb-2">You need $LUMO tokens to upgrade:</p>                  
                  <div className="mt-3 text-xs space-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-4 bg-red-200 rounded-full text-red-800 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>Purchase $LUMO tokens from Jupiter</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-4 bg-red-200 rounded-full text-red-800 flex items-center justify-center text-[10px] font-bold">2</span>
                      <span>Ensure you have at least {PAYMENT_AMOUNT} $LUMO in your wallet</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-4 bg-red-200 rounded-full text-red-800 flex items-center justify-center text-[10px] font-bold">3</span>
                      <span>Return here and try upgrading again</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Upgrade button */}
          <button 
            className={`w-full py-3 px-4 bg-gradient-to-r from-[#9e4244] to-[#d88c6a] hover:from-[#8a3a3c] hover:to-[#c67e5e] text-white font-bold rounded-lg shadow-md transition-all duration-300 flex items-center justify-center gap-2 group 
              ${isProcessing || txnSuccess ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
            onClick={hasNoTokens ? redirectToDEX : handleProUpgrade}
            disabled={isProcessing || txnSuccess}
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : txnSuccess ? (
              <>
                <Check size={16} />
                <span>Pro Subscription In Process</span>
              </>
            ) : hasNoTokens ? (
              <>
                <span>Buy $LUMO Tokens</span>
                <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              <>
                <span>Upgrade for {PAYMENT_AMOUNT} $LUMO</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
          {/* Terms note */}
          <p className="mt-4 text-center text-[#3a3238]/70 text-xs">
            Make sure you only pay <a href="#" className="text-[#9e4244] underline">with the wallet you registered.</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProUpgradeModal;
