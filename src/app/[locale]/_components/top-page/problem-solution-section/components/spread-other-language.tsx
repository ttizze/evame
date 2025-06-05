"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const LANGUAGES = [
  { code: "jp", flag: "🇯🇵", name: "Japanese" },
  { code: "us", flag: "🇺🇸", name: "English" },
  { code: "kr", flag: "🇰🇷", name: "Korean" },
  { code: "fr", flag: "🇫🇷", name: "French" },
  { code: "es", flag: "🇪🇸", name: "Spanish" },
  { code: "de", flag: "🇩🇪", name: "German" },
  { code: "cn", flag: "🇨🇳", name: "Chinese" },
  { code: "it", flag: "🇮🇹", name: "Italian" },
];

// 中央バッジの直径 (= width = height)
const CENTER_SIZE = 108; // 6rem (= w-24/h-24) 以内なら好みで

export function SpreadOtherLanguage() {
  const [animate, setAnimate] = useState(false);
  const [radius, setRadius] = useState(160);

  // window 幅で radius を動的計算（中央バッジ＋両サイド 16px マージンとアイコン幅を引く）
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const icon = 48; // w-12
      const margin = 16 * 2;
      const r = Math.max(
        70, // 最小
        Math.min(160, (vw - CENTER_SIZE - icon - margin) / 2)
      );
      setRadius(r);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // アニメーション on / off
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    const interval = setInterval(() => {
      setAnimate(false);
      setTimeout(() => setAnimate(true), 800);
    }, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const ringSizes = [radius * 2 + 24, radius * 2 + 8, radius * 2 - 8];

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] flex items-center justify-center overflow-hidden rounded-xl">
      {/* 言語アイコン */}
      {LANGUAGES.map((lang, i) => {
        const angle = (i * 360) / LANGUAGES.length;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        return (
          <motion.div
            key={lang.code}
            className="absolute flex flex-col items-center"
            initial={{ x, y, scale: 0, opacity: 0 }}
            animate={
              animate ? { x, y, scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
            }
            transition={{
              duration: 0.7,
              delay: i * 0.08,
              type: "spring",
              stiffness: 100,
            }}
          >
            <motion.div
              className="z-10 flex items-center justify-center w-12 h-12 rounded-full border"
              whileHover={{ scale: 1.1 }}
            >
              <span className="text-2xl" role="img" aria-label={lang.name}>
                {lang.flag}
              </span>
            </motion.div>
            <Badge variant="secondary" className="mt-2">
              {lang.name}
            </Badge>
          </motion.div>
        );
      })}

      {/* 中央カード：モバイルで横幅を縮小 */}
      <Card className="relative z-20 shadow-lg w-32">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="w-full h-2 bg-slate-200 rounded-full" />
            <div className="w-3/4 h-2 bg-slate-200 rounded-full" />
            <div className="w-5/6 h-2 bg-slate-200 rounded-full" />
            <div className="w-2/3 h-2 bg-slate-200 rounded-full" />
            <div className="flex justify-center mt-4">
              <Badge>Original</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パルス円 */}
      {ringSizes.map((size, idx) => (
        <motion.div
          key={size}
          className={`absolute rounded-full border-2 ${
            idx === 0
              ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]"
              : idx === 1
              ? "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.45)]"
              : "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]"
          }`}
          initial={{ width: size * 0.25, height: size * 0.25, opacity: 0.8 }}
          animate={
            animate
              ? { width: size, height: size, opacity: 0, borderWidth: 0.5 }
              : { width: size * 0.15, height: size * 0.15, opacity: 0.8 }
          }
          transition={{
            duration: 2,
            delay: idx * 0.25,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
