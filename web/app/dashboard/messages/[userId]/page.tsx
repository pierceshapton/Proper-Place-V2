'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatApi, type Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const partnerId = Number(userId);

  const loadMessages = useCallback(async () => {
    try {
      const data = await chatApi.messages(partnerId);
      setMessages(data.messages || []);
      chatApi.markRead(partnerId).catch(() => {});
    } catch { /* ignore */ }
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    loadMessages();
    const iv = setInterval(loadMessages, 5000);
    return () => clearInterval(iv);
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > prevCountRef.current || prevCountRef.current === 0) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await chatApi.send({ receiver_id: partnerId, content: text.trim() });
      setText('');
      await loadMessages();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send');
    }
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <button onClick={() => router.push('/dashboard/messages')} className="text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-lg font-bold text-gray-900">Conversation</h1>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No messages yet. Start the conversation!</div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id !== partnerId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-light-blue text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    {isMine && msg.read && ' ✓✓'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="pt-4 border-t border-gray-200 flex gap-3">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white border-gray-300 text-gray-900 placeholder-gray-400 rounded-full px-5"
          autoFocus
        />
        <button type="submit" disabled={!text.trim() || sending} className="btn-primary py-2 px-6 rounded-full disabled:opacity-50">
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
