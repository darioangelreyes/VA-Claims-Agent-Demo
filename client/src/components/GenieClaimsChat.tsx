import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { fetchClaimsApi } from '@/lib/claimsApi';

/** Try to get table rows and column names from an attachment (e.g. query_result_metadata or rows). */
function attachmentTableData(a: unknown): { columns: string[]; rows: unknown[][] } | null {
  if (a == null) return null;
  const o = a as Record<string, unknown>;
  const meta = o.query_result_metadata as Record<string, unknown> | undefined;
  let rows = o.rows as unknown[] | undefined;
  if (!Array.isArray(rows)) rows = o.data as unknown[] | undefined;
  if (Array.isArray(rows) && rows.length > 0) {
    const first = rows[0];
    const columns =
      typeof first === 'object' && first !== null && !Array.isArray(first)
        ? Object.keys(first as Record<string, unknown>)
        : (meta?.columns as string[] | undefined) ?? [];
    const rowArrays = rows.map((r) =>
      typeof r === 'object' && r !== null && !Array.isArray(r)
        ? Object.values(r as Record<string, unknown>)
        : Array.isArray(r)
          ? r
          : [r],
    );
    if (columns.length || rowArrays.some((arr) => arr.length > 0))
      return {
        columns: columns.length ? columns : rowArrays[0]?.map((_, i) => `col_${i}`) ?? [],
        rows: rowArrays,
      };
  }
  const cols = meta?.columns as string[] | undefined;
  if (Array.isArray(cols) && cols.length) return { columns: cols, rows: [] };
  return null;
}

function attachmentSourceTag(a: unknown): string | null {
  if (a == null) return null;
  const o = a as Record<string, unknown>;
  const d = o.description;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && typeof d[0] === 'string') return d[0];
  const id = o.identifier ?? o.table_identifier;
  if (typeof id === 'string') return id;
  return null;
}

type ChatMessage =
  | { role: 'user'; content: string }
  | {
      role: 'genie';
      content: string;
      attachments?: Array<{ text?: string; query?: string; content?: string }>;
      error?: string;
    };

function attachmentDisplayText(a: unknown): string | null {
  if (a == null) return null;
  const o = a as Record<string, unknown>;
  const t = o.text ?? o.content ?? o.description;
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string').join('\n').trim() || null;
  if (t && typeof t === 'object') {
    const inner = (t as Record<string, unknown>).content ?? (t as Record<string, unknown>).text;
    if (typeof inner === 'string') return inner;
    if (Array.isArray(inner))
      return inner.filter((x): x is string => typeof x === 'string').join('\n').trim() || null;
  }
  return null;
}

function attachmentQueryString(a: unknown): string | null {
  if (a == null) return null;
  const obj = a as Record<string, unknown>;
  const q = obj.query;
  if (typeof q === 'string') return q;
  if (q && typeof q === 'object') {
    const qo = q as Record<string, unknown>;
    if (typeof qo.query === 'string') return qo.query;
    if (typeof qo.sql === 'string') return qo.sql;
  }
  if (typeof obj.sql === 'string') return obj.sql;
  return null;
}

function queryDescriptionFromAttachments(attachments: unknown[] | undefined): string | null {
  if (!attachments?.length) return null;
  for (const a of attachments) {
    const o = a as Record<string, unknown>;
    const q = o.query;
    if (q && typeof q === 'object') {
      const d = (q as Record<string, unknown>).description;
      if (typeof d === 'string') return d;
    }
  }
  return null;
}

function mainTextFromAttachments(attachments: unknown[] | undefined): string {
  if (!attachments?.length) return '';
  const parts: string[] = [];
  for (const a of attachments) {
    const o = a as Record<string, unknown>;
    const t = o.text;
    if (t && typeof t === 'object' && t !== null) {
      const c = (t as Record<string, unknown>).content;
      if (typeof c === 'string') parts.push(c);
    }
  }
  return parts.join('\n\n');
}

function suggestedQuestionsFromAttachments(attachments: unknown[] | undefined): string[] {
  if (!attachments?.length) return [];
  for (const a of attachments) {
    const o = a as Record<string, unknown>;
    const sq = o.suggested_questions;
    if (sq && typeof sq === 'object') {
      const qs = (sq as Record<string, unknown>).questions;
      if (Array.isArray(qs)) return qs.filter((x): x is string => typeof x === 'string');
    }
  }
  return [];
}

function textWithBold(str: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = str;
  let key = 0;
  while (remaining.length > 0) {
    const i = remaining.indexOf('**');
    if (i === -1) {
      parts.push(<span key={key}>{remaining}</span>);
      break;
    }
    if (i > 0) parts.push(<span key={key}>{remaining.slice(0, i)}</span>);
    key += 1;
    remaining = remaining.slice(i + 2);
    const j = remaining.indexOf('**');
    if (j === -1) {
      parts.push(<span key={key}>{remaining}</span>);
      break;
    }
    parts.push(<strong key={key}>{remaining.slice(0, j)}</strong>);
    key += 1;
    remaining = remaining.slice(j + 2);
  }
  return <>{parts}</>;
}

