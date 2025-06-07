import React, { memo, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Declare global window functions for TypeScript
declare global {
  interface Window {
    toggleThinkingBlock: (blockId: string) => void;
  }
}

const customRenderer = new marked.Renderer();

// Override the code method for syntax highlighting
customRenderer.code = function(code, language) {
  // Determine block size based on line count
  const lineCount = code.split('\n').length;
  let sizeClass = 'small';
  
  if (lineCount > 30) {
    sizeClass = 'large';
  } else if (lineCount > 15) {
    sizeClass = 'medium';
  }
  
  // Auto-detect language if not specified or not supported
  let detectedLanguage = language || '';
  
  if (!language || !hljs.getLanguage(language)) {
    const detection = hljs.highlightAuto(code);
    detectedLanguage = detection.language || 'plaintext';
  }
  
  // Get language display name for better readability
  const languageNames: {[key: string]: string} = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'jsx': 'React JSX',
    'tsx': 'React TSX',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'python': 'Python',
    'ruby': 'Ruby',
    'go': 'Go',
    'rust': 'Rust',
    'java': 'Java',
    'csharp': 'C#',
    'cpp': 'C++',
    'php': 'PHP',
    'bash': 'Shell',
    'sh': 'Shell',
    'sql': 'SQL',
    'json': 'JSON',
    'yaml': 'YAML',
    'markdown': 'Markdown',
    'md': 'Markdown',
    'plaintext': 'Text',
  };
  
  const displayName = languageNames[detectedLanguage] || detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1);
  
  // Highlight the code
  const highlightedCode = hljs.highlight(code, { language: detectedLanguage }).value;
  
  // Return highlighted HTML with improved copy button
  return `<div class="code-block ${sizeClass}">
            <div class="code-header">
              <span class="code-language">${displayName}</span>
              <button class="copy-code-button" data-code="${encodeURIComponent(code)}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span class="copy-success">Copied!</span>
              </button>
            </div>
            <pre class="hljs"><code>${highlightedCode}</code></pre>
          </div>`;
};

// Enhanced link renderer
customRenderer.link = function(href, title, text) {
  // Ensure href is not null or undefined
  const safeHref = href || '';
  
  // Check if this is an auto-linked URL
  const isAutoLink = text === safeHref;
  
  // Determine if it's an external link
  const isExternal = safeHref.startsWith('http') || safeHref.startsWith('https');
  const className = isExternal ? 'external-link' : 'internal-link';
  
  // Always add target="_blank" for external links
  const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
  
  // Format display text for auto-linked URLs
  let displayText = text;
  
  if (isAutoLink && isExternal) {
    try {
      const url = new URL(safeHref);
      // Create prettier display format
      displayText = url.hostname.replace('www.', '');
      
      // Add path if it's not just "/"
      if (url.pathname && url.pathname !== '/') {
        // Truncate if too long
        const pathDisplay = url.pathname.length > 15 
          ? url.pathname.substring(0, 15) + '...' 
          : url.pathname;
        displayText += pathDisplay;
      }
    } catch (e) {
      // If URL parsing fails, just use the original text
      displayText = text;
    }
  }
  
  // Add additional data attribute to track if link was formatted by markdown
  const markdownFormatted = text !== safeHref ? ' data-markdown-formatted="true"' : '';
  
  // Important: Make sure href is properly escaped and included in the tag
  return `<a href="${safeHref}" title="${title || ''}" class="${className}"${targetAttr}${markdownFormatted}>${displayText}</a>`;
};

// Custom blockquote renderer with note/warning/tip styling
customRenderer.blockquote = function(quote) {
  // Check for special blockquote types
  let type = 'info';
  let icon = '💡';
  let title = 'Note';
  
  if (quote.includes('WARNING:') || quote.includes('⚠️')) {
    type = 'warning';
    icon = '⚠️';
    title = 'Warning';
    quote = quote.replace(/WARNING:|⚠️/g, '');
  } else if (quote.includes('TIP:') || quote.includes('💡')) {
    type = 'tip';
    icon = '💡';
    title = 'Tip';
    quote = quote.replace(/TIP:|💡/g, '');
  } else if (quote.includes('INFO:') || quote.includes('ℹ️')) {
    type = 'info';
    icon = 'ℹ️';
    title = 'Info';
    quote = quote.replace(/INFO:|ℹ️/g, '');
  }
  
  return `<div class="custom-blockquote ${type}">
            <div class="blockquote-header">
              <span class="blockquote-icon">${icon}</span>
              <span class="blockquote-title">${title}</span>
            </div>
            <div class="blockquote-content">${quote}</div>
          </div>`;
};

// Custom table renderer with responsive design
customRenderer.table = function(header, body) {
  return `<div class="table-container">
            <table class="custom-table">
              <thead>${header}</thead>
              <tbody>${body}</tbody>
            </table>
          </div>`;
};

