import React, { useEffect, useRef, useCallback } from 'react';
import Icon from './Icon';

export interface ModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal should close (backdrop click or close button). */
  onClose: () => void;
  /** Optional title shown in the header. */
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className = '' }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto animate-[scaleIn_200ms_ease-out] ${className}`.trim()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-lg font-semibold text-surface-dark">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <Icon name="close" size={22} />
            </button>
          </div>
        )}

        {/* Close button when no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100 transition-colors z-10"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </button>
        )}

        <div className="px-5 pb-5 pt-2">{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Modal;
