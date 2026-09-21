import { Fragment, type ReactNode } from "react";

/**
 * Small, dependency-free Markdown renderer for AION answers.
 *
 * Builds React elements only (no innerHTML), so model output can never inject
 * markup or script. Covers what the models actually emit: headings, bold,
 * italic, inline code, fenced code, ordered/unordered lists, block quotes,
 * links, images and horizontal rules. Anything else stays plain text.
 */

const SAFE_URL = /^(https?:\/\/|mailto:|\/)/i;

function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  return SAFE_URL.test(trimmed) ? trimmed : null;
}

// Order matters: code first so its contents are never parsed as emphasis.
const INLINE = /(`[^`\n]+`)|(!\[([^\]]*)\]\(([^)\s]+)\))|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*\n]+)\*\*)|(__([^_\n]+)__)|(\*([^*\n]+)\*)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyBase}-${index++}`;
    if (match[1]) {
      out.push(<code key={key} className="md-code-inline">{match[1].slice(1, -1)}</code>);
    } else if (match[2]) {
      const src = safeUrl(match[4]);
      out.push(src
        ? <a key={key} href={src} target="_blank" rel="noreferrer" className="md-image-link"><img src={src} alt={match[3] || "görsel"} className="md-image" loading="lazy" /></a>
        : match[0]);
    } else if (match[5]) {
      const href = safeUrl(match[7]);
      out.push(href
        ? <a key={key} href={href} target="_blank" rel="noreferrer" className="md-link">{renderInline(match[6], key)}</a>
        : match[6]);
    } else if (match[8] || match[10]) {
      out.push(<strong key={key}>{renderInline(match[9] ?? match[11], key)}</strong>);
    } else if (match[12]) {
      out.push(<em key={key}>{renderInline(match[13], key)}</em>);
    } else if (match[14]) {
      const href = match[14];
      // A bare image URL (our own generated post images) is shown as an image.
      out.push(/\.(png|jpe?g|webp|gif)$/i.test(href)
        ? <a key={key} href={href} target="_blank" rel="noreferrer" className="md-image-link"><img src={href} alt="görsel" className="md-image" loading="lazy" /></a>
        : <a key={key} href={href} target="_blank" rel="noreferrer" className="md-link">{href}</a>);
    }
    last = start + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; level: number; text: string }
  | { kind: "code"; lang: string; text: string }
  | { kind: "ul" | "ol"; items: string[]; start: number }
  | { kind: "quote"; lines: string[] }
  | { kind: "hr" };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      i += 1; // closing fence (or end of text)
      blocks.push({ kind: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    if (!line.trim()) { i += 1; continue; }
    const heading = line.match(/^\s*(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ kind: "hr" }); i += 1; continue; }
    const bullet = /^\s*[-*•]\s+(.*)$/;
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/;
    if (bullet.test(line) || ordered.test(line)) {
      const isOrdered = !bullet.test(line);
      const start = isOrdered ? Number(line.match(ordered)?.[1] ?? 1) : 1;
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const m = isOrdered ? current.match(ordered) : current.match(bullet);
        if (m) { items.push(isOrdered ? m[2] : m[1]); i += 1; continue; }
        // Indented continuation of the previous item.
        if (current.trim() && /^\s{2,}/.test(current) && items.length) { items[items.length - 1] += ` ${current.trim()}`; i += 1; continue; }
        break;
      }
      blocks.push({ kind: isOrdered ? "ol" : "ul", items, start });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ kind: "quote", lines: quote });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim()
      && !/^\s*```/.test(lines[i]) && !/^\s*#{1,4}\s/.test(lines[i])
      && !bullet.test(lines[i]) && !ordered.test(lines[i]) && !/^\s*>/.test(lines[i])
    ) para.push(lines[i++]);
    blocks.push({ kind: "p", lines: para });
  }
  return blocks;
}

export function Markdown({ text, className = "md" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const key = `b${bi}`;
        switch (block.kind) {
          case "h": {
            const Tag = (["h3", "h3", "h4", "h5"][block.level - 1] ?? "h5") as "h3" | "h4" | "h5";
            return <Tag key={key} className="md-heading">{renderInline(block.text, key)}</Tag>;
          }
          case "code":
            return (
              <pre key={key} className="md-code-block" data-lang={block.lang || undefined}>
                <code>{block.text}</code>
              </pre>
            );
          case "ul":
            return <ul key={key} className="md-list">{block.items.map((item, ii) => <li key={ii}>{renderInline(item, `${key}-${ii}`)}</li>)}</ul>;
          case "ol":
            return <ol key={key} className="md-list" start={block.start}>{block.items.map((item, ii) => <li key={ii}>{renderInline(item, `${key}-${ii}`)}</li>)}</ol>;
          case "quote":
            return <blockquote key={key} className="md-quote">{block.lines.map((l, li) => <Fragment key={li}>{li > 0 ? <br /> : null}{renderInline(l, `${key}-${li}`)}</Fragment>)}</blockquote>;
          case "hr":
            return <hr key={key} className="md-hr" />;
          default:
            return (
              <p key={key}>
                {block.lines.map((l, li) => <Fragment key={li}>{li > 0 ? <br /> : null}{renderInline(l, `${key}-${li}`)}</Fragment>)}
              </p>
            );
        }
      })}
    </div>
  );
}

/** Plain text for speech: strips Markdown syntax so TTS does not read symbols. */
export function markdownToSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[`*_#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
