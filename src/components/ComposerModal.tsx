import { useEffect, useRef, useState } from 'react';
import { X, Eye, PencilLine, Bold, Italic, Code, Quote as QuoteIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CURRENT_USER_ID } from '@/db';
import { createTopic, createReply } from '@/db/mutations';
import { MarkdownBody } from './PostCard';

export type ComposerMode =
  | { kind: 'new-topic' }
  | { kind: 'reply'; topicId: string; initialQuote?: string };

const TOOLBAR_ACTIONS = [
  { id: 'bold', label: 'Bold', icon: Bold, wrap: '**' },
  { id: 'italic', label: 'Italic', icon: Italic, wrap: '*' },
  { id: 'code', label: 'Code block', icon: Code, wrap: '```\n\n```' },
  { id: 'quote', label: 'Quote', icon: QuoteIcon, prefix: '> ' },
] as const;

function draftKey(mode: ComposerMode): string {
  return mode.kind === 'new-topic' ? 'draft_new_topic' : `draft_reply_${mode.topicId}`;
}

function baseContent(mode: ComposerMode): string {
  return mode.kind === 'reply' ? (mode.initialQuote ?? '') : '';
}

export default function ComposerModal({
  mode,
  onClose,
  onCreated,
}: {
  mode: ComposerMode;
  onClose: () => void;
  onCreated?: (topicId?: string) => void;
}) {
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const replyTopic = useLiveQuery(
    () => (mode.kind === 'reply' ? db.topics.get(mode.topicId) : undefined),
    [mode]
  );

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(() => baseContent(mode));
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const cached = localStorage.getItem(draftKey(mode));
    if (cached) {
      setContent(cached);
    } else {
      setContent(baseContent(mode));
    }
    const firstCategory = categories[0]?.id;
    if (firstCategory) setCategoryId(firstCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.kind, mode.kind === 'reply' ? mode.topicId : 'new', categories.length]);

  useEffect(() => {
    textRef.current?.focus();
  }, [showPreview]);

  const saveDraft = (value: string) => {
    setContent(value);
    localStorage.setItem(draftKey(mode), value);
  };

  const canSubmit =
    !submitting &&
    (mode.kind === 'new-topic'
      ? title.trim() !== '' && content.trim() !== '' && categoryId !== ''
      : content.trim() !== '');

  const applyToolbar = (action: (typeof TOOLBAR_ACTIONS)[number]) => {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    let next: string;
    let caret: number;
    if ('prefix' in action) {
      next = content.slice(0, start) + action.prefix + selected + content.slice(end);
      caret = start + action.prefix.length + selected.length;
    } else {
      const [open, close = ''] = action.wrap.split('\n\n');
      next =
        content.slice(0, start) + open + selected + close + content.slice(end);
      caret = start + open.length + selected.length;
    }
    saveDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode.kind === 'new-topic') {
        const topicId = await createTopic({
          categoryId,
          title: title.trim(),
          content,
          authorId: CURRENT_USER_ID,
        });
        localStorage.removeItem(draftKey(mode));
        onCreated?.(topicId);
      } else {
        await createReply({
          topicId: mode.topicId,
          content,
          authorId: CURRENT_USER_ID,
        });
        localStorage.removeItem(draftKey(mode));
        onCreated?.();
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col bg-slate-950 text-slate-100">
      <div className="flex h-14 items-center gap-2 border-b border-white/5 px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full text-slate-400 transition-opacity duration-150 active:opacity-75"
          aria-label="Close composer"
        >
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {mode.kind === 'new-topic' ? 'New Topic' : 'Reply'}
          </h2>
          {mode.kind === 'reply' && replyTopic && (
            <p className="truncate text-xs text-slate-500">
              Replying to: {replyTopic.title}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mr-2 shrink-0 select-none rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-opacity duration-150 active:scale-95 disabled:opacity-40"
        >
          Post
        </button>
      </div>

      {mode.kind === 'new-topic' && (
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-9 rounded-lg bg-slate-900 px-2 text-sm text-slate-200 ring-1 ring-white/10 outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Topic title..."
            className="h-9 min-w-0 flex-1 rounded-lg bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-white/10 outline-none focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto">
        {showPreview ? (
          <div className="p-4">
            {content.trim() ? (
              <MarkdownBody content={content} />
            ) : (
              <p className="text-sm text-slate-500">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textRef}
            value={content}
            onChange={(e) => saveDraft(e.target.value)}
            placeholder={
              mode.kind === 'new-topic'
                ? 'Share your thoughts... Markdown supported'
                : 'Write your reply... Markdown supported'
            }
            className="h-full min-h-[120px] w-full resize-none bg-transparent p-4 text-base leading-relaxed outline-none placeholder:text-slate-500"
          />
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-white/5 bg-slate-900/60 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1.5 backdrop-blur-sm">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => applyToolbar(action)}
            className="flex h-11 w-11 select-none items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 active:bg-slate-850"
            aria-label={action.label}
          >
            <action.icon size={18} />
          </button>
        ))}
        <div className="ml-auto flex rounded-lg bg-slate-850 p-0.5">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
              !showPreview ? 'bg-slate-700 text-white' : 'text-slate-400'
            }`}
            aria-label="Write"
          >
            <PencilLine size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
              showPreview ? 'bg-slate-700 text-white' : 'text-slate-400'
            }`}
            aria-label="Preview"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
