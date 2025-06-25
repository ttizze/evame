'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * 読み込み時に表示 → 下スクロールで非表示 → 上スクロールで再表示
 */
export function useScrollVisibility(alwaysVisible = false) {
  const [isVisible, setVisible] = useState(true); // ① 初期表示

  const lastY = useRef(0); // 前回の scrollY
  const ticking = useRef(false); // rAF 同期用
  const ignore = useRef(false); // クリック直後無視

  /** ボタンを押した瞬間のチラつきを防ぐ */
  const ignoreNextScroll = (ms = 100) => {
    ignore.current = true;
    setTimeout(() => {
      ignore.current = false;
    }, ms);
  };

  useEffect(() => {
    if (alwaysVisible) {
      setVisible(true);
      return;
    }

    const onScroll = () => {
      if (ignore.current || ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const cur = window.scrollY;
        const dir = cur - lastY.current; // +down / –up

        // ② 上スクロール or 最上部近くなら表示
        setVisible(dir <= 0 || cur < window.innerHeight * 0.03);

        lastY.current = cur;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [alwaysVisible]);

  return { isVisible, ignoreNextScroll };
}
