'use client';

import { useEffect, useRef } from 'react';

interface UseModalScrollOptions {
  isOpen: boolean;
  onClose?: () => void;
  scrollStep?: number;
  pageStep?: number;
}

export function useModalScroll<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  scrollStep = 60,
  pageStep = 350,
}: UseModalScrollOptions) {
  const scrollRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll while modal is open
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus scrollable container for immediate keyboard interaction
    const focusTimer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.focus({ preventScroll: true });
      }
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable);

      const isTypingField =
        isInput &&
        activeEl.tagName !== 'BUTTON' &&
        activeEl.getAttribute('type') !== 'checkbox' &&
        activeEl.getAttribute('type') !== 'radio';

      const container = scrollRef.current;
      if (!container) return;

      // Allow cursor navigation inside text inputs for ArrowUp / ArrowDown
      if (isTypingField && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        container.scrollBy({ top: scrollStep, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        container.scrollBy({ top: -scrollStep, behavior: 'smooth' });
      } else if (e.key === 'PageDown' || (!isTypingField && e.key === ' ')) {
        e.preventDefault();
        container.scrollBy({ top: pageStep, behavior: 'smooth' });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        container.scrollBy({ top: -pageStep, behavior: 'smooth' });
      } else if (e.key === 'Home' && !isTypingField) {
        e.preventDefault();
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'End' && !isTypingField) {
        e.preventDefault();
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, scrollStep, pageStep]);

  return scrollRef;
}
