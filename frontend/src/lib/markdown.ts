/**
 * Full-featured Markdown to HTML Converter for LLM Outputs
 * Handles headers, tables, lists (ordered/unordered), blockquotes, code blocks, inline code, bold, italic, links, and hr rules.
 */
export function parseMarkdown(md: string): string {
  if (!md) return "";

  // Helper to escape HTML characters in code blocks
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Protect code blocks first
  const codeBlocks: string[] = [];
  let processed = md.replace(/```([\s\S]*?)```/g, (_, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${idx}__`;
  });

  const lines = processed.split("\n");
  const htmlLines: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Check code block placeholder
    if (trimmed.startsWith("__CODE_BLOCK_")) {
      if (inList) { htmlLines.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; listType = null; }
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      const idx = parseInt(trimmed.replace("__CODE_BLOCK_", "").replace("__", ""), 10);
      htmlLines.push(codeBlocks[idx] || "");
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      if (inList) { htmlLines.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; listType = null; }
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      htmlLines.push("<hr />");
      continue;
    }

    // Headers (# H1, ## H2, ### H3, #### H4)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (inList) { htmlLines.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; listType = null; }
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      const level = headerMatch[1].length;
      const title = formatInline(headerMatch[2]);
      htmlLines.push(`<h${level}>${title}</h${level}>`);
      continue;
    }

    // Blockquote (> Quote)
    if (trimmed.startsWith("> ")) {
      if (inList) { htmlLines.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; listType = null; }
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      const content = formatInline(trimmed.slice(2));
      htmlLines.push(`<blockquote>${content}</blockquote>`);
      continue;
    }

    // Markdown Table (| Col 1 | Col 2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (inList) { htmlLines.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; listType = null; }
      
      // Skip separator row (| --- | --- |)
      if (/^\|[\s-:]+(\|[\s-:]+)+\|$/.test(trimmed)) {
        continue;
      }

      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => formatInline(c.trim()));

      if (!inTable) {
        inTable = true;
        htmlLines.push("<table><thead><tr>");
        cells.forEach((cell) => htmlLines.push(`<th>${cell}</th>`));
        htmlLines.push("</tr></thead><tbody>");
      } else {
        htmlLines.push("<tr>");
        cells.forEach((cell) => htmlLines.push(`<td>${cell}</td>`));
        htmlLines.push("</tr>");
      }
      continue;
    } else if (inTable) {
      htmlLines.push("</tbody></table>");
      inTable = false;
    }

    // Unordered List (- item or * item)
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      if (!inList || listType !== "ul") {
        if (inList) htmlLines.push(listType === "ul" ? "</ul>" : "</ol>");
        htmlLines.push("<ul>");
        inList = true;
        listType = "ul";
      }
      htmlLines.push(`<li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered List (1. item)
    const olMatch = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      if (!inList || listType !== "ol") {
        if (inList) htmlLines.push(listType === "ul" ? "</ul>" : "</ol>");
        htmlLines.push("<ol>");
        inList = true;
        listType = "ol";
      }
      htmlLines.push(`<li>${formatInline(olMatch[2])}</li>`);
      continue;
    }

    // Close list if line is empty
    if (inList && trimmed === "") {
      htmlLines.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
      listType = null;
      continue;
    }

    // Normal Text Paragraphs
    if (trimmed !== "") {
      htmlLines.push(`<p>${formatInline(line)}</p>`);
    }
  }

  // Close open tags
  if (inList) htmlLines.push(listType === "ul" ? "</ul>" : "</ol>");
  if (inTable) htmlLines.push("</tbody></table>");

  return htmlLines.join("\n");
}

function formatInline(str: string): string {
  return str
    .replace(/(\*\*\*|___)(.*?)\1/g, "<strong><em>$2</em></strong>")
    .replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>")
    .replace(/(\*|_)(.*?)\1/g, "<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
