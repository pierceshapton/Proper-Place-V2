'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { chatApi, type Conversation } from '@/lib/api';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatApi.conversations()
      .then(data => setConversations(data.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

      {conversations.length === 0 ? (
        <div className="card bg-white p-12 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h2>
          <p className="text-gray-500">Messages with hosts and guests will appear here.</p>
        </div>
      ) : (
        <div className="card bg-white divide-y divide-gray-100">
          {conversations.map(conv => (
            <Link
              key={conv.partnerId}
              href={`/dashboard/messages/${conv.partnerId}${conv.bookingId ? `?booking=${conv.bookingId}` : ''}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {conv.partnerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">{conv.partnerName}</p>
                  <p className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</p>
                </div>
                <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                {conv.placeName && <p className="text-xs text-light-blue mt-0.5">{conv.placeName}</p>}
              </div>
              {conv.unreadCount > 0 && (
                <span className="bg-light-blue text-white text-xs rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-medium">
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
