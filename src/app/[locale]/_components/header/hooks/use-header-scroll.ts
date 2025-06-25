'use client';
import { type RefObject, useEffect, useRef, useState } from 'react';

interface UseHeaderScrollOptions {
  // ヘッダーの初期オフセット位置（オプション、SubHeaderで使用）
  initialOffset?: number;
  // スクロールしきい値（小さな動きを無視する）
  scrollThreshold?: number;
}

interface UseHeaderScrollResult {
  // ヘッダーの参照
  headerRef: RefObject<HTMLDivElement | null>;
  // ヘッダーが固定されているか
  isPinned: boolean;
  // ヘッダーが表示されているか
  isVisible: boolean;
  // ヘッダーの高さ
  headerHeight: number;
  // ヘッダーの初期オフセット位置（SubHeaderで使用）
  headerOffset: number;
}

/**
 * ヘッダーのスクロール動作を管理するカスタムフック
 */
export function useHeaderScroll(
  options: UseHeaderScrollOptions = {}
): UseHeaderScrollResult {
  const { initialOffset, scrollThreshold = 5 } = options;

  const [isPinned, setIsPinned] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [headerOffset, setHeaderOffset] = useState(initialOffset || 0);

  useEffect(() => {
    // ヘッダーの高さを測定
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);

      // 初期オフセットが提供されていない場合、自動で計算
      if (initialOffset === undefined) {
        const offsetTop =
          headerRef.current.getBoundingClientRect().top + window.scrollY;
        setHeaderOffset(offsetTop);
      }
    }

    // スクロールイベントハンドラ
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // スクロール方向を検出
      const isScrollingDown = currentScrollY > lastScrollY;
      const isScrollingUp = currentScrollY < lastScrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY);

      // ページ上部にいる場合、ヘッダーは固定しない
      if (currentScrollY <= 0) {
        setIsPinned(false);
        setIsVisible(true);
      }
      // 初期オフセットより上にいる場合（SubHeaderの場合）
      else if (headerOffset > 0 && currentScrollY < headerOffset) {
        setIsPinned(false);
        setIsVisible(true);
      }
      // 下にスクロールしている場合はヘッダーを隠す
      else if (isScrollingDown && scrollDifference > scrollThreshold) {
        setIsVisible(false);
        setIsPinned(false);
      }
      // 上にスクロールしている場合はヘッダーを表示して固定
      else if (isScrollingUp && scrollDifference > scrollThreshold) {
        setIsVisible(true);
        setIsPinned(true);
      }

      setLastScrollY(currentScrollY);
    };

    // スクロールイベントリスナーを追加
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      // クリーンアップ: イベントリスナーを削除
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY, headerOffset, initialOffset, scrollThreshold]);

  return {
    headerRef,
    isPinned,
    isVisible,
    headerHeight,
    headerOffset,
  };
}
