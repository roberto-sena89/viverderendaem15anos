/**
 * SECURITY: Message component with XSS protection
 * - HTML sanitization with DOMPurify
 * - Markdown rendering with marked
 * - URL validation
 */

import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// ✅ Configure DOMPurify with strict whitelist
DOMPurify.setConfig({
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "code", "pre", "blockquote", "a", "img", "table",
    "thead", "tbody", "tr", "th", "td"
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
  KEEP_CONTENT: true,
  FORCE_BODY: false,
  // Remove event handlers
  ALLOW_DATA_ATTR: false,
});

/**
 * Escape HTML for safe text rendering
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

interface MessageDisplayProps {
  content: string;
  isUser: boolean;
}

/**
 * Safe message renderer with XSS protection
 */
export const MessageDisplay: React.FC<MessageDisplayProps> = ({ content }) => {
  // ✅ Memoize sanitized HTML to prevent recalculation
  const safeHtml = useMemo(() => {
    try {
      // 1. Parse markdown
      const html = marked.parse(content, { breaks: true, async: false }) as string;

      // 2. Sanitize HTML with DOMPurify
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4", "h5", "h6",
          "ul", "ol", "li", "code", "pre", "blockquote", "a", "img", "table",
          "thead", "tbody", "tr", "th", "td"
        ],
        ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
      });

      return sanitized;
    } catch (error) {
      console.error("[Security] Content parsing failed", { error });
      // ✅ Fallback: render as plain text
      return `<p>${escapeHtml(content)}</p>`;
    }
  }, [content]);

  return (
    <div
      className="prose prose-sm max-w-none text-sm"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};

export default MessageDisplay;
