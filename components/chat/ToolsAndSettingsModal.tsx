import React, { useRef, useEffect, useState } from 'react';
import { X, Search, Sliders, Check, Lock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import toolsData from '@/data/tools.json';

// Updated models list with correct configurations
const AVAILABLE_MODELS = [
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Fast, efficient model for most queries", pro: false },
  { id: "gpt-4.1", name: "GPT-4.1", description: "Latest flagship GPT model for complex tasks", pro: true },
  { id: "gpt-4o", name: "GPT 4o", description: "Fast, intelligent, flexible GPT model", pro: true },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", description: "Anthropic's most intelligent model", pro: true },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro Preview", description: "Google’s state-of-the-art AI model designed for advanced reasoning, coding, mathematics, and scientific tasks.", pro: true },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", description: "High-capacity multimodal language model from Meta", pro: true },
];

interface ToolData {
  icon_url: string;
  default_status: boolean;
  tool_identifier: string;
  name: string;
  category: string;
  description: string;
}

interface ToolsAndSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProUser: boolean;
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
}

const ToolsAndSettingsModal: React.FC<ToolsAndSettingsModalProps> = ({
  isOpen,
  onClose,
  isProUser,
  selectedTools,
  onToolsChange,
  selectedModel,
  onModelChange,
  temperature,
  onTemperatureChange,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedTools, setGroupedTools] = useState<{[key: string]: ToolData[]}>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<string[]>([]);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const MAX_FREE_TOOLS = 3; // Total tools limit for free users (including default tools)
  
  // Ensure default tools are selected on component mount
  useEffect(() => {
    // This effect is now run on selectedTools changes too, ensuring proper synchronization
      
    // Group tools by category
    const grouped = toolsData.reduce<{[key: string]: ToolData[]}>((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {});
    
    setGroupedTools(grouped);
    
    // Set first category as active by default if not already set
    if (!activeCategory && Object.keys(grouped).length > 0) {
      setActiveCategory(Object.keys(grouped)[0]);
    }
  }, [selectedTools, activeCategory]); // Fixed dependency array
  
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

  // Toggle tool selection
  const toggleTool = (toolId: string, isDefault: boolean) => {
    // Can't deselect default tools
    if (isDefault) return;
    
    try {
      // Check free user limitations
      if (!isProUser) {
        // If already selected, allow deselecting
        if (selectedTools.includes(toolId)) {
          // Create new tools array without this tool but preserving defaults
          const newTools = selectedTools.filter(id => id !== toolId);
          
          // Apply changes
          console.log("Removing tool:", toolId, "New tools array:", newTools);
          onToolsChange(newTools);
          
          // Explicitly save to localStorage
          localStorage.setItem('lumokit_tools', JSON.stringify(newTools));
          setShowLimitWarning(false);
          return;
        }
        
        // Count total tools (including default ones) for free users
        if (selectedTools.length >= MAX_FREE_TOOLS) {
          setShowLimitWarning(true);
          return;
        }
      }
      
      // Adding a tool
      if (!selectedTools.includes(toolId)) {
        const newTools = [...selectedTools, toolId];
        console.log("Adding tool:", toolId, "New tools array:", newTools);
        onToolsChange(newTools);
        localStorage.setItem('lumokit_tools', JSON.stringify(newTools));
      } 
      // Removing a tool
      else {
        const newTools = selectedTools.filter(id => id !== toolId);
        console.log("Removing tool:", toolId, "New tools array:", newTools);
        onToolsChange(newTools);
        localStorage.setItem('lumokit_tools', JSON.stringify(newTools));
      }
      
      setShowLimitWarning(false);
    } catch (error) {
      console.error('Error toggling tool:', error);
    }
  };
  
  // Handle temperature change
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onTemperatureChange(value);
  };
  
  // Handle model change
  const handleModelChange = (modelId: string) => {
    if (!isProUser && AVAILABLE_MODELS.find(m => m.id === modelId)?.pro) {
      // Can't change to pro model if not a pro user
      return;
    }
    onModelChange(modelId);
  };
  
  // Toggle description expansion
  const toggleDescription = (toolId: string) => {
    if (expandedDescriptions.includes(toolId)) {
      setExpandedDescriptions(expandedDescriptions.filter(id => id !== toolId));
    } else {
      setExpandedDescriptions([...expandedDescriptions, toolId]);
    }
  };
  
  // Filter tools based on search term
  const getFilteredTools = () => {
    if (!searchTerm) {
      return groupedTools;
    }
    
    const filtered = toolsData.filter(tool => 
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filtered.reduce<{[key: string]: ToolData[]}>((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {});
  };
  
  // Render the list of tools
  const renderTools = () => {
    const filteredTools = getFilteredTools();
    const categories = Object.keys(filteredTools);
    
    if (categories.length === 0) {
      return (
        <div className="p-6 text-center text-[#3a3238]/70">
          No tools match your search criteria
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {categories.map(category => (
          <div key={category} className="space-y-3">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setActiveCategory(activeCategory === category ? null : category)}
            >
              <div className="w-1.5 h-6 bg-gradient-to-b from-[#9e4244] to-[#d88c6a] rounded-full"></div>
              <h3 className="text-[#3a3238] font-semibold flex items-center gap-2">
                {category}
                {activeCategory === category ? 
                  <ChevronUp size={16} className="text-[#9e4244]" /> : 
                  <ChevronDown size={16} className="text-[#3a3238]/70" />
                }
              </h3>
            </div>
            
            {activeCategory === category && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                {filteredTools[category].map(tool => {
                  const isSelected = selectedTools.includes(tool.tool_identifier);
                  const isDescriptionExpanded = expandedDescriptions.includes(tool.tool_identifier);
                  const isDefault = tool.default_status;
                  
                  return (
                    <div 
                      key={tool.tool_identifier}
                      className={`bg-white rounded-lg border overflow-hidden transition-shadow ${
                        isSelected 
                          ? 'border-[#9e4244] shadow-md' 
                          : 'border-[#d1c7b9] hover:shadow-sm'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#9e4244]/10 to-[#d88c6a]/10">
                            <Image
                              src={tool.icon_url}
                              alt={tool.name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-[#3a3238]">{tool.name}</h4>
                              {isDefault ? (
                                <div className="text-xs px-2 py-0.5 rounded bg-[#5c7c7d]/10 text-[#5c7c7d] flex items-center gap-1">
                                  <Lock size={12} />
                                  <span>Default</span>
                                </div>
                              ) : (
                                <button 
                                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                    isSelected 
                                      ? 'bg-[#9e4244] text-white' 
                                      : 'bg-[#f5f0e6] text-[#3a3238] hover:bg-[#e9e4da]'
                                  }`}
                                  onClick={() => toggleTool(tool.tool_identifier, isDefault)}
                                  disabled={isDefault}
                                >
                                  {isSelected && <Check size={14} />}
                                </button>
                              )}
                            </div>
                            <p className={`text-sm text-[#3a3238]/70 mt-1 ${
                              isDescriptionExpanded ? '' : 'line-clamp-2'
                            }`}>
                              {tool.description}
                            </p>
                            {tool.description.length > 100 && (
                              <button 
                                className="text-xs text-[#9e4244] mt-1 hover:underline"
                                onClick={() => toggleDescription(tool.tool_identifier)}
                              >
                                {isDescriptionExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Get selected model details
  const getSelectedModelDetails = () => {
    return AVAILABLE_MODELS.find(model => model.id === selectedModel) || AVAILABLE_MODELS[0];
  };
  
  // Save settings explicitly when clicking Save button
  const handleSaveSettings = () => {
    try {
      // Ensure localStorage gets all current values
      console.log('Final tools being saved:', selectedTools);
      localStorage.setItem('lumokit_model', selectedModel);
      localStorage.setItem('lumokit_temperature', temperature.toString());
      localStorage.setItem('lumokit_tools', JSON.stringify(selectedTools));
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-[#f5f0e6] to-[#e9e4da] rounded-xl shadow-2xl w-full max-w-4xl transform transition-all animate-scaleIn flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header - Fixed height and non-scrollable */}
        <div className="relative overflow-hidden z-10 flex-shrink-0">
          {/* Background gradient header */}
          <div className="bg-gradient-to-r from-[#9e4244] to-[#d88c6a] pt-14 pb-8 px-6 relative">
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
            
            {/* Header content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sliders size={20} className="text-white" />
                </div>
                <h3 className="text-white text-2xl font-bold">Tools & Settings</h3>
              </div>
              <p className="text-white/80 text-sm">Configure your AI assistant and enable specialized tools</p>
            </div>
          </div>
        </div>
        
        {/* Content area with flex-1 to take remaining space */}
        <div className="overflow-y-auto overscroll-contain flex-1">
          <div className="px-6 py-6">
            {/* Settings Section */}
            <div className="mb-8">
              <h3 className="text-[#3a3238] font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#9e4244] to-[#d88c6a] rounded-full"></div>
                Settings
              </h3>
              
              <div className="bg-white rounded-lg border border-[#d1c7b9] p-5 space-y-6">
                {/* Model Selection */}
                <div>
                  <label className="block text-[#3a3238] font-medium mb-2">Model</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AVAILABLE_MODELS.map(model => {
                      const isSelected = selectedModel === model.id;
                      const isProOnly = model.pro && !isProUser;
                      
                      return (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#9e4244] bg-[#9e4244]/5'
                              : isProOnly
                                ? 'border-[#d1c7b9] bg-[#f5f0e6]/50 opacity-70'
                                : 'border-[#d1c7b9] hover:border-[#9e4244]/30 hover:bg-[#f5f0e6]'
                          }`}
                          onClick={() => handleModelChange(model.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-[#3a3238] flex items-center gap-2">
                              {model.name}
                              {model.pro && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-[#9e4244]/10 text-[#9e4244]">
                                  PRO
                                </span>
                              )}
                            </div>
                            <div className={`w-4 h-4 rounded-full ${
                              isSelected
                                ? 'bg-[#9e4244] border-2 border-white'
                                : 'border border-[#d1c7b9]'
                            }`}>
                            </div>
                          </div>
                          <p className="text-xs text-[#3a3238]/70">{model.description}</p>
                          
                          {isProOnly && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-[#9e4244]">
                              <Lock size={12} />
                              <span>Requires Pro subscription</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Temperature Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[#3a3238] font-medium">Temperature</label>
                    <span className="text-sm font-medium bg-[#f5f0e6] px-2 py-0.5 rounded text-[#3a3238]">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  
                  <div className="px-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={handleTemperatureChange}
                      disabled={!isProUser}
                      className={`w-full appearance-none h-2 rounded-full ${
                        isProUser ? 'bg-[#f5f0e6]' : 'bg-[#f5f0e6]/50'
                      }`}
                      style={{
                        backgroundImage: isProUser
                          ? `linear-gradient(to right, #9e4244 0%, #9e4244 ${temperature * 100}%, #f5f0e6 ${temperature * 100}%, #f5f0e6 100%)`
                          : ''
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-[#3a3238]/60 mt-1 px-1">
                    <span>Precise (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                  
                  {!isProUser && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-[#9e4244] bg-[#9e4244]/5 p-2 rounded">
                      <Lock size={12} />
                      <span>Temperature adjustment requires Pro subscription</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Tools Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#3a3238] font-semibold text-lg flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-[#9e4244] to-[#d88c6a] rounded-full"></div>
                  Tools
                </h3>
                
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3a3238]/50" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg border border-[#d1c7b9] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9e4244]/30"
                  />
                </div>
              </div>
              
              {/* Free user limitation warning - Updated text */}
              {!isProUser && (
                <div className="bg-[#f5f0e6] border border-[#d1c7b9] rounded-lg p-3 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#9e4244]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-[#9e4244]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#3a3238]">
                      <span className="font-medium">Free Plan Limitation:</span> You can use up to 3 tools in total.
                      Default tools count towards this limit.
                    </p>
                    <p className="text-xs text-[#9e4244] mt-1">
                      Upgrade to Pro for unlimited tool access.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Limit warning message */}
              {showLimitWarning && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 flex items-center gap-3 animate-fadeIn">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Tool limit reached
                    </p>
                    <p className="text-xs mt-1">
                      Free users can select up to 3 tools total (including default tools). Upgrade to Pro for unlimited tools.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Selected tools section - only show if there are any */}
              {selectedTools.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[#3a3238] font-medium text-sm mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#9e4244]/30 rounded-full"></span>
                    Selected Tools ({selectedTools.length})
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {toolsData
                      .filter(tool => selectedTools.includes(tool.tool_identifier))
                      .map(tool => (
                        <div 
                          key={`selected-${tool.tool_identifier}`}
                          className="bg-white rounded-lg border border-[#9e4244] shadow-md overflow-hidden"
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#9e4244]/10 to-[#d88c6a]/10">
                                <Image
                                  src={tool.icon_url}
                                  alt={tool.name}
                                  fill
                                  className="object-contain p-1"
                                />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-[#3a3238]">{tool.name}</h4>
                                  {tool.default_status ? (
                                    <div className="text-xs px-2 py-0.5 rounded bg-[#5c7c7d]/10 text-[#5c7c7d] flex items-center gap-1">
                                      <Lock size={12} />
                                      <span>Default</span>
                                    </div>
                                  ) : (
                                    <button 
                                      className="w-6 h-6 rounded-md flex items-center justify-center bg-[#9e4244] text-white"
                                      onClick={() => toggleTool(tool.tool_identifier, tool.default_status)}
                                      disabled={tool.default_status}
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-[#3a3238]/70 mt-1 line-clamp-1">
                                  {tool.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* All tools section */}
              {renderTools()}
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed at bottom with flex-shrink-0 */}
        <div className="p-6 border-t border-[#d1c7b9]/30 bg-[#e9e4da] flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-medium text-[#3a3238]">Current Setup</h4>
              <p className="text-sm text-[#3a3238]/70 mt-1">
                {getSelectedModelDetails().name} • Temp: {temperature.toFixed(1)} • 
                {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} enabled
              </p>
            </div>
            
            <button 
              className="py-2.5 px-6 bg-gradient-to-r from-[#9e4244] to-[#d88c6a] hover:from-[#8a3a3c] hover:to-[#c67e5e] text-white font-medium rounded-lg shadow-md transition-all duration-200 active:scale-[0.98]"
              onClick={handleSaveSettings}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsAndSettingsModal;
