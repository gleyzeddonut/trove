// Renders a repo's real README markdown faithfully (GFM tables, lists, code,
// links, images). Safe by default: react-markdown does not render raw HTML, so
// there's no XSS path into the Electron bridges. Relative links/images are
// resolved against the repo so they actually load; code blocks get a working
// copy button; external links open in the OS browser.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { C, mono } from '../tokens';
import { githubRoute, openExternal } from '../lib/external';
import { youtubeRef } from '../lib/youtube';
import { useTroveStore } from '../store/useTroveStore';

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
  const components: Components = {
    a({ href, children }) {
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            if (!href || href.startsWith('#')) return; // ignore in-page anchors
            // GitHub repo/user links → native Trove pages; YouTube → side
            // mini-player; everything else → the OS browser.
            const route = githubRoute(href);
            if (route) return navigate(route);
            const yt = youtubeRef(href);
            if (yt) return playVideo(yt);
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={makeUrlTransform(owner, repo, branch)} components={components}>
        {md}
      </ReactMarkdown>
    </div>
  );
}
