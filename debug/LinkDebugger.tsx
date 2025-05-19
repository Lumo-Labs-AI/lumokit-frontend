import React, { useEffect } from 'react';

export function debugMarkdownLinks() {
  useEffect(() => {
    // Add this to your page for debugging
    const debugLinks = () => {
      console.log('Debugging all markdown links on page...');
      const links = document.querySelectorAll('.ai-markdown a');
      
      links.forEach((link, i) => {
        console.log(`Link ${i}:`, {
          element: link,
          href: link.getAttribute('href'),
          text: link.textContent,
          classes: link.className,
          html: link.outerHTML
        });
        
        // Try to fix broken links
        if (link instanceof HTMLAnchorElement && !link.getAttribute('href')) {
          // If text content looks like a URL, use it as href
          const text = link.textContent?.trim();
          if (text && (text.includes('.') || text.startsWith('http'))) {
            const url = text.startsWith('http') ? text : `https://${text}`;
            console.log(`Fixing link ${i}: ${text} -> ${url}`);
            link.href = url;
            link.setAttribute('target', '_blank');
          }
        }
      });
    };
    
    // Run debug after page loads
    setTimeout(debugLinks, 1000);
  }, []);
  
  return null;
}

// Add this component to your chat page for temporary debugging
export const LinkDebuggerComponent: React.FC = () => {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasLinks = addedNodes.some((node) => 
            node instanceof HTMLElement && node.querySelector('a')
          );
          
          if (hasLinks) {
            console.log('Links detected in DOM change, debugging...');
            const links = document.querySelectorAll('a');
            links.forEach((link, i) => {
              // Log and fix any broken links
              if (!link.getAttribute('href') && link.className.includes('external')) {
                console.warn('Found broken link:', link);
                // Try to auto-fix
                const text = link.textContent?.trim();
                if (text && (text.includes('.') || text.startsWith('http'))) {
                  const url = text.startsWith('http') ? text : `https://${text}`;
                  console.log(`Auto-fixing: ${text} -> ${url}`);
                  link.setAttribute('href', url);
                  link.setAttribute('target', '_blank');
                }
              }
            });
          }
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);
  
  return null;
};
