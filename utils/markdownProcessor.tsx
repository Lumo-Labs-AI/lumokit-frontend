import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';


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

// Function to process markdown text to HTML
export function processMarkdown(markdown: string): string {
  // Configure marked with custom renderer
  marked.use({ renderer: customRenderer });
  
  // Set options for code highlighting and other features
  marked.setOptions({
    gfm: true,
    breaks: true,
    smartypants: true,
    langPrefix: 'language-',
    highlight: function(code, lang) {
      // Use auto-detection if language is not specified
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  });
  
  // Parse markdown to HTML
  let html = marked.parse(markdown);
  
  // Make sure to retain target="_blank" attribute by configuring DOMPurify properly
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
      
      // Ensure href is preserved
      if (!href && node.hasAttribute('data-original-href')) {
        node.setAttribute('href', node.getAttribute('data-original-href') || '');
      }
      
      // Set target="_blank" for external links
      if (href && (href.startsWith('http') || href.startsWith('https'))) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
  
  // Extra protection for links before sanitizing
  html = html.replace(/<a([^>]*)>/g, (match, attributes) => {
    // Extract href if present to preserve it
    const hrefMatch = attributes.match(/href=['"]([^'"]+)['"]/);
    const href = hrefMatch ? hrefMatch[1] : '';
    
    // Add data attribute to preserve the original href
    if (href) {
      return `<a${attributes} data-original-href="${href}">`;
    }
    return match;
  });
  
  // Sanitize HTML with our enhanced configuration
  html = DOMPurify.sanitize(html, purifyConfig);
  
  // Handle special embedded content
  html = processEmbeddedContent(html);
  
  return html;
}

// Process special embedded content like diagrams or math
function processEmbeddedContent(html: string): string {
  // Process math expressions (KaTeX style notation)
  html = html.replace(/\$\$(.*?)\$\$/g, '<div class="math-block">$1</div>');
  html = html.replace(/\$(.*?)\$/g, '<span class="math-inline">$1</span>');
  
  // Process diagrams (mermaid syntax)
  const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;
  html = html.replace(mermaidRegex, '<div class="mermaid-diagram">$1</div>');
  
  return html;
}

// React component to render processed markdown
interface MarkdownViewProps {
  markdown: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ markdown, className = '' }) => {
  // Use our improved preprocessing function
  const processedMarkdown = preprocessMarkdown(markdown);
  
  // Process the markdown to HTML
  const processedHtml = processMarkdown(processedMarkdown);
  
  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }} 
    />
  );
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
  ];
  
  // Test against each pattern
  return markdownPatterns.some(pattern => pattern.test(text));
}

// Improved preprocessing function - only convert raw URLs when needed
export function preprocessMarkdown(markdown: string): string {
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

// Initialize copy functionality for code blocks with improved UI
// Make sure to export this function so it can be imported
export function initializeCodeBlockCopyButtons(messageId: string, onCopy: (text: string, id: string) => void): void {
  const copyButtons = document.querySelectorAll('.copy-code-button');
  
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