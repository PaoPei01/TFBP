import { useEffect } from 'react';

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return undefined;

    const scrollY = window.scrollY;
    const previousBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };
    const previousHtmlStyle = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    };

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = previousBodyStyle.overflow;
      document.body.style.position = previousBodyStyle.position;
      document.body.style.top = previousBodyStyle.top;
      document.body.style.left = previousBodyStyle.left;
      document.body.style.right = previousBodyStyle.right;
      document.body.style.width = previousBodyStyle.width;
      document.body.style.overscrollBehavior = previousBodyStyle.overscrollBehavior;
      document.documentElement.style.overflow = previousHtmlStyle.overflow;
      document.documentElement.style.overscrollBehavior = previousHtmlStyle.overscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
