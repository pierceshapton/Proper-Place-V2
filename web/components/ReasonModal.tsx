'use client';
import { useState } from 'react';

interface ReasonModalProps {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  confirmColor?: string;
  required?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function ReasonModal({
  title,
  description,
  placeholder = 'Enter reason...',
  confirmLabel = 'Confirm',
  confirmColor = 'bg-red-600 hover:bg-red-700',
  required = false,
  onConfirm,
  onCancel,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={required && !reason.trim()}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${confirmColor} disabled:opacity-50`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
