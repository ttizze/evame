"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

// https://github.com/shuding/cobe

export default function Globe() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		let phi = 0;

		// マーカーの位置定義
		const markerLocations = [
			// 北米
			{ location: [37.7595, -122.4367] as [number, number], size: 0.05 }, // サンフランシスコ
			{ location: [40.7128, -74.006] as [number, number], size: 0.07 }, // ニューヨーク
			{ location: [51.0447, -114.0719] as [number, number], size: 0.04 }, // カルガリー（カナダ）
			{ location: [19.4326, -99.1332] as [number, number], size: 0.06 }, // メキシコシティ

			// 南米
			{ location: [-23.5505, -46.6333] as [number, number], size: 0.06 }, // サンパウロ（ブラジル）
			{ location: [-34.6037, -58.3816] as [number, number], size: 0.05 }, // ブエノスアイレス（アルゼンチン）
			{ location: [-33.4489, -70.6693] as [number, number], size: 0.04 }, // サンティアゴ（チリ）

			// ヨーロッパ
			{ location: [51.5074, -0.1278] as [number, number], size: 0.06 }, // ロンドン（イギリス）
			{ location: [48.8566, 2.3522] as [number, number], size: 0.06 }, // パリ（フランス）
			{ location: [52.52, 13.405] as [number, number], size: 0.05 }, // ベルリン（ドイツ）
			{ location: [41.9028, 12.4964] as [number, number], size: 0.05 }, // ローマ（イタリア）
			{ location: [59.9139, 10.7522] as [number, number], size: 0.04 }, // オスロ（ノルウェー）

			// アジア
			{ location: [35.6762, 139.6503] as [number, number], size: 0.07 }, // 東京（日本）
			{ location: [22.3193, 114.1694] as [number, number], size: 0.06 }, // 香港
			{ location: [1.3521, 103.8198] as [number, number], size: 0.05 }, // シンガポール
			{ location: [39.9042, 116.4074] as [number, number], size: 0.07 }, // 北京（中国）
			{ location: [28.6139, 77.209] as [number, number], size: 0.06 }, // ニューデリー（インド）
			{ location: [25.2048, 55.2708] as [number, number], size: 0.06 }, // ドバイ（UAE）

			// オセアニア
			{ location: [-33.8688, 151.2093] as [number, number], size: 0.05 }, // シドニー（オーストラリア）
			{ location: [-36.8485, 174.7633] as [number, number], size: 0.04 }, // オークランド（ニュージーランド）
			{ location: [-17.7134, 178.065] as [number, number], size: 0.03 }, // スバ（フィジー）

			// アフリカ
			{ location: [30.0444, 31.2357] as [number, number], size: 0.05 }, // カイロ（エジプト）
			{ location: [-33.9249, 18.4241] as [number, number], size: 0.05 }, // ケープタウン（南アフリカ）
			{ location: [9.082, 8.6753] as [number, number], size: 0.04 }, // アブジャ（ナイジェリア）
			{ location: [-1.2921, 36.8219] as [number, number], size: 0.04 }, // ナイロビ（ケニア）

			// 島国
			{ location: [21.3069, -157.8583] as [number, number], size: 0.03 }, // ホノルル（ハワイ）
			{ location: [18.1096, -77.2975] as [number, number], size: 0.03 }, // キングストン（ジャマイカ）
			{ location: [-18.1416, 178.4419] as [number, number], size: 0.03 }, // スバ（フィジー）
			{ location: [64.1466, -21.9426] as [number, number], size: 0.03 }, // レイキャビク（アイスランド）
		];

		// 色の配列（赤、緑、青、黄）
		const colors = [
			[1, 0.3, 0.3] as [number, number, number], // 赤
			[0.3, 1, 0.3] as [number, number, number], // 緑
			[0.3, 0.3, 1] as [number, number, number], // 青
		];

		// 現在の色のインデックスと色変更用の変数
		let colorIndex = 0;
		let lastColorChangeTime = Date.now();
		const colorChangeInterval = 2000; // 2秒ごとに色を変更

		// グローブの設定
		const globe = createGlobe(canvas, {
			devicePixelRatio: 2,
			width: 500 * 2,
			height: 500 * 2,
			phi: 0,
			theta: 0,
			dark: 0,
			diffuse: 1.2,
			mapSamples: 16000,
			mapBrightness: 6,
			baseColor: [0.3, 0.3, 0.3] as [number, number, number],
			markerColor: colors[0],
			glowColor: [1, 1, 1] as [number, number, number],
			markers: markerLocations,
			onRender: (state) => {
				// 回転の更新
				state.phi = phi;
				// 回転速度を遅くする
				phi += 0.005;

				// 色の変更タイミングをチェック
				const now = Date.now();
				if (now - lastColorChangeTime > colorChangeInterval) {
					lastColorChangeTime = now;
					colorIndex = (colorIndex + 1) % colors.length;
					// 次のフレームで使用する色を更新
					state.markerColor = colors[colorIndex];
				}
			},
		});

		return () => {
			globe.destroy();
		};
	}, []);

	return (
		<div className="App flex justify-center items-center">
			<canvas
				ref={canvasRef}
				className="w-full  max-h-[500px] max-w-[500px]"
				style={{ aspectRatio: "1" }}
			/>
		</div>
	);
}
