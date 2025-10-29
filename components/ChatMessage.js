import { motion } from "framer-motion";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Lightweight Markdown renderer: headings, lists, tables, code, blockquotes
function renderMarkdown(md) {
  if (typeof md !== "string") return md;

  // Normalize Windows line endings and trim excessive blank lines
  md = md
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = md.split(/\n/);
  const out = [];
  let i = 0;

  // helpers
  const push = (el) => out.push(el);
  const renderInline = (text) => {
    if (typeof text !== "string") return text;
    // Escapes are intentionally omitted due to controlled source
    let html = text
      // bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // italic *text*
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // inline code `code`
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1 py-0.5 rounded bg-muted font-mono text-[0.9em]">$1</code>'
      );
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const renderList = (items, ordered) =>
    ordered ? (
      <ol className="list-decimal ml-5 space-y-1">
        {items.map((it, idx) => (
          <li key={idx}>{renderInline(it)}</li>
        ))}
      </ol>
    ) : (
      <ul className="list-disc ml-5 space-y-1">
        {items.map((it, idx) => (
          <li key={idx}>{renderInline(it)}</li>
        ))}
      </ul>
    );

  const renderTable = (headerLine, alignLine, rowLines) => {
    const headers = headerLine
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const aligns = (alignLine || "")
      .split("|")
      .map((s) =>
        s.includes(":-") && s.includes("-:")
          ? "center"
          : s.startsWith(":-")
          ? "left"
          : s.endsWith("-:")
          ? "right"
          : "left"
      );
    const rows = rowLines.map((r) =>
      r
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b px-3 py-2 text-left font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rIdx) => (
              <tr key={rIdx} className="border-b last:border-b-0">
                {cells.map((c, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 align-top">
                    {renderInline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // headings #, ##, ###
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      push(
        <div
          key={`h-${i}`}
          className={cn(
            "font-semibold mt-3 mb-2",
            level === 1 ? "text-xl" : level === 2 ? "text-lg" : "text-base"
          )}
        >
          {renderInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // blockquote
    if (/^>\s+/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s+/, ""));
        i++;
      }
      push(
        <blockquote
          key={`q-${i}`}
          className="border-l-4 border-primary/40 pl-3 italic text-muted-foreground my-3"
        >
          {quoteLines.map((ql, idx) => (
            <p key={idx} className="mb-1 last:mb-0">
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // code block ```
    if (/^```/.test(line)) {
      const lang = line.replace(/^```\s*/, "").trim();
      const code = [];
      i++;
      while (i < lines.length && !/^```$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      push(
        <pre
          key={`pre-${i}`}
          className="bg-neutral-900/70 border border-border/50 rounded p-3 overflow-x-auto text-xs"
        >
          <code className="font-mono whitespace-pre">{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // table header |a|b|
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?[-]+:?\s*(\|\s*:?[-]+:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      const header = line.replace(/^\||\|$/g, "");
      const align = lines[i + 1].replace(/^\||\|$/g, "");
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].replace(/^\||\|$/g, ""));
        i++;
      }
      push(renderTable(header, align, rows));
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      push(renderList(items, true));
      continue;
    }

    // unordered list
    if (/^[\-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-*•]\s+/, ""));
        i++;
      }
      push(renderList(items, false));
      continue;
    }

    // empty line
    if (!line.trim()) {
      push(<div key={`sp-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // paragraph
    push(
      <p key={`p-${i}`} className="">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return out;
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className="max-w-3xl">
        <div
          className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
        >
          <Card
            className={cn(
              "transition-all duration-200",
              isUser && "bg-primary text-primary-foreground border-primary/20",
              isAssistant &&
                "bg-neutral-800 border-border/50 hover:border-border prose prose-sm max-w-none dark:prose-invert",
              isSystem && "bg-muted/50 text-muted-foreground border-muted"
            )}
          >
            <CardContent
              className={cn("py-2 px-4", isSystem && "text-center italic")}
            >
              <div className={cn("text-sm leading-relaxed space-y-1.5")}>
                {isAssistant
                  ? renderMarkdown(message.content)
                  : renderMarkdown(String(message.content || ""))}
              </div>

              {message.exerciseImages && message.exerciseImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.exerciseImages.map((image, index) => (
                    <Card key={index} className="w-20 h-20 overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image
                          src={image.url}
                          alt={image.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                          {image.name}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground mt-2 px-1">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
