import { Fragment, type ReactNode } from 'react';
import { Clock, Heart, Quote, Share2 } from 'lucide-react';
import Avatar from './Avatar';
import { formatRelativeTime } from '@/lib/time';
import type { User } from '@/db';

/* --- Lightweight markdown rendering (React nodes, no HTML injection) --- */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on **bold**, *italic*, and `code` without crossing segment boundaries.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[0.85em] text-sky-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function MarkdownBody({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const lines = content.split('\n');
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      blocks.push(
        <pre
          key={blockKey++}
          className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-200 ring-1 ring-white/5"
        >
          <code className="font-mono">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (line.trimStart().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quoteLines.push(lines[i].trimStart().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={blockKey++}
          className="my-2 border-l-2 border-indigo-500 pl-3 italic text-slate-300"
        >
          {renderInline(quoteLines.join(' '), `q${blockKey}`)}
        </blockquote>
      );
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph: consecutive non-empty, non-special lines.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trimStart().startsWith('>')
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={blockKey++} className="my-1.5 whitespace-pre-wrap leading-relaxed">
        {renderInline(paraLines.join('\n'), `p${blockKey}`)}
      </p>
    );
  }

  return <div className="text-sm text-slate-200">{blocks}</div>;
}

/* --- Card --- */

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Admin',
  moderator: 'Mod',
  member: 'Member',
};

export default function PostCard({
  authorName,
  username,
  role,
  createdAt,
  syncStatus,
  content,
  isOriginalPost,
  likes,
  onLike,
  onQuote,
  onShare,
}: {
  authorName: string;
  username: string;
  role: User['role'];
  createdAt: number;
  syncStatus: 'synced' | 'pending';
  content: string;
  isOriginalPost?: boolean;
  likes: number;
  onLike: () => void;
  onQuote: () => void;
  onShare: () => void;
}) {
  return (
    <article className={`px-4 py-3 ${isOriginalPost ? 'bg-slate-900/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={authorName} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-100">
                {authorName}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                  role === 'admin'
                    ? 'bg-rose-400/10 text-rose-300'
                    : role === 'moderator'
                      ? 'bg-sky-400/10 text-sky-300'
                      : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {ROLE_LABELS[role]}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">@{username}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] text-slate-500">
          {syncStatus === 'pending' && <Clock size={12} className="text-amber-400" />}
          <span>{formatRelativeTime(createdAt)}</span>
        </div>
      </div>

      <div className="mt-2.5">
        <MarkdownBody content={content} />
      </div>

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onQuote}
          className="flex h-11 min-w-[44px] select-none items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-opacity duration-150 active:opacity-75"
        >
          <Quote size={14} />
          Quote
        </button>
        <button
          type="button"
          onClick={onLike}
          className="flex h-11 min-w-[44px] select-none items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-opacity duration-150 active:opacity-75"
        >
          <Heart size={14} />
          {likes > 0 && <span>{likes}</span>}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="ml-auto flex h-11 min-w-[44px] select-none items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-opacity duration-150 active:opacity-75"
        >
          <Share2 size={14} />
        </button>
      </div>
    </article>
  );
}
