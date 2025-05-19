"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import toolsData from "@/data/tools.json"
import { ReactNode, isValidElement } from "react"

type Tool = {
  icon_url: string
  default_status: boolean
  tool_identifier: string
  name: string
  category: string
  description: string
  read_more: string
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const cursorTrailsRef = useRef<HTMLDivElement[]>([])
  const router = useRouter()
  
  // Tool integrations state
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)

  // Wallet connection related states
  const { publicKey, disconnect, signMessage, connected, connecting } = useWallet()
  const { setVisible } = useWalletModal()
  const [signature, setSignature] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigning, setIsSigning] = useState(false)

  // Handle signature request - using useCallback to avoid dependency cycle
  const handleSignMessage = useCallback(async () => {
    if (!publicKey || !signMessage || isLoading) return
    
    try {
      const message = new TextEncoder().encode(
        `Sign this message for authenticating with LumoKit: ${publicKey.toString()}`
      )
      
      const sig = await signMessage(message)
      const signatureString = Buffer.from(sig).toString("base64")
      
      localStorage.setItem("walletSignature", signatureString)
      localStorage.setItem("walletPublicKey", publicKey.toString())
      setSignature(signatureString)

      // Optional: Send API request to register user
      fireUserRequest(publicKey.toString(), signatureString)
    } catch (error) {
      console.error("Error signing message:", error)
      localStorage.removeItem("walletSignature")
      localStorage.removeItem("walletPublicKey")
      disconnect()
      setSignature(null)
    } finally {
      setIsSigning(false) // Ensure isSigning is always reset when the process completes
    }
  }, [publicKey, signMessage, isLoading, disconnect]);

  // Load saved signature from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSignature = localStorage.getItem("walletSignature")
      if (storedSignature) {
        setSignature(storedSignature)
      }
      setIsLoading(false)
    }
  }, [])

  // Handle wallet connection and signature
  useEffect(() => {
    // Reset isSigning when wallet disconnects to prevent button getting stuck
    if (!connected && isSigning) {
      setIsSigning(false)
    }

    if (isLoading || connecting) return

    // Check if the connected wallet matches the stored wallet
    if (connected && publicKey) {
      const storedPublicKey = localStorage.getItem("walletPublicKey")
      const storedSignature = localStorage.getItem("walletSignature")
      
      // If we have a stored signature and the wallet key matches what we stored
      if (storedPublicKey === publicKey.toString() && storedSignature && !signature) {
        // Restore the signature from localStorage
        setSignature(storedSignature)
        setIsSigning(false)
      } else if (!signature && isSigning) {
        // New wallet connection or signature needed
        handleSignMessage()
      }
    } else if (!connected && !connecting && signature) {
      // Clear signature if wallet is fully disconnected
      setSignature(null)
      localStorage.removeItem("walletSignature")
      localStorage.removeItem("walletPublicKey")
    }
  }, [connected, publicKey, isLoading, connecting, signature, isSigning, handleSignMessage])

  // Helper function to fire API request
  const fireUserRequest = (publicKey: string, signature: string) => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKey, signature })
    });
  };

  // Get unique categories from tools data and count tools per category
  const categoriesWithCount = ["All", ...Array.from(new Set(toolsData.map((tool: Tool) => tool.category)))].sort().map(category => {
    const count = category === "All" 
      ? toolsData.length 
      : toolsData.filter(tool => tool.category === category).length;
    return { name: category, count };
  });

  // Filter tools based on search and category
  const filteredTools = toolsData.filter((tool: Tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.tool_identifier.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch && (activeCategory === "All" || tool.category === activeCategory)
  })

  // Handle category change with animation
  const handleCategoryChange = (category: string) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
  };

  // Handle scroll animation
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Handle mouse movement for cursor effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Create cursor trails
  useEffect(() => {
    const trailCount = 10
    const trails: HTMLDivElement[] = []

    for (let i = 0; i < trailCount; i++) {
      const trail = document.createElement("div")
      trail.className = "cursor-trail"
      document.body.appendChild(trail)
      trails.push(trail)
    }

    cursorTrailsRef.current = trails

    return () => {
      trails.forEach((trail) => {
        if (document.body.contains(trail)) {
          document.body.removeChild(trail)
        }
      })
    }
  }, [])

  // Animate cursor trails
  useEffect(() => {
    const trails = cursorTrailsRef.current
    if (trails.length === 0) return

    let positions: { x: number; y: number }[] = Array(trails.length).fill({ x: 0, y: 0 })

    const animateTrails = () => {
      positions = [mousePosition, ...positions.slice(0, -1)]

      trails.forEach((trail, index) => {
        const position = positions[index]
        if (position) {
          trail.style.left = `${position.x}px`
          trail.style.top = `${position.y}px`
          trail.style.opacity = `${1 - index / trails.length}`
          trail.style.width = `${8 - (index / trails.length) * 6}px`
          trail.style.height = `${8 - (index / trails.length) * 6}px`
        }
      })

      requestAnimationFrame(animateTrails)
    }

    const animationId = requestAnimationFrame(animateTrails)
    return () => cancelAnimationFrame(animationId)
  }, [mousePosition])

  // Create decorative elements
  useEffect(() => {
    const elements: ReactNode[] = []

    // Circles
    for (let i = 0; i < 5; i++) {
      const size = 100 + Math.random() * 200
      elements.push(
        <div
          key={`circle-${i}`}
          className="decorative-circle"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * 90}%`,
            top: `${100 + Math.random() * 1500}px`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />,
      )
    }

    // Squares
    for (let i = 0; i < 3; i++) {
      const size = 50 + Math.random() * 100
      elements.push(
        <div
          key={`square-${i}`}
          className="decorative-square"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * 90}%`,
            top: `${300 + Math.random() * 1200}px`,
            transform: `rotate(${Math.random() * 45}deg)`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />,
      )
    }

    // Lines
    for (let i = 0; i < 4; i++) {
      elements.push(
        <div
          key={`line-${i}`}
          className="decorative-line"
          style={{
            left: `${10 + Math.random() * 20}%`,
            top: `${200 + i * 400 + Math.random() * 200}px`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />,
      )
    }

    // Add elements to the DOM or store them in a ref
    const container = document.getElementById('decorative-elements-container');
    if (container) {
      container.innerHTML = '';
      const fragment = document.createDocumentFragment();
      elements.forEach(element => {
        if (isValidElement(element)) {
          const reactElement = element as React.ReactElement<{
            className?: string;
            style?: React.CSSProperties;
          }>;
          const div = document.createElement('div');
          div.className = reactElement.props.className || "";
          Object.assign(div.style, reactElement.props.style);
          fragment.appendChild(div);
        }
      });
      container.appendChild(fragment);
    }

    // Return cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [])

  // Handle connect wallet button click
  const handleConnectWallet = () => {
    if (!connected) {
      setIsSigning(true)
      setVisible(true)
    } else if (connected && publicKey) {
      if (!signature) {
        const storedSignature = localStorage.getItem("walletSignature")
        if (storedSignature && localStorage.getItem("walletPublicKey") === publicKey.toString()) {
          setSignature(storedSignature)
          router.push("/chat")
        } else {
          setIsSigning(true)
        }
      } else {
        router.push("/chat")
      }
    }
  }

  // Listen for wallet adapter events to properly reset states
  useEffect(() => {
    // Create a cleanup function that resets the states
    const resetStates = () => {
      setIsSigning(false)

    }
    if (!connected && localStorage.getItem("walletSignature") === null) {
      resetStates()
    }
    
    return () => {
    }
  }, [connected])

  return (
    <div className="page-container">
      {/* Background Pattern */}
      <div className="bg-pattern"></div>

      {/* Full page grid background */}
      <div className="full-page-grid">
        {/* Hero Section with Clean Background */}
        <div className="w-full relative overflow-hidden">
          {/* Hero Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Header */}
            <header className="w-full max-w-5xl mx-auto pt-20 pb-10 px-4 text-center">
              <div className="mb-6">
                <Image 
                  src="/lumo-u.png" 
                  alt="LUMO-U" 
                  width={300}
                  height={100}
                  className="mx-auto"
                />
              </div>
              <p className="max-w-2xl mx-auto text-base leading-relaxed fade-in-up space-grotesk">
                A lightweight AI Toolkit Framework offering a multitude of on-chain actions and researching abilities created by {" "}
                <span className="text-[#9e4244] font-bold animated-border">Lumo Labs</span> catering to Solana.
                {" "}<span className="text-[#5c7c7d]">Connect your wallet</span>{" "}
                and start trying out LumoKit today, free-tier offers 10 requests per day.
              </p>

              {/* Social Icons */}
              <div className="flex justify-center gap-4 mt-4 mb-6">
                {/* X (Twitter) */}
                <Link href="https://x.com/lumolabsdotai" target="_blank" className="text-[#9e4244] hover:text-[#8a3a3c] transition-colors">
                  <Image 
                    src="/x-icon.svg" 
                    alt="X (Twitter)" 
                    width={24} 
                    height={24} 
                    className="social-icon"
                  />
                </Link>
                
                {/* Telegram */}
                <Link href="https://t.me/lumolabsdotai" target="_blank" className="text-[#9e4244] hover:text-[#8a3a3c] transition-colors">
                  <Image 
                    src="/tg-icon.svg" 
                    alt="Telegram" 
                    width={24} 
                    height={24} 
                    className="social-icon"
                  />
                </Link>
                
                {/* GitHub */}
                <Link href="https://github.com/Lumo-Labs-AI" target="_blank" className="text-[#9e4244] hover:text-[#8a3a3c] transition-colors">
                  <Image 
                    src="/github-icon.svg" 
                    alt="GitHub" 
                    width={24} 
                    height={24} 
                    className="social-icon"
                  />
                </Link>
                
                {/* Hugging Face */}
                <Link href="https://huggingface.co/lumolabs-ai" target="_blank" className="text-[#9e4244] hover:text-[#8a3a3c] transition-colors">
                  <Image 
                    src="/hf-icon.svg" 
                    alt="Hugging Face" 
                    width={24} 
                    height={24} 
                    className="social-icon"
                  />
                </Link>
                
                {/* DEXScreener */}
                <Link href="https://dexscreener.com/solana/4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump" target="_blank" className="text-[#9e4244] hover:text-[#8a3a3c] transition-colors">
                  <Image 
                    src="/dex-icon.png" 
                    alt="DEX Screener" 
                    width={24} 
                    height={24} 
                    className="social-icon"
                  />
                </Link>
              </div>

            </header>

            {/* Action Buttons - Immersive redesign */}
            <div className="flex flex-col sm:flex-row gap-6 mb-20 fade-in-up delay-100">
              <button
                onClick={handleConnectWallet}
                className={`
                  relative overflow-hidden group
                  px-8 py-4 min-w-[240px] 
                  font-bold tracking-wide space-grotesk-bold
                  transition-all duration-500
                  border-0 outline-none focus:outline-none
                  ${
                    isLoading || isSigning
                      ? "cursor-wait opacity-80"
                      : "cursor-pointer"
                  }
                `}
                disabled={isLoading || isSigning}
              >
                {/* Multi-layered button design */}
                <span className={`
                  absolute inset-0 transform transition-transform duration-700
                  ${isLoading || isSigning ? "" : "group-hover:scale-105 group-active:scale-95"}
                `}>
                  {/* Base layer - glow effect */}
                  <span className={`
                    absolute inset-0 rounded-xl transform blur-sm
                    ${connected && signature 
                      ? "bg-gradient-to-r from-[#5c7c7d] to-[#4a6a6b]" 
                      : "bg-gradient-to-r from-[#a84648] to-[#802f30]"}
                  `}></span>
                  
                  {/* Middle layer - main background */}
                  <span className={`
                    absolute inset-0 rounded-xl 
                    ${connected && signature 
                      ? "bg-gradient-to-br from-[#5c7c7d] to-[#3d5e5f]" 
                      : "bg-gradient-to-br from-[#9e4244] to-[#7a2a2b]"}
                  `}></span>
                  
                  {/* Top layer - shine effect */}
                  <span className={`
                    absolute inset-0 rounded-xl opacity-40
                    bg-gradient-to-b from-white via-transparent to-transparent 
                    h-1/3
                  `}></span>
                </span>
                
                {/* Foreground pattern */}
                <span className="absolute inset-0 rounded-xl overflow-hidden opacity-10">
                  <span className="absolute w-full h-full bg-repeat bg-[length:30px_30px]"></span>
                </span>
                
                {/* Animated particles (only visible on hover) */}
                {!isLoading && !isSigning && (
                  <>
                    <span className="absolute top-0 left-1/4 w-1 h-1 rounded-full bg-white opacity-0 group-hover:opacity-70 blur-[1px] transform group-hover:translate-y-12 transition-all duration-1000 delay-100"></span>
                    <span className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-50 blur-[1px] transform group-hover:translate-y-16 transition-all duration-1500 delay-300"></span>
                    <span className="absolute top-0 left-3/4 w-1 h-1 rounded-full bg-white opacity-0 group-hover:opacity-60 blur-[1px] transform group-hover:translate-y-10 transition-all duration-1000 delay-500"></span>
                  </>
                )}
                
                {/* Button content */}
                <span className="relative z-10 flex items-center justify-center gap-3 text-white">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="tracking-wider">LOADING...</span>
                    </>
                  ) : isSigning ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="tracking-wider">SIGNING...</span>
                    </>
                  ) : connected && (signature || localStorage.getItem("walletSignature")) ? (
                    <>
                      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 12.5L11 15.5L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div className="flex items-center">
                        <span className="tracking-wider">START CHATTING</span>
                        {/* Wallet address pill - horizontal layout instead of vertical */}
                        <div className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs flex items-center">
                          <span className="opacity-80">{publicKey ? shortenAddress(publicKey.toString()) : ""}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16 12L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="tracking-wider">CONNECT WALLET</span>
                    </>
                  )}
                </span>
                
                {/* Interactive pulse effect on hover */}
                <span className="absolute inset-0 rounded-xl pointer-events-none">
                  <span className={`
                    absolute inset-0 rounded-xl transform scale-0 
                    ${connected && signature 
                      ? "bg-[#5c7c7d]" 
                      : "bg-[#9e4244]"}
                    opacity-0 group-hover:opacity-25 group-hover:scale-100 
                    transition-all duration-500 group-active:opacity-0
                  `}></span>
                </span>
                
                {/* Bottom shadow for 3D effect */}
                <span className="absolute -bottom-1 left-1 right-1 h-2 bg-black opacity-10 blur-sm rounded-full transform 
                  group-hover:opacity-20 transition-opacity duration-300"></span>
              </button>
              
              {/* Redesigned Documentation Button - Matched Size with Wallet Button */}
              <Link
                href="https://lumolabs.ai"
                target="_blank"
                className="relative overflow-hidden group
                  px-8 py-4 min-w-[240px] 
                  font-bold tracking-wide space-grotesk-bold
                  transition-all duration-500
                  border-0 outline-none focus:outline-none
                  flex items-center justify-center"
                aria-label="Documentation"
              >
                {/* Multi-layered button design - similar structure to the wallet button */}
                <span className="absolute inset-0 transform transition-transform duration-700 group-hover:scale-105 group-active:scale-95">
                  {/* Base layer - glow effect */}
                  <span className="absolute inset-0 rounded-xl transform blur-sm bg-[#e5e1d8]"></span>
                  
                  {/* Middle layer - main background */}
                  <span className="absolute inset-0 rounded-xl bg-[#f7f3eb]"></span>
                  
                  {/* Border overlay */}
                  <span className="absolute inset-0 rounded-xl border border-[#d1c7b9] opacity-60"></span>
                  
                  {/* Top layer - shine effect */}
                  <span className="absolute inset-0 rounded-xl opacity-30 bg-gradient-to-b from-white via-transparent to-transparent h-1/3"></span>
                </span>

                {/* Button content - aligned similarly to wallet button */}
                <span className="relative z-10 flex items-center justify-center gap-3 text-[#9e4244]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 5V19H5V15H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3H15V5H19Z" fill="currentColor"/>
                    <path d="M12 15L13.41 13.59L15.83 16L17.24 14.59L12 9.35L6.76 14.59L8.17 16L10.59 13.59L12 15Z" fill="currentColor"/>
                  </svg>
                  <span className="tracking-wider">DOCUMENTATION</span>
                </span>
                
                {/* Interactive pulse effect on hover - similar to wallet button */}
                <span className="absolute inset-0 rounded-xl pointer-events-none">
                  <span className="absolute inset-0 rounded-xl transform scale-0 bg-[#9e4244] opacity-0 group-hover:opacity-5 group-hover:scale-100 transition-all duration-500 group-active:opacity-0"></span>
                </span>
                
                {/* Bottom shadow for 3D effect - similar to wallet button */}
                <span className="absolute -bottom-1 left-1 right-1 h-2 bg-black opacity-5 blur-sm rounded-full transform group-hover:opacity-10 transition-opacity duration-300"></span>
              </Link>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="w-full">
          {/* Enhanced Tool Integrations Section */}
          <div
            className="w-full max-w-6xl mx-auto px-4 mb-20 fade-in-up delay-200"
            style={{
              opacity: scrollY > 100 ? 1 : 0,
              transform: `translateY(${Math.max(0, 20 - scrollY / 10)}px)`,
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            <div className="section-heading-wrapper mb-8 text-center flex flex-col items-center">
              <h2 className="section-heading mb-2">TOOL INTEGRATIONS</h2>
              <p className="text-[#5c7c7d] max-w-2xl mx-auto">
                Explore our powerful selection of tools designed to enhance your Solana experience
              </p>
            </div>

            {/* Improved Search and Filter Controls */}
            <div className="mb-8 flex flex-col gap-6">
              <div className="relative mx-auto w-full max-w-xl">
                <input
                  type="text"
                  placeholder="Search tools by name, category, or functionality..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-5 py-4 pl-12 bg-[#f5f0e6] border-2 border-[#d1c7b9] text-[#3a3238] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9e4244] focus:border-transparent transition-all shadow-sm"
                />
                <svg 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9e4244]" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#9e4244] hover:text-[#8a3a3c] transition-colors"
                  >
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Enhanced Category Selection */}
              <div className="category-selector relative">
                <div className="category-backdrop bg-[#f5f0e6] rounded-2xl p-3 shadow-sm max-w-5xl mx-auto">
                  <div className="flex flex-wrap justify-center gap-2">
                    {categoriesWithCount.map(({name, count}) => (
                      <button
                        key={name}
                        onClick={() => handleCategoryChange(name)}
                        className={`category-button relative py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                          activeCategory === name
                            ? "text-white"
                            : "text-[#3a3238] hover:text-[#9e4244]"
                        }`}
                      >
                        {/* Background elements */}
                        <span className={`absolute inset-0 ${
                          activeCategory === name 
                            ? "bg-gradient-to-r from-[#9e4244] to-[#9e4244] opacity-100" 
                            : "bg-white opacity-70"
                        } rounded-xl transition-all duration-300`}></span>
                        
                        {/* Animated bubbles in background (only for active) */}
                        {activeCategory === name && (
                          <>
                            <span className="absolute w-2 h-2 rounded-full bg-white opacity-30 top-1 right-2 animate-float-slow"></span>
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-white opacity-20 bottom-1 left-3 animate-float-medium"></span>
                            <span className="absolute w-1 h-1 rounded-full bg-white opacity-30 top-2 left-2 animate-float-fast"></span>
                          </>
                        )}
                        
                        {/* Content */}
                        <span className="relative flex items-center gap-2">
                          <span className="category-name">{name}</span>
                          <span className={`inline-flex items-center justify-center rounded-full text-xs px-1.5 py-0.5 min-w-[1.25rem] ${
                            activeCategory === name 
                              ? "bg-white text-[#9e4244]" 
                              : "bg-[#e6e0d6] text-[#5c7c7d]"
                          } transition-all duration-300`}>
                            {count}
                          </span>
                          
                          {/* Active indicator */}
                          {activeCategory === name && (
                            <span className="ml-1 relative">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tools Grid - Always in a unified grid regardless of filter */}
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <h3 className="text-[#3a3238] text-xl font-bold">
                    {searchTerm 
                      ? "Search Results" 
                      : activeCategory === "All" 
                        ? "All Tools" 
                        : activeCategory}
                  </h3>
                  <div className="ml-3 h-px bg-[#d1c7b9] w-16 sm:w-32"></div>
                </div>
                <span className="bg-[#f5f0e6] text-[#5c7c7d] text-sm px-2 py-1 rounded-full">
                  {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {filteredTools.length > 0 ? (
                <div className="tools-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTools.map((tool: Tool, index) => (
                    <ToolCard 
                      key={tool.tool_identifier} 
                      tool={tool} 
                      index={index}
                      hoveredTool={hoveredTool}
                      setHoveredTool={setHoveredTool}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-[#f5f0e6] rounded-xl border border-[#d1c7b9] transform transition-all hover:scale-[1.01] shadow-sm">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full bg-[#9e4244] opacity-10 animate-ping"></div>
                    <Image 
                      src="/lumo-icon.png" 
                      alt="No results" 
                      width={60} 
                      height={60} 
                      className="relative z-10 mx-auto opacity-70"
                    />
                  </div>
                  <h3 className="text-lg font-medium text-[#3a3238] mb-2">No tools found</h3>
                  <p className="text-sm text-[#5c7c7d] mb-4 max-w-md mx-auto">
                    We couldn&apos;t find any tools matching your search criteria. Try adjusting your filters or search terms.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCategory("All");
                    }}
                    className="mt-2 text-[#9e4244] font-medium border border-[#9e4244] rounded-lg px-4 py-2 hover:bg-[#9e4244] hover:text-white transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset filters
                  </button>
                </div>
              )}
            </>
            
            {/* Quick stats with visual improvements */}
            <div className="stats-section mt-12 flex flex-wrap justify-center gap-4">
              <div className="stat-card group px-5 py-3 bg-[#f5f0e6] rounded-lg flex items-center gap-3 shadow-sm hover:bg-gradient-to-r hover:from-[#f5f0e6] hover:to-[#e9e2d6] transition-all duration-300 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#9e4244] bg-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-[#9e4244]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-[#5c7c7d]">Total Tools:</span>
                  <span className="text-lg font-bold text-[#3a3238] ml-1">{toolsData.length}</span>
                </div>
              </div>
              
              <div className="stat-card group px-5 py-3 bg-[#f5f0e6] rounded-lg flex items-center gap-3 shadow-sm hover:bg-gradient-to-r hover:from-[#f5f0e6] hover:to-[#e9e2d6] transition-all duration-300 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#5c7c7d] bg-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-[#5c7c7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-[#5c7c7d]">Categories:</span>
                  <span className="text-lg font-bold text-[#3a3238] ml-1">{categoriesWithCount.length - 1}</span>
                </div>
              </div>
              
              <div className="stat-card group px-5 py-3 bg-[#f5f0e6] rounded-lg flex items-center gap-3 shadow-sm hover:bg-gradient-to-r hover:from-[#f5f0e6] hover:to-[#e9e2d6] transition-all duration-300 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#9e4244] bg-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-[#9e4244]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-[#5c7c7d]">Default Enabled:</span>
                  <span className="text-lg font-bold text-[#3a3238] ml-1">
                    {toolsData.filter(tool => tool.default_status).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with gradient */}
        <footer className="footer-gradient">
          <div className="max-w-5xl mx-auto px-4 flex justify-between items-center relative z-10">
            <p className="text-sm text-[#3a3238] space-grotesk">© 2025 Lumo Labs. LumoKit is open source under AGPL-3.0.</p>
            <Link href="#">
              <Image src="/lumo-icon.png" alt="Lumo" width={60} height={20} />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

// Helper function to shorten wallet address
const shortenAddress = (address: string) => {
  return `${address.slice(0, 2)}..${address.slice(-2)}`
}

// Extracted Tool Card Component for cleaner code and consistent styling
const ToolCard = ({ 
  tool, 
  index, 
  hoveredTool,
  setHoveredTool
}: { 
  tool: Tool; 
  index: number; 
  hoveredTool: string | null;
  setHoveredTool: (id: string | null) => void;
}) => {
  return (
    <div
      className="tool-card group relative"
      onMouseEnter={() => setHoveredTool(tool.tool_identifier)}
      onMouseLeave={() => setHoveredTool(null)}
      style={{
        animationDelay: `${0.05 * index}s`,
      }}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#9e4244] to-[#5c7c7d] opacity-50 rounded-xl transform group-hover:scale-105 transition-all duration-300"></div>
      
      {/* Card content */}
      <div className="tool-card-inner relative z-10 bg-white bg-opacity-95 backdrop-blur-sm p-5 rounded-xl border border-[#d1c7b9] shadow-lg transform transition-all duration-300 group-hover:translate-y-1 group-hover:translate-x-1 h-full flex flex-col">
        {/* Card header with icon and title */}
        <div className="flex items-start mb-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-[#f5f0e6] mr-3 shadow-sm flex-shrink-0">
            <Image
              src={tool.icon_url}
              alt={tool.name}
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            {/* Title in div with fixed height to ensure consistent spacing */}
            <div className="h-[2.5rem] flex items-center">
              <h3 className="font-bold text-lg text-[#3a3238] line-clamp-1">{tool.name}</h3>
            </div>
            <span className="text-xs px-2 py-1 bg-[#f5f0e6] rounded-full text-[#5c7c7d] inline-block mt-1">
              {tool.category}
            </span>
          </div>
        </div>
        
        {/* Description with a fixed height */}
        <div className="h-[4.5rem] mb-4">
          <p className="text-sm text-[#3a3238] line-clamp-3">
            {tool.description}
          </p>
        </div>
        
        {/* Card footer */}
        <div className="flex justify-between items-center mt-auto">
          <span className={`text-xs px-2 py-1 rounded-full ${
            tool.default_status 
              ? "bg-[#e6f5f0] text-[#5c7c7d]" 
              : "bg-[#f5f0e6] text-[#9e4244]"
          }`}>
            {tool.default_status ? "Default" : "Optional"}
          </span>
          
          <Link 
            href={tool.read_more} 
            target="_blank"
            className="text-xs bg-[#f5f0e6] hover:bg-[#9e4244] hover:text-white text-[#9e4244] px-3 py-1 rounded-full transition-colors duration-300 flex items-center gap-1"
          >
            <span>Details</span>
            <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${
            hoveredTool === tool.tool_identifier ? "animate-shine" : ""
          }`}></div>
        </div>
      </div>
    </div>
  );
};