// Custom heading renderer with anchor links
customRenderer.heading = function(text, level) {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${level} class="custom-heading heading-${level}">
            <a name="${escapedText}" class="anchor" href="#${escapedText}">
              <span class="header-link">#</span>
            </a>
            ${text}
          </h${level}>`;
};

// Enhanced list renderer
customRenderer.list = function(body, ordered, start) {
  const type = ordered ? 'ol' : 'ul';
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
  const className = ordered ? 'ordered-list' : 'unordered-list';
  
  return `<${type}${startAttr} class="${className}">${body}</${type}>`;
};

// Enhanced list item renderer with proper signature
customRenderer.listitem = function(text, task, checked) {
  // Make sure we handle all parameters properly
  if (task) {
    return `<li class="custom-list-item task-list-item ${checked ? 'checked' : ''}">${text}</li>`;
  }
  return `<li class="custom-list-item">${text}</li>`;
};

// Custom image renderer
customRenderer.image = function(href, title, text) {
  return `<div class="image-container">
            <img src="${href}" alt="${text}" title="${title || text}" class="markdown-image" loading="lazy" />
            ${title ? `<div class="image-caption">${title}</div>` : ''}
          </div>`;
};

// Improved containsMarkdown function
export function containsMarkdown(text: string): boolean {
  // More comprehensive pattern matching for markdown
  const markdownPatterns = [
    /#{1,6}\s+\w+/,           // Headings
    /\*\*[\w\s]+\*\*/,        // Bold text
    /\*[\w\s]+\*/,            // Italic text
    /\[.+?\]\(.+?\)/,         // Links with brackets
    /https?:\/\/\S+/,         // Raw URLs
    /```[\w\s]+/,             // Code blocks
    /`[^`]+`/,                // Inline code
    /- [\w\s]+/,              // Unordered lists
    /\d+\. [\w\s]+/,          // Ordered lists
    /\|\s*[\w\s]+\s*\|/,      // Tables
    />\s+[\w\s]+/,            // Blockquotes
    /<think>/i,               // Thinking blocks (opening tag)
    /<\/think>/i,             // Thinking blocks (closing tag)
  ];
  
  // Test against each pattern
  return markdownPatterns.some(pattern => pattern.test(text));
}

// Check if content contains thinking blocks (complete or incomplete)
export function containsThinkingBlocks(text: string): boolean {
  return /<think>/i.test(text) || /<\/think>/i.test(text);
}

// Check if thinking blocks are complete (have both opening and closing tags)
export function hasCompleteThinkingBlocks(text: string): boolean {
  const openTags = (text.match(/<think>/gi) || []).length;
  const closeTags = (text.match(/<\/think>/gi) || []).length;
  return openTags > 0 && openTags === closeTags;
}

// Check if content has incomplete thinking blocks (streaming)
export function hasIncompleteThinkingBlocks(text: string): boolean {
  const openTags = (text.match(/<think>/gi) || []).length;
  const closeTags = (text.match(/<\/think>/gi) || []).length;
  return openTags > closeTags;
}

// Split content into thinking and answering phases
export function splitThinkingAndAnswer(text: string): { thinking: string[], answer: string } {
  const parts = text.split(/<\/?think>/gi);
  const thinking: string[] = [];
  let answerPart = ''; // Changed variable name for clarity
  let inThinkTag = false;
  const initialSplit = text.split(/(<\/?think>)/gi);

  let currentThinkingContent = "";
  let outsideThinkingContent = "";

  initialSplit.forEach(part => {
    if (part.toLowerCase() === '<think>') {
      if (outsideThinkingContent.trim()) {
        // This should ideally not happen if <think> is not at the start
        // but if it does, treat it as part of the answer or pre-thinking content
        answerPart += outsideThinkingContent;
        outsideThinkingContent = "";
      }
      inThinkTag = true;
    } else if (part.toLowerCase() === '</think>') {
      if (inThinkTag) {
        thinking.push(currentThinkingContent.trim());
        currentThinkingContent = "";
      }
      inThinkTag = false;
    } else {
      if (inThinkTag) {
        currentThinkingContent += part;
      } else {
        outsideThinkingContent += part;
      }
    }
  });

  // Any remaining content outside or after the last </think> is part of the answer
  answerPart += outsideThinkingContent;
  if (inThinkTag && currentThinkingContent.trim()) {
    // This means an unclosed <think> tag, content is part of thinking
    thinking.push(currentThinkingContent.trim());
  }


  return { thinking, answer: answerPart.trim() };
}

// Define ProcessedBlock interface with enhanced metadata
export interface ProcessedBlock {
  id: string;
  type: 'thinkingComplete' | 'thinkingStreaming' | 'answer' | 'markdown';
  html: string;
  messageId?: string; // Add message ID for context
  contentHash?: string; // Add content hash for change detection
}

// Add a function to generate stable IDs based on message and content
function generateStableId(messageId: string, type: string, index: number = 0, contentHash?: string): string {
  const baseId = `${messageId}-${type}-${index}`;
  return contentHash ? `${baseId}-${contentHash}` : baseId;
}

// Add content hashing function for change detection
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Add a processing cache to prevent unnecessary re-renders
const processingCache = new Map<string, any>();
const blockCache = new Map<string, string>();

// Function to process markdown text to HTML with streaming support
export function processMarkdown(markdown: string, isStreaming: boolean = false, messageId?: string): string | ProcessedBlock[] {
  // Create cache key
  const cacheKey = `${messageId || 'unknown'}-${hashContent(markdown)}-${isStreaming}`;
  
  // Check cache first
  if (processingCache.has(cacheKey)) {
    return processingCache.get(cacheKey);
  }
  
  // Configure marked with custom renderer
  marked.use({ renderer: customRenderer });
  
  // Set options for code highlighting and other features
  marked.setOptions({
    gfm: true,
    breaks: true,
    smartypants: true,
    langPrefix: 'language-',
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  });
  
  let result: string | ProcessedBlock[];
  
  // Handle thinking blocks specially before general markdown processing
  if (containsThinkingBlocks(markdown)) {
    result = processThinkingAndAnswerFormat(markdown, isStreaming, messageId);
  } else {
    // Parse markdown to HTML for non-thinking content
    let html = marked.parse(markdown);
    
    const purifyConfig = {
      ADD_ATTR: ['target', 'rel', 'class', 'data-code', 'data-markdown-formatted', 'href'],
      ADD_TAGS: ['iframe', 'svg', 'rect', 'path'],
      ALLOWED_ATTR: ['src', 'allowfullscreen', 'frameborder', 'width', 'height', 
                    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 
                    'stroke-linejoin', 'x', 'y', 'rx', 'ry', 'd', 'target', 'rel', 'href']
    };
    
    // Configure DOMPurify to preserve links properly
    DOMPurify.addHook('afterSanitizeAttributes', function(node) {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href');
        
        if (!href && node.hasAttribute('data-original-href')) {
          node.setAttribute('href', node.getAttribute('data-original-href') || '');
        }
        
        if (href && (href.startsWith('http') || href.startsWith('https'))) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });
    
    // Extra protection for links before sanitizing
    html = html.replace(/<a([^>]*)>/g, (match, attributes) => {
      const hrefMatch = attributes.match(/href=['"]([^'"]+)['"]/);
      const href = hrefMatch ? hrefMatch[1] : '';
      
      if (href) {
        return `<a${attributes} data-original-href="${href}">`;
      }
      return match;
    });
    
    html = DOMPurify.sanitize(html, purifyConfig);
    html = processEmbeddedContent(html, isStreaming);
    
    result = html;
  }
  
  // Cache the result
  processingCache.set(cacheKey, result);
  
  // Limit cache size
  if (processingCache.size > 100) {
    const firstKey = processingCache.keys().next().value;
    if (firstKey !== undefined) {
      processingCache.delete(firstKey);
    }
  }
  
  return result;
}

// Process special embedded content like diagrams or math
function processEmbeddedContent(html: string, isStreaming: boolean = false): string {
  // Process math expressions (KaTeX style notation)
  html = html.replace(/\$\$(.*?)\$\$/g, '<div class="math-block">$1</div>');
  html = html.replace(/\$(.*?)\$/g, '<span class="math-inline">$1</span>');
  
  // Process diagrams (mermaid syntax)
  const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;
  html = html.replace(mermaidRegex, '<div class="mermaid-diagram">$1</div>');
  
  // Process any remaining code blocks with special languages that aren't thinking blocks
  html = processSpecialCodeBlocks(html);
  
  return html;
}

// Process special code blocks (non-thinking)
function processSpecialCodeBlocks(html: string): string {
  // You can add more special code block processing here
  // For example, processing flowcharts, diagrams, etc.
  
  // Process flowchart code blocks
  const flowchartRegex = /<pre><code class="language-flowchart">([\s\S]*?)<\/code><\/pre>/g;
  html = html.replace(flowchartRegex, '<div class="flowchart-diagram">$1</div>');
  
  return html;
}

// Process thinking and answer format with distinct visual styles
function processThinkingAndAnswerFormat(content: string, isStreaming: boolean, messageId?: string): ProcessedBlock[] {
  const isComplete = hasCompleteThinkingBlocks(content);
  const hasIncomplete = hasIncompleteThinkingBlocks(content);
  
  if (isStreaming && hasIncomplete) {
    return processStreamingThinkingFormat(content, messageId);
  }
  
  if (isComplete) {
    return processCompleteThinkingFormat(content, messageId);
  }
  
  // Fallback for other cases (e.g. only <think> or </think> but not matching)
  // Treat as single markdown block
  const fallbackHtml = processMarkdownContent(content);
  const contentHash = hashContent(content);
  return [{ 
    id: generateStableId(messageId || 'unknown', 'markdown', 0, contentHash), 
    type: 'markdown', 
    html: fallbackHtml,
    messageId,
    contentHash
  }];
}

// Process streaming thinking format with smart updates
function processStreamingThinkingFormat(content: string, messageId?: string): ProcessedBlock[] {
  const resultBlocks: ProcessedBlock[] = [];
  const thinkingMatch = content.match(/<think>([\s\S]*?)$/i);
  const beforeThinking = content.split('<think>')[0].trim();
    
  if (beforeThinking) {
    const beforeHtml = processMarkdownContent(beforeThinking);
    const contentHash = hashContent(beforeThinking);
    if (beforeHtml) {
      resultBlocks.push({ 
        id: generateStableId(messageId || 'unknown', 'md-before-stream', 0, contentHash), 
        type: 'markdown', 
        html: beforeHtml,
        messageId,
        contentHash
      });
    }
  }
  
  if (thinkingMatch) {
    const thinkingContent = thinkingMatch[1];
    const contentHash = hashContent(thinkingContent);
    const streamingId = generateStableId(messageId || 'unknown', 'thinking-stream', 0, contentHash);
    const streamingHtml = createStreamingThinkingBlock(thinkingContent, streamingId);
    resultBlocks.push({ 
      id: streamingId,
      type: 'thinkingStreaming', 
      html: streamingHtml,
      messageId,
      contentHash
    });
  }
  
  return resultBlocks;
}

// Process complete thinking format with stable IDs
function processCompleteThinkingFormat(content: string, messageId?: string): ProcessedBlock[] {
  const { thinking, answer } = splitThinkingAndAnswer(content);
  const resultBlocks: ProcessedBlock[] = [];
  
  thinking.forEach((thinkContent, index) => {
    const contentHash = hashContent(thinkContent);
    const blockId = generateStableId(messageId || 'unknown', 'thinking-complete', index, contentHash);
    const blockHtml = createCompletedThinkingBlock(thinkContent, index, blockId);
    resultBlocks.push({ 
      id: blockId, 
      type: 'thinkingComplete', 
      html: blockHtml,
      messageId,
      contentHash
    });
  });
  
  if (answer) {
    const contentHash = hashContent(answer);
    const answerId = generateStableId(messageId || 'unknown', 'answer', 0, contentHash);
    const answerHtml = createAnswerSection(answer, answerId);
    resultBlocks.push({ 
      id: answerId,
      type: 'answer', 
      html: answerHtml,
      messageId,
      contentHash
    });
  }
  
  return resultBlocks;
}

// Process regular markdown content
function processMarkdownContent(content: string): string {
  if (!content.trim()) return '';
  
  // Parse markdown to HTML
  let html = marked.parse(content);
  
  // Sanitize HTML
  const purifyConfig = {
    ADD_ATTR: ['target', 'rel', 'class', 'data-code', 'href'],
    ADD_TAGS: ['iframe', 'svg', 'rect', 'path'],
    ALLOWED_ATTR: ['src', 'allowfullscreen', 'frameborder', 'width', 'height', 
                  'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 
                  'stroke-linejoin', 'x', 'y', 'rx', 'ry', 'd', 'target', 'rel', 'href']
  };
  
  html = DOMPurify.sanitize(html, purifyConfig);
  
  return html;
}

// Create streaming thinking block with smart caching
function createStreamingThinkingBlock(content: string, blockId: string): string {
  // Check cache first
  const cacheKey = `stream-${blockId}-${hashContent(content)}`;
  if (blockCache.has(cacheKey)) {
    return blockCache.get(cacheKey)!;
  }
  
  // Check if this block already exists in DOM for smart updates
  if (typeof window !== 'undefined') {
    const existingBlock = document.getElementById(blockId);
    if (existingBlock) {
      const textElement = existingBlock.querySelector('.thinking-stream-text');
      if (textElement) {
        // Smart update: only update the text content
        const newContent = content.replace(/\n/g, '<br>');
        if (textElement.innerHTML !== newContent) {
          textElement.innerHTML = newContent;
        }
        return ''; // Return empty to indicate no full replacement needed
      }
    }
  }
  
  // Generate the full HTML
  const html = `
    <div class="thinking-stream-container" id="${blockId}">
      <div class="thinking-stream-header">
        <div class="thinking-brain-pulse">
          <div class="brain-wave-1"></div>
          <div class="brain-wave-2"></div>
          <div class="brain-wave-3"></div>
          <div class="brain-center">🧠</div>
        </div>
        <div class="thinking-stream-title">
          <h4>AI is thinking...</h4>
          <p>Processing your request step by step</p>
        </div>
        <div class="thinking-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <div class="thinking-stream-content">
        <div class="thinking-stream-text" style="word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${content.replace(/\n/g, '<br>')}</div>
        <div class="thinking-cursor"></div>
      </div>
    </div>
    
    <style>
      .thinking-stream-container {
        margin: 1.5rem 0;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%);
        border: 2px solid transparent;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(14, 165, 233, 0.15);
        animation: streamContainerPulse 3s ease-in-out infinite;
        position: relative;
      }
      
      .thinking-stream-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.1), transparent);
        animation: shimmer 2s infinite;
      }
      
      .thinking-stream-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
        border-bottom: 1px solid rgba(14, 165, 233, 0.2);
      }
      
      .thinking-brain-pulse {
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .brain-wave-1, .brain-wave-2, .brain-wave-3 {
        position: absolute;
        border: 2px solid rgba(14, 165, 233, 0.4);
        border-radius: 50%;
        animation: brainWaves 2s ease-out infinite;
      }
      
      .brain-wave-1 {
        width: 20px;
        height: 20px;
        animation-delay: 0s;
      }
      
      .brain-wave-2 {
        width: 32px;
        height: 32px;
        animation-delay: 0.4s;
      }
      
      .brain-wave-3 {
        width: 44px;
        height: 44px;
        animation-delay: 0.8s;
      }
      
      .brain-center {
        font-size: 20px;
        z-index: 2;
        animation: brainBounce 1s ease-in-out infinite;
      }
      
      .thinking-stream-title {
        flex: 1;
      }
      
      .thinking-stream-title h4 {
        margin: 0;
        color: #0369a1;
        font-size: 1rem;
        font-weight: 600;
      }
      
      .thinking-stream-title p {
        margin: 0.25rem 0 0 0;
        color: #64748b;
        font-size: 0.8rem;
      }
      
      .thinking-dots {
        display: flex;
        gap: 4px;
      }
      
      .thinking-dots span {
        width: 6px;
        height: 6px;
        background: #0ea5e9;
        border-radius: 50%;
        animation: dotPulse 1.5s ease-in-out infinite;
      }
      
      .thinking-dots span:nth-child(2) {
        animation-delay: 0.3s;
      }
      
      .thinking-dots span:nth-child(3) {
        animation-delay: 0.6s;
      }
      
      .thinking-stream-content {
        padding: 1.25rem;
        position: relative;
      }
      
      .thinking-stream-text {
        color: #334155;
        font-size: 0.9rem;
        line-height: 1.6;
        font-style: italic;
        position: relative;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
      }
      
      .thinking-cursor {
        display: inline-block;
        width: 2px;
        height: 1.2em;
        background: #0ea5e9;
        margin-left: 4px;
        animation: cursorBlink 1s infinite;
        vertical-align: text-bottom;
      }
      
      @keyframes streamContainerPulse {
        0%, 100% { 
          box-shadow: 0 8px 32px rgba(14, 165, 233, 0.15);
        }
        50% { 
          box-shadow: 0 12px 40px rgba(14, 165, 233, 0.25);
        }
      }
      
      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      @keyframes brainWaves {
        0% {
          opacity: 1;
          transform: scale(0.8);
        }
        100% {
          opacity: 0;
          transform: scale(1.4);
        }
      }
      
      @keyframes brainBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      @keyframes dotPulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      
      @keyframes cursorBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    </style>
  `;
  
  // Cache the result
  blockCache.set(cacheKey, html);
  
  // Limit cache size
  if (blockCache.size > 50) {
    const firstKey = blockCache.keys().next().value;
    if (firstKey !== undefined) {
      blockCache.delete(firstKey);
    }
  }
  
  return html;
}

// Create answer section with stable ID
function createAnswerSection(content: string, answerId: string): string {
  const processedContent = processMarkdownContent(content);
  // Ensure word wrap for answer content
  return `
    <div class="answer-section-container" id="${answerId}">
      <div class="answer-section-header">
        <div class="answer-section-icon">
          <div class="answer-indicator"></div>
        </div>
        <div class="answer-section-title">
          <h4>Response</h4>
          <p>Based on the reasoning above</p>
        </div>
      </div>
      
      <div class="answer-section-content" style="word-wrap: break-word; overflow-wrap: break-word;">
        ${processedContent}
      </div>
    </div>
    
    <style>
      .answer-section-container {
        margin: 1.5rem 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        animation: answerAppear 0.6s ease-out;
      }
      
      .answer-section-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-bottom: 1px solid #e2e8f0;
      }
      
      .answer-section-icon {
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .answer-indicator {
        width: 12px;
        height: 12px;
        background: linear-gradient(135deg, #059669, #10b981);
        border-radius: 50%;
        position: relative;
      }
      
      .answer-indicator::after {
        content: '';
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border: 2px solid #10b981;
        border-radius: 50%;
        opacity: 0.2;
        animation: answerPulse 3s ease-in-out infinite;
      }
      
      .answer-section-title {
        flex: 1;
      }
      
      .answer-section-title h4 {
        margin: 0;
        color: #1f2937;
        font-size: 1rem;
        font-weight: 600;
      }
      
      .answer-section-title p {
        margin: 0.25rem 0 0 0;
        color: #6b7280;
        font-size: 0.8rem;
      }
      
      .answer-section-content {
        padding: 1.5rem 1.25rem;
        color: #374151;
        line-height: 1.6;
        animation: contentFadeIn 0.8s ease-out 0.2s both;
        background: white;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      @keyframes answerAppear {
        from {
          opacity: 0;
          transform: translateY(15px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes answerPulse {
        0%, 100% { 
          transform: scale(1);
          opacity: 0.2;
        }
        50% { 
          transform: scale(1.3);
          opacity: 0.4;
        }
      }
      
      @keyframes contentFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @media (max-width: 768px) {
        .answer-section-header {
          padding: 0.75rem 1rem;
        }
        
        .answer-section-content {
          padding: 1rem;
        }
      }
    </style>
  `;
}

// Create completed thinking block with stable ID
function createCompletedThinkingBlock(content: string, index: number, blockId: string): string {
  // Process content into steps
  const steps = content.split('\n').filter(line => line.trim()).map((line, stepIndex) => {
    const trimmed = line.trim();
    let stepType = 'general';
    let icon = stepIndex + 1; // Use step number as default
    
    if (trimmed.toLowerCase().includes('first') || trimmed.toLowerCase().includes('step 1')) {
      stepType = 'start';
      icon = stepIndex + 1;
    } else if (trimmed.toLowerCase().includes('then') || trimmed.toLowerCase().includes('next')) {
      stepType = 'continue';
      icon = stepIndex + 1;
    } else if (trimmed.toLowerCase().includes('finally') || trimmed.toLowerCase().includes('conclusion')) {
      stepType = 'end';
      icon = stepIndex + 1;
    } else if (trimmed.includes('?')) {
      stepType = 'question';
      icon = stepIndex + 1;
    } else if (trimmed.toLowerCase().includes('because') || trimmed.toLowerCase().includes('since')) {
      stepType = 'reason';
      icon = stepIndex + 1;
    }
    
    return {
      content: trimmed,
      type: stepType,
      icon: icon,
      delay: stepIndex * 0.15
    };
  });

  // Ensure the global toggle function is available
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
      
      // Update attributes and styles
      content.setAttribute('data-expanded', newState.toString());
      chevron.style.transform = newState ? 'rotate(180deg)' : 'rotate(0deg)';
      toggleText.textContent = newState ? 'Hide Process' : 'Show Process';
      
      if (newState) {
        // Animate steps when expanding
        const steps = container.querySelectorAll('.thinking-step');
        steps.forEach((step, index) => {
          if (step instanceof HTMLElement) {
            step.style.animationDelay = (index * 0.1) + 's';
            step.style.animation = 'none';
            // Force reflow
            step.offsetHeight;
            step.style.animation = 'stepReveal 0.5s ease-out forwards';
          }
        });
      }
    };
  }
  
  return `
    <div class="thinking-complete-container" id="${blockId}">
      <div class="thinking-complete-header" onclick="window.toggleThinkingBlock && window.toggleThinkingBlock('${blockId}')">
        <div class="thinking-complete-icon">
          <div class="thinking-indicator">
            <div class="thinking-pulse"></div>
            <div class="thinking-core"></div>
          </div>
        </div>
        
        <div class="thinking-complete-title">
          <h4>💭 Reasoning Process</h4>
          <p>${steps.length} step${steps.length !== 1 ? 's' : ''} • Click to ${steps.length > 5 ? 'explore' : 'view'}</p>
        </div>
        
        <button class="thinking-complete-toggle" onclick="event.stopPropagation(); window.toggleThinkingBlock && window.toggleThinkingBlock('${blockId}')">
          <svg class="thinking-complete-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
          <span class="thinking-complete-toggle-text">Show Process</span>
        </button>
      </div>
      
      <div class="thinking-complete-content" data-expanded="false">
        <div class="thinking-complete-steps">
          ${steps.map((step, stepIndex) => `
            <div class="thinking-step thinking-step-${step.type}" style="animation-delay: ${step.delay}s">
              <div class="thinking-step-marker">
                <div class="thinking-step-icon thinking-step-icon-${step.type}">
                  <span class="thinking-step-number-display">${step.icon}</span>
                  <div class="thinking-step-icon-bg"></div>
                </div>
                <div class="thinking-step-line"></div>
              </div>
              <div class="thinking-step-content">
                <div class="thinking-step-text" style="word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${step.content}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <style>
      .thinking-complete-container {
        margin: 1.5rem 0;
        background: linear-gradient(135deg, #fefefe 0%, #fafafa 100%);
        border: 1px solid #e1e7ef;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        animation: completeAppear 0.6s ease-out;
        transition: all 0.3s ease;
      }
      
      .thinking-complete-container:hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
      }
      
      .thinking-complete-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
        border-bottom: 1px solid #e1e7ef;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      .thinking-complete-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
        transition: left 0.5s ease;
      }
      
      .thinking-complete-header:hover::before {
        left: 100%;
      }
      
      .thinking-complete-header:hover {
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #d1d9e0 100%);
      }
      
      .thinking-complete-icon {
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .thinking-indicator {
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .thinking-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 2px solid #3b82f6;
        border-radius: 50%;
        opacity: 0.6;
        animation: pulseRing 2s ease-out infinite;
      }
      
      .thinking-core {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 50%;
        position: relative;
        z-index: 2;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      }
      
      .thinking-complete-title {
        flex: 1;
        z-index: 10;
      }
      
      .thinking-complete-title h4 {
        margin: 0;
        color: #1f2937;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .thinking-complete-title p {
        margin: 0.25rem 0 0 0;
        color: #6b7280;
        font-size: 0.85rem;
      }
      
      .thinking-complete-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: linear-gradient(135deg, #ffffff, #f8fafc);
        border: 1px solid #e1e7ef;
        border-radius: 8px;
        color: #374151;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 10;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .thinking-complete-toggle:hover {
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        border-color: #cbd5e1;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      
      .thinking-complete-chevron {
        transition: transform 0.3s ease;
      }
      
      .thinking-complete-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s ease-out;
      }
      
      .thinking-complete-content[data-expanded="true"] {
        max-height: 450px;
      }
      
      .thinking-complete-steps {
        max-height: 380px;
        overflow-y: auto;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
        
        /* Enhanced scrollbar styles */
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f8fafc;
      }
      
      .thinking-complete-steps::-webkit-scrollbar {
        width: 8px;
      }
      
      .thinking-complete-steps::-webkit-scrollbar-track {
        background: #f8fafc;
        border-radius: 4px;
      }
      
      .thinking-complete-steps::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #cbd5e1, #94a3b8);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      .thinking-complete-steps::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #94a3b8, #64748b);
      }
      
      /* Enhanced scroll fade effect */
      .thinking-complete-steps::before,
      .thinking-complete-steps::after {
        content: '';
        position: sticky;
        left: 0;
        right: 0;
        height: 12px;
        background: linear-gradient(to bottom, rgba(255,255,255,0.9), transparent);
        pointer-events: none;
        z-index: 5;
      }
      
      .thinking-complete-steps::before {
        top: 0;
        margin-bottom: -12px;
      }
      
      .thinking-complete-steps::after {
        bottom: 0;
        margin-top: -12px;
        background: linear-gradient(to top, rgba(255,255,255,0.9), transparent);
      }
      
      .thinking-step {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        opacity: 0;
        transform: translateX(-20px);
        animation: stepReveal 0.5s ease-out forwards;
        position: relative;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }
      
      .thinking-step:hover {
        transform: translateX(4px) translateY(-2px);
      }
      
      .thinking-step-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        flex-shrink: 0;
      }
      
      .thinking-step-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
        font-weight: 700;
        color: white;
        position: relative;
        z-index: 2;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      .thinking-step-icon-bg {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 50%;
        transition: all 0.3s ease;
        z-index: -1;
      }
      
      .thinking-step-number-display {
        position: relative;
        z-index: 10;
        font-size: 1rem;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
      }
      
      .thinking-step:hover .thinking-step-icon {
        transform: scale(1.1);
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
      }
      
      .thinking-step:hover .thinking-step-number-display {
        transform: scale(1.1);
      }
      
      .thinking-step-line {
        width: 3px;
        height: 40px;
        background: linear-gradient(to bottom, #e1e7ef, transparent);
        margin-top: 8px;
        border-radius: 2px;
        transition: all 0.3s ease;
      }
      
      .thinking-step:hover .thinking-step-line {
        background: linear-gradient(to bottom, #3b82f6, transparent);
        transform: scaleX(1.5);
      }
      
      .thinking-step:last-child .thinking-step-line {
        display: none;
      }
      
      .thinking-step-content {
        flex: 1;
        background: linear-gradient(135deg, #ffffff, #f8fafc);
        border: 1px solid #e1e7ef;
        border-radius: 12px;
        padding: 1.25rem;
        position: relative;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;
      }
      
      .thinking-step:hover .thinking-step-content {
        border-color: #cbd5e1;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }
      
      .thinking-step-start .thinking-step-icon-bg {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      
      .thinking-step:hover.thinking-step-start .thinking-step-icon {
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      }
      
      .thinking-step-continue .thinking-step-icon-bg {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      }
      
      .thinking-step:hover.thinking-step-continue .thinking-step-icon {
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
      }
      
      .thinking-step-end .thinking-step-icon-bg {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      }
      
      .thinking-step:hover.thinking-step-end .thinking-step-icon {
        box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
      }
      
      .thinking-step-question .thinking-step-icon-bg {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }
      
      .thinking-step:hover.thinking-step-question .thinking-step-icon {
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
      }
      
      .thinking-step-reason .thinking-step-icon-bg {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      
      .thinking-step:hover.thinking-step-reason .thinking-step-icon {
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
      }
      
      .thinking-step-text {
        color: #374151;
        font-size: 0.9rem;
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
      }
      
      @keyframes completeAppear {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes pulseRing {
        0% {
          transform: scale(0.8);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.3;
        }
        100% {
          transform: scale(1.6);
          opacity: 0;
        }
      }
      
      @keyframes stepReveal {
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @media (max-width: 768px) {
        .thinking-complete-content[data-expanded="true"] {
          max-height: 350px;
        }
        
        .thinking-complete-steps {
          max-height: 280px;
          padding: 1rem;
          gap: 0.75rem;
        }
        
        .thinking-complete-header {
          padding: 1rem;
        }
        
        .thinking-step-content {
          padding: 1rem;
        }
        
        .thinking-step-icon {
          width: 36px;
          height: 36px;
          font-size: 0.85rem;
        }
      }
    </style>
  `;
}

// Improved preprocessing function - only convert raw URLs when needed
export function preprocessMarkdown(markdown: string, isStreaming: boolean = false): string {
  // If streaming and contains thinking blocks, handle them specially
  if (isStreaming && containsThinkingBlocks(markdown)) {
    // Don't preprocess thinking content during streaming
    return preprocessMarkdownWithThinkingPreservation(markdown);
  }
  
  // First, protect existing markdown links from double processing
  const placeholders: {[key: string]: string} = {};
  let counter = 0;
  
  // Temporarily replace existing markdown links with placeholders
  const withPlaceholders = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
    const placeholder = `__LINK_PLACEHOLDER_${counter}__`;
    placeholders[placeholder] = match;
    counter++;
    return placeholder;
  });
  
  // Protect code blocks from URL processing
  const codeBlockPlaceholders: {[key: string]: string} = {};
  let codeCounter = 0;
  
  const withCodePlaceholders = withPlaceholders.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeCounter}__`;
    codeBlockPlaceholders[placeholder] = match;
    codeCounter++;
    return placeholder;
  });
  
  // Only convert raw URLs to markdown links if they are standalone
  const urlRegex = /(^|\s)((?:https?:\/\/)[^\s<>[\]]+)(?!\)|\w)/gm;
  const withConvertedLinks = withCodePlaceholders.replace(urlRegex, (match, prefix, url) => {
    return `${prefix}[${url}](${url})`;
  });
  
  // Restore code blocks first
  let result = withConvertedLinks;
  Object.keys(codeBlockPlaceholders).forEach(placeholder => {
    result = result.replace(placeholder, codeBlockPlaceholders[placeholder]);
  });
  
  // Then restore markdown links
  Object.keys(placeholders).forEach(placeholder => {
    result = result.replace(placeholder, placeholders[placeholder]);
  });
  
  return result;
}

// Special preprocessing that preserves thinking blocks during streaming
function preprocessMarkdownWithThinkingPreservation(markdown: string): string {
  // Create placeholders for thinking blocks to protect them
  const thinkingPlaceholders: {[key: string]: string} = {};
  let thinkingCounter = 0;
  
  // Temporarily replace thinking blocks with placeholders
  let processedMarkdown = markdown.replace(/<think>[\s\S]*?<\/think>/gi, (match) => {
    const placeholder = `__THINKING_PLACEHOLDER_${thinkingCounter}__`;
    thinkingPlaceholders[placeholder] = match;
    thinkingCounter++;
    return placeholder;
  });
  
  // Also handle incomplete thinking blocks during streaming
  processedMarkdown = processedMarkdown.replace(/<think>[\s\S]*$/gi, (match) => {
    const placeholder = `__THINKING_INCOMPLETE_${thinkingCounter}__`;
    thinkingPlaceholders[placeholder] = match;
    thinkingCounter++;
    return placeholder;
  });
  
  // Apply normal preprocessing to non-thinking content
  processedMarkdown = preprocessMarkdown(processedMarkdown, false);
  
  // Restore thinking blocks
  Object.keys(thinkingPlaceholders).forEach(placeholder => {
    processedMarkdown = processedMarkdown.replace(placeholder, thinkingPlaceholders[placeholder]);
  });
  
  return processedMarkdown;
}

// Initialize copy functionality for code blocks with improved UI
// Make sure to export this function so it can be imported
export function initializeCodeBlockCopyButtons(
  messageId: string, 
  onCopy: (text: string, id: string) => void,
  buttons?: NodeListOf<Element> // Optional: specific buttons to initialize
): void {
  const copyButtons = buttons || document.querySelectorAll('.copy-code-button');
  
  Array.from(copyButtons).forEach((button, index) => {
    if (button instanceof HTMLElement) {
      button.addEventListener('click', () => {
        const code = button.getAttribute('data-code');
        if (code) {
          const decodedCode = decodeURIComponent(code);
          onCopy(decodedCode, `code-${messageId}-${index}`);
          
          // Add copied class for animation
          button.classList.add('copied');
          
          // Reset after delay
          setTimeout(() => {
            button.classList.remove('copied');
          }, 2000);
        }
      });
    }
  });
}

// React component to render processed markdown
interface MarkdownViewProps {
  markdown: string;
  className?: string;
  isStreaming?: boolean;
  messageId?: string; // Add messageId prop
}

export const MarkdownView: React.FC<MarkdownViewProps> = memo(({ 
  markdown, 
  className = '', 
  isStreaming = false, 
  messageId 
}) => {
  // Stable processing with caching
  const output = useMemo(() => {
    const preprocessedMd = preprocessMarkdown(markdown, isStreaming);
    return processMarkdown(preprocessedMd, isStreaming, messageId);
  }, [markdown, isStreaming, messageId]);

  if (typeof output === 'string') {
    return (
      <div
        className={`markdown-content ${className} break-words`}
        dangerouslySetInnerHTML={{ __html: output }}
      />
    );
  }

  // If output is ProcessedBlock[]
  return (
    <div className={`markdown-content ${className} break-words`}>
      {output.map(block => (
        <div
          key={block.id}
          className={`markdown-block type-${block.type} break-words`}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if actual content changes
  return (
    prevProps.markdown === nextProps.markdown &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.className === nextProps.className
  );
});

MarkdownView.displayName = 'MarkdownView';