const POLL_INTERVAL_MS = 1800;
const MAX_POLL_ATTEMPTS = 120;

type GeniePollResponse = {
  status: string;
  content?: unknown;
  attachments?: unknown[];
  error?: string | null;
};

/**
 * Floating Genie chat (Supply Chain Control Tower pattern): fixed position, expand/collapse.
 * Uses server-proxied Conversation API; token stays on the app backend.
 */
export function GenieClaimsChat({ genieSpaceUrl }: { genieSpaceUrl?: string }) {
  /** Hide generated SQL blocks for a cleaner adjudication UX (C-suite style in Control Tower). */
  const showSqlBlock = false;

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pollingMessageId, setPollingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollAttemptsRef = useRef(0);

  const available = configured === true;
  const spaceUrl = genieSpaceUrl?.trim() ?? '';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetchClaimsApi('/genie/conversation/status');
        const data = (await r.json()) as { configured?: boolean };
        if (!cancelled) setConfigured(r.ok && data?.configured === true);
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!pollingMessageId || !conversationId) return;

    const poll = async () => {
      try {
        const params = new URLSearchParams({
          conversation_id: conversationId,
          message_id: pollingMessageId,
        });
        const res = await fetchClaimsApi(`/genie/conversation/message?${params.toString()}`);
        const data = (await res.json()) as GeniePollResponse & { detail?: string };
        if (!res.ok) {
          setPollingMessageId(null);
          setLoading(false);
          const msg = typeof data?.detail === 'string' ? data.detail : `HTTP ${res.status}`;
          setError(msg);
          setMessages((prev) => [...prev, { role: 'genie', content: '', error: msg }]);
          return;
        }
        if (data.status === 'COMPLETED') {
          setPollingMessageId(null);
          setLoading(false);
          const text =
            data.attachments?.map(attachmentDisplayText).filter(Boolean).join('\n\n') || '';
          setMessages((prev) => [
            ...prev,
            {
              role: 'genie',
              content: text || '(No response)',
              attachments: data.attachments as
                | Array<{ text?: string; query?: string; content?: string }>
                | undefined,
              error: data.error ?? undefined,
            },
          ]);
          return;
        }
        if (data.status === 'FAILED' || data.error) {
          setPollingMessageId(null);
          setLoading(false);
          setError(data.error || 'Genie request failed');
          setMessages((prev) => [
            ...prev,
            { role: 'genie', content: '', error: data.error || 'Request failed' },
          ]);
          return;
        }
      } catch (e) {
        setPollingMessageId(null);
        setLoading(false);
        setError(e instanceof Error ? e.message : 'Failed to get response');
        setMessages((prev) => [...prev, { role: 'genie', content: '', error: String(e) }]);
        return;
      }
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setPollingMessageId(null);
        setLoading(false);
        setError('Response timed out');
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    void poll();
    return () => clearInterval(id);
  }, [conversationId, pollingMessageId]);

  const sendQuestion = async (content: string) => {
    if (!content.trim() || loading || !available) return;
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: content.trim() }]);
    setLoading(true);
    pollAttemptsRef.current = 0;
    try {
      const res = await fetchClaimsApi('/genie/conversation/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          conversation_id: conversationId ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        conversation_id?: string;
        message_id?: string;
        detail?: string;
      };
      if (!res.ok) {
        setLoading(false);
        const msg = typeof data?.detail === 'string' ? data.detail : `HTTP ${res.status}`;
        setError(msg);
        setMessages((prev) => [...prev, { role: 'genie', content: '', error: msg }]);
        return;
      }
      if (!data.conversation_id || !data.message_id) {
        setLoading(false);
        setError('Unexpected response from Genie proxy');
        return;
      }
      setConversationId(data.conversation_id);
      setPollingMessageId(data.message_id);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Failed to send');
      setMessages((prev) => [...prev, { role: 'genie', content: '', error: String(e) }]);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || loading) return;
    setInput('');
    await sendQuestion(content);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-0">
      {expanded ? (
        <section
          className={`flex max-h-[80vh] w-[420px] flex-col overflow-hidden rounded-2xl border-2 shadow-lg ${
            available
              ? 'border-blue-200 bg-blue-50/80'
              : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-inherit bg-white/70 px-4 py-3">
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Ask Genie</h3>
                {available && spaceUrl ? (
                  <a
                    href={spaceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title="Open Genie space in new tab"
                    className="rounded p-0.5 text-slate-500 transition-colors hover:text-blue-800"
                    aria-label="Open in new tab"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                ) : null}
              </div>
              {available ? (
                <p className="text-sm text-slate-600">
                  Natural language Q&amp;A over your Claims Genie space (same data as the full Genie UI).
                </p>
              ) : configured === null ? (
                <p className="text-sm">Checking Genie configuration…</p>
              ) : (
                <p className="text-sm">
                  Set app env <code className="rounded bg-white/80 px-1">DATABRICKS_GENIE_SPACE_ID</code> or{' '}
                  <code className="rounded bg-white/80 px-1">DATABRICKS_GENIE_SPACE_URL</code> (with{' '}
                  <code className="rounded bg-white/80 px-1">/genie/spaces/…</code> in the path), plus{' '}
                  <code className="rounded bg-white/80 px-1">DATABRICKS_HOST</code> and{' '}
                  <code className="rounded bg-white/80 px-1">DATABRICKS_TOKEN</code>, then redeploy.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex min-h-[2.5rem] min-w-[2.5rem] shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
              title="Collapse chat"
              aria-label="Collapse chat"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {available && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-[120px] flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && !loading && (
                  <p className="text-sm text-slate-500">
                    Ask about claims volume, PACT eligibility, policy, or gold-layer metrics.
                  </p>
                )}
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl bg-blue-100 px-4 py-2 text-sm text-slate-800">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }
                  const hasQuery = msg.attachments?.some((a) => attachmentQueryString(a));
                  const tableData = msg.attachments?.map(attachmentTableData).find(Boolean) ?? null;
                  const sourceTag = msg.attachments?.map(attachmentSourceTag).find(Boolean);
                  return (
                    <div key={i} className="flex justify-start">
                      <div className="max-w-[90%] w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm text-slate-800 shadow-sm">
                        {msg.error && (
                          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
                            {msg.error}
                          </div>
                        )}
                        <details className="group" open>
                          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 select-none [&::-webkit-details-marker]:hidden">
                            <span className="font-medium text-slate-600">Analysis (click to view)</span>
                            {sourceTag && (
                              <code className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-700">
                                {sourceTag}
                              </code>
                            )}
                          </summary>
                          <div className="space-y-4 p-4">
                            {(() => {
                              const queryDesc = queryDescriptionFromAttachments(msg.attachments);
                              const mainText = mainTextFromAttachments(msg.attachments) || msg.content || '';
                              const suggested = suggestedQuestionsFromAttachments(msg.attachments);
                              return (
                                <>
                                  {queryDesc && (
                                    <p className="border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600">
                                      {queryDesc}
                                    </p>
                                  )}
                                  {mainText && (
                                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                                      {textWithBold(mainText)}
                                    </p>
                                  )}
                                  {suggested.length > 0 && (
                                    <div className="border-t border-slate-100 pt-2">
                                      <p className="mb-2 text-xs font-medium text-slate-500">
                                        Suggested questions
                                      </p>
                                      <ul className="list-none space-y-1.5">
                                        {suggested.map((q, qi) => (
                                          <li key={qi}>
                                            <button
                                              type="button"
                                              onClick={() => void sendQuestion(q)}
                                              className="text-left text-sm text-blue-800 hover:underline"
                                            >
                                              {q}
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            {tableData && tableData.rows.length > 0 && (
                              <div className="overflow-hidden rounded-lg border border-slate-200">
                                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                                  Result table ({tableData.rows.length} row
                                  {tableData.rows.length !== 1 ? 's' : ''})
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-slate-100">
                                        {tableData.columns.map((c, k) => (
                                          <th
                                            key={k}
                                            className="px-3 py-2 text-left font-medium text-slate-700"
                                          >
                                            {c}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tableData.rows.map((row, ri) => (
                                        <tr key={ri} className="border-b border-slate-100 last:border-0">
                                          {row.map((cell, ci) => (
                                            <td key={ci} className="px-3 py-2 text-slate-800">
                                              {String(cell ?? '')}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {showSqlBlock && hasQuery && (
                              <details className="overflow-hidden rounded-lg border border-slate-200">
                                <summary className="cursor-pointer list-none bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
                                  Show code
                                </summary>
                                <div className="overflow-x-auto bg-slate-900 p-3">
                                  {msg.attachments?.map((a, j) => {
                                    const queryStr = attachmentQueryString(a);
                                    return queryStr ? (
                                      <pre
                                        key={j}
                                        className="whitespace-pre font-mono text-xs text-slate-200"
                                      >
                                        {queryStr}
                                      </pre>
                                    ) : null;
                                  })}
                                </div>
                              </details>
                            )}
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                      Genie is thinking…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {error && (
                <div className="border-t border-red-100 bg-red-50 px-4 py-1 text-xs text-red-600">
                  {error}
                </div>
              )}
              <div className="flex gap-2 border-t border-slate-200 p-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSend()}
                  placeholder="Ask about claims, PACT, trends…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={loading}
                />
                <Button type="button" onClick={() => void handleSend()} disabled={loading || !input.trim()}>
                  Send
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setExpanded(true)}
          className="h-auto rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 shadow-lg hover:bg-blue-50"
          title="Open Genie chat"
        >
          <span className="text-sm font-semibold text-slate-800">Ask Genie</span>
          <svg
            className="ml-2 inline h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </Button>
      )}
    </div>
  );
}
