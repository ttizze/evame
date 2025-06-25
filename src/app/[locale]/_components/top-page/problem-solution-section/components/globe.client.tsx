'use client';

import createGlobe, { type Marker } from 'cobe';
import { useCallback, useEffect, useRef } from 'react';

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // グローブ生成関数を切り出し
  const initGlobe = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.offsetWidth * dpr; // 表示幅 × dpr
    canvas.width = size;
    canvas.height = size;

    let phi = 0;

    // マーカー
    const markerLocations = [
      { location: [37.7595, -122.4367], size: 0.05 },
      { location: [40.7128, -74.006], size: 0.07 },
      { location: [51.0447, -114.0719], size: 0.04 },
      { location: [19.4326, -99.1332], size: 0.06 },
      { location: [-23.5505, -46.6333], size: 0.06 },
      { location: [-34.6037, -58.3816], size: 0.05 },
      { location: [-33.4489, -70.6693], size: 0.04 },
      { location: [51.5074, -0.1278], size: 0.06 },
      { location: [48.8566, 2.3522], size: 0.06 },
      { location: [52.52, 13.405], size: 0.05 },
      { location: [41.9028, 12.4964], size: 0.05 },
      { location: [59.9139, 10.7522], size: 0.04 },
      { location: [35.6762, 139.6503], size: 0.07 },
      { location: [22.3193, 114.1694], size: 0.06 },
      { location: [1.3521, 103.8198], size: 0.05 },
      { location: [39.9042, 116.4074], size: 0.07 },
      { location: [28.6139, 77.209], size: 0.06 },
      { location: [25.2048, 55.2708], size: 0.06 },
      { location: [-33.8688, 151.2093], size: 0.05 },
      { location: [-36.8485, 174.7633], size: 0.04 },
      { location: [-17.7134, 178.065], size: 0.03 },
      { location: [30.0444, 31.2357], size: 0.05 },
      { location: [-33.9249, 18.4241], size: 0.05 },
      { location: [9.082, 8.6753], size: 0.04 },
      { location: [-1.2921, 36.8219], size: 0.04 },
      { location: [21.3069, -157.8583], size: 0.03 },
      { location: [18.1096, -77.2975], size: 0.03 },
      { location: [-18.1416, 178.4419], size: 0.03 },
      { location: [64.1466, -21.9426], size: 0.03 },
    ] as Marker[];

    const colors: [number, number, number][] = [
      [1, 0.3, 0.3],
      [0.3, 1, 0.3],
      [0.3, 0.3, 1],
    ];
    let colorIndex = 0;
    let lastChange = Date.now();

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size,
      height: size,
      phi: 0,
      theta: 0,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16_000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: colors[0],
      glowColor: [1, 1, 1],
      markers: markerLocations,
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005;

        if (Date.now() - lastChange > 2000) {
          lastChange = Date.now();
          colorIndex = (colorIndex + 1) % colors.length;
          state.markerColor = colors[colorIndex];
        }
      },
    });

    return () => globe.destroy();
  }, []);

  useEffect(() => {
    // 初期化
    let destroy = initGlobe();

    // リサイズで破棄→再生成
    const handleResize = () => {
      destroy();
      destroy = initGlobe();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      destroy();
      window.removeEventListener('resize', handleResize);
    };
  }, [initGlobe]);

  return (
    <div className="flex items-center justify-center">
      {/* モバイルは 280px、md 以上で 450px まで広げる */}
      <canvas
        className="h-[280px] w-[280px] md:h-[450px] md:w-[450px]"
        ref={canvasRef}
        style={{ aspectRatio: '1' }}
      />
    </div>
  );
}
