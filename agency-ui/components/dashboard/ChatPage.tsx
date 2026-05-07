'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, Send, X, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';

const SLASH_COMMANDS = [
  {
    cmd: '/tender-document-summary',
    description: 'Summarise a tender document into key sections',
  },
  {
    cmd: '/tender-bid-response-checklist',
    description: 'Generate a bid response checklist from a tender summary',
  },
  {
    cmd: '/nse-investment-advisor',
    description: 'Get profile-based NSE stock research and recommendations',
  },
];

type Message = {
  id: number;
  role: 'user' | 'assistant' | 'error';
  content: string;
  attachment?: string;
  imageDataUrl?: string;
  responseAttachments?: Array<{ name: string; url?: string; type?: string }>;
};

type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

type ExecuteJobResponse = {
  jobId: string;
  status: JobStatus;
};

type JobResultResponse = {
  id: string;
  status: JobStatus;
  output: string | null;
  error: string | null;
  tokensUsed: number;
  costInUsd: number;
};

const JOB_POLL_INTERVAL_MS = 2500;
const JOB_POLL_TIMEOUT_MS = 10 * 60 * 1000;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; text?: string; dataUrl?: string } | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [jobStatusText, setJobStatusText] = useState<string>('Working...');
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from persistence on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await api.get<any[]>('/chat/messages');
        const persistedMessages: Message[] = res.data.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          attachment: m.attachment,
        }));
        setMessages(persistedMessages);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';

    const slashMatch = value.match(/(\/\S*)$/);
    if (slashMatch) {
      setSlashFilter(slashMatch[1]);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
      setSlashFilter('');
    }
  };

  const selectSlashCommand = useCallback(
    (cmd: string) => {
      const replaced = input.replace(/(\/\S*)$/, cmd);
      setInput(replaced !== input ? replaced : cmd);
      setShowSlashMenu(false);
      setSlashFilter('');
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [input],
  );

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.cmd.startsWith(slashFilter),
  );

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      const text = await file.text();
      setAttachment({ name: file.name, text });
      return;
    }

    if (ext === 'pdf' || ext === 'docx') {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await api.post('/jobs/extract-document', form);
        const extracted: string = res.data.text ?? '';
        if (!extracted.trim()) {
          alert(`Could not extract text from ${file.name}. The file may be scanned or image-only. Try a text-based PDF or paste the content manually.`);
          return;
        }
        setAttachment({ name: file.name, text: extracted });
      } catch {
        alert(`Failed to process ${file.name}. Please check the file is not corrupted, or paste the document text manually.`);
      } finally {
        setUploading(false);
      }
      return;
    }

    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext ?? '')) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Images must be under 5 MB.`);
        return;
      }
      setUploading(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setAttachment({ name: file.name, dataUrl });
      } catch {
        alert(`Failed to read ${file.name}.`);
      } finally {
        setUploading(false);
      }
      return;
    }

    alert('Supported formats: PDF, DOCX, TXT, MD, CSV, PNG, JPG, GIF, WEBP');
  };

  const waitForJobCompletion = async (jobId: string): Promise<JobResultResponse> => {
    const deadline = Date.now() + JOB_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const job = await api.get<JobResultResponse>(`/jobs/${jobId}`);
      const status = job.data.status;

      if (status === 'PENDING') {
        setJobStatusText('Queued...');
      }

      if (status === 'RUNNING') {
        setJobStatusText('Working...');
      }

      if (status === 'COMPLETED' || status === 'FAILED') {
        return job.data;
      }

      await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
    }

    throw new Error('Job timed out');
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading) return;

    let fullPrompt = input.trim();
    if (attachment) {
      if (attachment.dataUrl) {
        const imgBlock = `![${attachment.name}](${attachment.dataUrl})`;
        fullPrompt = fullPrompt ? `${fullPrompt}\n\n${imgBlock}` : imgBlock;
      } else {
        fullPrompt = fullPrompt
          ? `${fullPrompt}\n\n--- Document: ${attachment.name} ---\n${attachment.text}`
          : `--- Document: ${attachment.name} ---\n${attachment.text}`;
      }
    }

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim() || (attachment?.dataUrl ? `📷 ${attachment.name}` : `Analyse: ${attachment!.name}`),
      attachment: attachment?.name,
      imageDataUrl: attachment?.dataUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    
    // Persist user message
    try {
      await api.post('/chat/messages', {
        role: 'user',
        content: userMsg.content,
        attachment: userMsg.attachment,
      });
    } catch (err) {
      console.error('Failed to save user message:', err);
    }

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setAttachment(null);
    setLoading(true);
    setJobStatusText('Queued...');

    try {
      const res = await api.post<ExecuteJobResponse>('/jobs/execute', {
        prompt: fullPrompt,
      });

      const finalJob = await waitForJobCompletion(res.data.jobId);

      if (finalJob.status === 'COMPLETED') {
        const assistantMsg = {
          id: Date.now() + 1,
          role: 'assistant' as const,
          content: finalJob.output || 'Task completed with no output.',
        };
        setMessages((prev) => [...prev, assistantMsg]);
        
        // Persist assistant message
        try {
          await api.post('/chat/messages', {
            role: 'assistant',
            content: assistantMsg.content,
            jobId: res.data.jobId,
          });
        } catch (err) {
          console.error('Failed to save assistant message:', err);
        }
        return;
      }

      const errorMsg = {
        id: Date.now() + 2,
        role: 'error' as const,
        content: finalJob.error || 'Task failed. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      
      // Persist error message
      try {
        await api.post('/chat/messages', {
          role: 'error',
          content: errorMsg.content,
          jobId: res.data.jobId,
        });
      } catch (err) {
        console.error('Failed to save error message:', err);
      }
    } catch (err: any) {
      let errorContent = 'Something went wrong. Please try again.';
      
      // Only show "Insufficient credits" message to users
      if (err?.response?.data?.message === 'Insufficient credits') {
        errorContent = 'Insufficient credits';
      }
      
      const errorMsg = {
        id: Date.now() + 3,
        role: 'error' as const,
        content: errorContent,
      };
      setMessages((prev) => [...prev, errorMsg]);
      
      // Persist error message
      try {
        await api.post('/chat/messages', {
          role: 'error',
          content: errorMsg.content,
        });
      } catch (err) {
        console.error('Failed to save error message:', err);
      }
    } finally {
      setLoading(false);
      setJobStatusText('Working...');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setShowSlashMenu(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showSlashMenu) handleSend();
      if (showSlashMenu && filteredCommands.length > 0) {
        selectSlashCommand(filteredCommands[0].cmd);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-4 md:px-6 py-3 md:py-4 flex-shrink-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-white font-semibold text-base">AI Assistant</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Type <span className="font-mono bg-gray-800 px-1 rounded text-gray-300">/</span> to summon a skill · Attach tender documents with the paperclip
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-blue-400 hover:text-blue-300 font-medium px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4">
              {showHistory && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowHistory(false)} />
              )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 border border-gray-700">
              <Hash size={28} className="text-blue-400" />
            </div>
            <p className="text-gray-300 font-medium text-lg">Ready to assist</p>
            <p className="text-gray-600 text-sm mt-2 max-w-xs leading-relaxed">
              Attach a tender document and use{' '}
              <span className="font-mono text-blue-400">/tender-document-summary</span> or{' '}
              <span className="font-mono text-blue-400">/tender-bid-response-checklist</span> or{' '}
              <span className="font-mono text-blue-400">/nse-investment-advisor</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] md:max-w-[78%] max-h-[60vh] overflow-y-auto rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : msg.role === 'error'
                    ? 'bg-red-950 border border-red-800/60 text-red-300 rounded-bl-sm'
                    : 'bg-gray-800 text-gray-100 border border-gray-700/50 rounded-bl-sm'
              }`}
            >
              {msg.attachment && msg.role === 'user' && (
                <div className="flex items-center gap-1.5 text-xs opacity-60 mb-2 pb-2 border-b border-current/20">
                  <Paperclip size={11} />
                  <span className="truncate max-w-[200px]">{msg.attachment}</span>
                </div>
              )}
              {msg.imageDataUrl && msg.role === 'user' && (
                <div className="mb-2">
                  <img src={msg.imageDataUrl} alt={msg.attachment ?? 'image'} className="max-w-[180px] max-h-[130px] object-contain rounded-lg border border-white/20" />
                </div>
              )}
              {msg.attachment && !msg.imageDataUrl && msg.role === 'user' && (
                <div className="flex items-center gap-1.5 text-xs opacity-60 mb-2 pb-2 border-b border-current/20">
                  <Paperclip size={11} />
                  <span className="truncate max-w-[200px]">{msg.attachment}</span>
                </div>
              )}
              {msg.responseAttachments && msg.responseAttachments.length > 0 && (
                <div className="mb-3 pb-3 border-b border-current/20">
                  <p className="text-xs opacity-60 mb-2">📎 Attachments:</p>
                  <div className="space-y-1">
                    {msg.responseAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-900/50 rounded px-2 py-1">
                        <Paperclip size={12} className="flex-shrink-0" />
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline truncate"
                        >
                          {att.name}
                        </a>
                        {att.type && <span className="text-xs text-gray-500 flex-shrink-0">({att.type})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {msg.role === 'user' || msg.role === 'error' ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <div className="max-w-full">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mb-3 text-white" {...props} />,
                      h2: ({node, ...props}: any) => <h2 className="text-base font-bold mb-2 text-white mt-4" {...props} />,
                      h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mb-2 text-gray-100 mt-3" {...props} />,
                      h4: ({node, ...props}: any) => <h4 className="text-sm font-semibold mb-2 text-gray-200" {...props} />,
                      p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed text-sm" {...props} />,
                      ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2" {...props} />,
                      ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2" {...props} />,
                      li: ({node, ...props}: any) => <li className="text-gray-100 text-sm" {...props} />,
                      blockquote: ({node, ...props}: any) => (
                        <blockquote className="border-l-4 border-blue-400 pl-3 mb-2 italic text-gray-300 text-sm" {...props} />
                      ),
                      code: ({node, inline, ...props}: any) =>
                        inline ? (
                          <code className="bg-gray-900 text-green-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                        ) : (
                          <code className="bg-gray-900 text-green-300 block p-2 rounded mb-2 overflow-x-auto font-mono text-xs" {...props} />
                        ),
                      pre: ({node, ...props}: any) => (
                        <pre className="bg-gray-900 p-2 rounded mb-2 overflow-x-auto text-xs border border-gray-700" {...props} />
                      ),
                      table: ({node, ...props}: any) => (
                        <table className="border-collapse border border-gray-600 mb-2 text-xs w-full" {...props} />
                      ),
                      th: ({node, ...props}: any) => (
                        <th className="border border-gray-600 bg-gray-900 px-2 py-1 text-left text-gray-100 font-semibold" {...props} />
                      ),
                      td: ({node, ...props}: any) => (
                        <td className="border border-gray-600 px-2 py-1 text-gray-200" {...props} />
                      ),
                      a: ({node, ...props}: any) => <a className="text-blue-400 hover:text-blue-300 underline text-sm" {...props} />,
                      strong: ({node, ...props}: any) => <strong className="font-bold text-gray-100" {...props} />,
                      em: ({node, ...props}: any) => <em className="italic text-gray-300" {...props} />,
                      img: ({node, ...props}: any) => (
                        <img className="max-w-full h-auto rounded-lg my-2 border border-gray-600" alt="Response content" {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl rounded-bl-sm px-5 py-3 flex items-center gap-1.5 text-gray-400 text-sm">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              <span className="ml-2">{jobStatusText}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-3 md:p-4 flex-shrink-0">
        {attachment && (
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 mb-2 text-sm text-gray-300">
            {attachment.dataUrl ? (
              <img src={attachment.dataUrl} alt={attachment.name} className="w-8 h-8 object-cover rounded flex-shrink-0 border border-gray-600" />
            ) : (
              <Paperclip size={13} className="text-blue-400 flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-xs">{attachment.name}</span>
            <button
              onClick={() => setAttachment(null)}
              className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
              aria-label="Remove attachment"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="relative">
          {showSlashMenu && filteredCommands.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-10 w-full max-w-md">
              <div className="px-3 py-2 border-b border-gray-700">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Skills</p>
              </div>
              {filteredCommands.map((c) => (
                <button
                  key={c.cmd}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSlashCommand(c.cmd);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex flex-col gap-0.5"
                >
                  <span className="text-blue-400 text-sm font-mono font-semibold">{c.cmd}</span>
                  <span className="text-gray-400 text-xs">{c.description}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-gray-800 rounded-2xl border border-gray-700 px-3 py-2 focus-within:border-gray-600 transition-colors">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              title="Attach document (PDF, DOCX, TXT)"
              className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-700 flex-shrink-0 self-end mb-0.5 disabled:opacity-40"
            >
              {uploading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
              ) : (
                <Paperclip size={17} />
              )}
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-600 resize-none focus:outline-none text-sm py-1.5 leading-relaxed"
              placeholder="Type a message or / for skills…"
              style={{ minHeight: '28px', maxHeight: '128px' }}
            />

            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !attachment)}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 self-end mb-0.5"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={handleFileAttach}
          />
        </div>

        <p className="text-xs text-gray-700 mt-2 text-center">
          Shift+Enter for new line · Enter to send
        </p>
        
          {showHistory && (
            <div className="fixed z-50 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col top-16 bottom-4 left-3 right-3 md:left-auto md:right-4 md:top-20 md:bottom-20 md:w-80">
              <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <h2 className="text-white font-semibold text-sm">Chat History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {historyLoading ? (
                  <p className="text-gray-500 text-xs text-center py-4">Loading history...</p>
                ) : messages.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-4">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="text-xs p-2 rounded-lg bg-gray-800 border border-gray-700">
                      <span className={`font-semibold ${msg.role === 'user' ? 'text-blue-400' : msg.role === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
                      </span>
                      <p className="text-gray-300 mt-1 line-clamp-2">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-800 px-3 py-3 flex-shrink-0">
                <button
                  onClick={async () => {
                    try {
                      await api.delete('/chat/messages');
                      setMessages([]);
                    } catch (err) {
                      console.error('Failed to clear history:', err);
                    }
                  }}
                  className="w-full text-xs text-red-400 hover:text-red-300 py-2 rounded-lg hover:bg-red-950/30 transition-colors"
                >
                  Clear History
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
