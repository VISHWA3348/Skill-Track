import { useState, useEffect, useMemo, RefObject } from 'react';

interface UseVirtualOptions {
  itemCount: number;
  rowHeight?: number;
  overscan?: number;
  containerRef?: RefObject<HTMLElement>;
}

export function useVirtual({
  itemCount,
  rowHeight = 75,
  overscan = 8,
  containerRef,
}: UseVirtualOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(800);
  const [offsetTop, setOffsetTop] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Initial values
    setScrollTop(window.scrollY);
    setWindowHeight(window.innerHeight);

    if (containerRef && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOffsetTop(rect.top + window.scrollY);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  // Periodically recalculate offset to account for dynamic layout changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setOffsetTop(rect.top + window.scrollY);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [containerRef, itemCount]);

  const { startIndex, endIndex, topPadding, bottomPadding } = useMemo(() => {
    const relativeScrollTop = Math.max(0, scrollTop - offsetTop);
    const startIndex = Math.max(0, Math.floor(relativeScrollTop / rowHeight) - overscan);
    const endIndex = Math.min(itemCount, Math.ceil((relativeScrollTop + windowHeight) / rowHeight) + overscan);

    const topPadding = startIndex * rowHeight;
    const bottomPadding = Math.max(0, (itemCount - endIndex) * rowHeight);

    return {
      startIndex,
      endIndex,
      topPadding,
      bottomPadding,
    };
  }, [scrollTop, windowHeight, offsetTop, itemCount, rowHeight, overscan]);

  return {
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
  };
}
