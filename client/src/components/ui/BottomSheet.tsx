import React, { useEffect, useCallback, useRef, useState } from 'react';

export interface BottomSheetProps {
  /** Whether the bottom sheet is open. */
  open: boolean;
  /** Called when the sheet should close. */
  onClose: () => void;
  /** Optional title. */
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  className = '',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

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
      setIsClosing(false);
      setTranslateY(0);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setTranslateY(0);
    }, 200);
  }, [onClose]);

  // Drag handle touch events
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) {
      setTranslateY(delta);
    }
  };

  const onTouchEnd = () => {
    if (translateY > 100) {
      handleClose();
    } else {
      setTranslateY(0);
    }
    dragStartY.current = null;
  };

  if (!open && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'animate-[fadeIn_200ms_ease-out]'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto transition-transform ${isClosing ? 'duration-200 translate-y-full' : 'animate-[slideUp_250ms_ease-out]'} ${className}`.trim()}
        style={{
          transform: translateY > 0 && !isClosing ? `translateY(${translateY}px)` : undefined,
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pb-2 pt-1">
            <h2 className="text-lg font-semibold text-surface-dark">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-6">{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BottomSheet;
