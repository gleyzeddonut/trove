// Renders a repo's real README markdown faithfully (GFM tables, lists, code,
// links, images) — including the inline HTML many READMEs use (centered logos,
// badge rows, <picture> dark/light logos). That HTML is parsed by rehype-raw
// and then run through rehype-sanitize, which strips scripts, on* handlers and
// javascript: URLs — so there's no XSS path into the Electron shell bridges.
// Relative links/images are resolved against the repo so they actually load;
// code blocks get a working copy button; links route smartly (see the `a` below).

import { createElement, useMemo, useState, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { C, mono, TABBAR_H } from '../tokens';
import { githubRoute, openExternal } from '../lib/external';
import { collectYouTubeRefs, youtubeRef } from '../lib/youtube';
import { useTroveStore } from '../store/useTroveStore';

// Flatten a heading's children to plain text so we can slug it.
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

// GitHub-style heading slug (matches github-slugger closely enough for the
// in-page table-of-contents links READMEs put at the top).
function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-');
}

// Sanitize schema for the raw HTML many READMEs use (centered logos, badge
// rows, <picture> dark/light logos). Extends rehype-sanitize's GitHub-based
// default — which already strips <script>, on* handlers and javascript: URLs —
// to also permit <picture>/<source> and presentational align/size attributes.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'picture', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'align'],
    img: [...(defaultSchema.attributes?.img ?? []), 'align', 'width', 'height'],
    source: ['srcSet', 'srcset', 'media', 'type', 'sizes', 'width', 'height'],
  },
};

// Give headings ids so README anchor/TOC links have something to jump to —
// while forwarding the element's other props (e.g. align="center" on a logo
// heading) so centering etc. survives. `node` is react-markdown-internal; drop it.
const heading = (level: number) =>
  function H({ node, children, ...rest }: ComponentPropsWithoutRef<'h2'> & { node?: unknown }) {
    void node;
    return createElement(`h${level}`, { ...rest, id: slugify(textOf(children)) }, children);
  };

function makeUrlTransform(owner: string, repo: string, branch: string) {
  return (url: string, key: string): string => {
    if (!url) return url;
    if (/^(https?:|mailto:|data:)/i.test(url) || url.startsWith('#')) return url;
    const path = url.replace(/^\.?\//, '').replace(/^\//, '');
    // Image sources must hit the raw host (blob URLs return an HTML page);
    // links go to the rendered file on github.com.
    return key === 'src'
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
      : `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
  };
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  const dot = { width: 9, height: 9, borderRadius: 9, background: '#3A4150' } as const;
  return (
    <div style={{ background: '#0B0D11', border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', margin: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderBottom: '1px solid #1C2230' }}>
        <span style={{ display: 'flex', gap: 5 }}>
          <span style={dot} />
          <span style={dot} />
          <span style={dot} />
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={copy}
          className="hc-tabtn"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: mono, fontSize: 11, color: copied ? C.green : '#6E7681' }}
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '13px 15px', fontFamily: mono, fontSize: 12.5, lineHeight: 1.7, color: '#E7EAEF', overflowX: 'auto', whiteSpace: 'pre' }}>
        {code}
      </pre>
    </div>
  );
}

export function Markdown({ md, owner, repo, branch }: { md: string; owner: string; repo: string; branch: string }) {
  const navigate = useNavigate();
  const playVideo = useTroveStore((s) => s.playVideo);
  const openTab = useTroveStore((s) => s.openTab);
  const hasWebview = typeof window !== 'undefined' && !!window.troveTerminal;
  // Every YouTube link on this page becomes the dock's "Up next" queue.
  const videoQueue = useMemo(() => collectYouTubeRefs(md), [md]);
  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a({ href, children }) {
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            if (!href) return;
            // In-page anchor (table of contents) → scroll to the heading,
            // offset for the fixed tab strip + nav.
            if (href.startsWith('#')) {
              const el = document.getElementById(decodeURIComponent(href.slice(1)));
              if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - (TABBAR_H + 72);
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
              return;
            }
            // GitHub repo/user links → native Trove pages; YouTube → the dock's
            // video player; everything else → a new browser tab (or the OS
            // browser when running outside the desktop app, where there's no
            // <webview>).
            const route = githubRoute(href);
            if (route) return navigate(route);
            const yt = youtubeRef(href);
            if (yt) return playVideo(yt, videoQueue);
            if (hasWebview && /^https?:/i.test(href)) return openTab(href);
            openExternal(href);
          }}
        >
          {children}
        </a>
      );
    },
    // Pass-through pre so block code is rendered solely by our CodeBlock.
    pre({ children }) {
      return <>{children}</>;
    },
    code({ className, children }) {
      const text = String(children ?? '').replace(/\n$/, '');
      const isBlock = /language-/.test(className || '') || text.includes('\n');
      return isBlock ? <CodeBlock code={text} /> : <code>{children}</code>;
    },
  };

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // rehype-raw parses the README's inline HTML; rehype-sanitize then
        // strips anything unsafe (scripts, event handlers, javascript: URLs) so
        // it can't reach the shell bridges. Order matters: raw → sanitize.
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        urlTransform={makeUrlTransform(owner, repo, branch)}
        components={components}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
