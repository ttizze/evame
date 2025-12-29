export const MAX_CHUNK_SIZE = 10000;

// モデルごとの最大チャンクサイズ（文字数）
// 日本語は1文字あたり約1.5-2トークン、システムプロンプト分を考慮して安全マージンを確保
export const MODEL_MAX_CHUNK_SIZES: Record<string, number> = {
	// OpenAI GPT-5 models (272k-400k tokens context window)
	// コンテキストウィンドウは大きいが、構造化出力の品質を保つためさらに控えめに設定
	// 構造化出力では大量の配列要素を正確に生成するのが難しいため
	"gpt-5-nano-2025-08-07": 10000,
	// DeepSeek models (64k tokens context window)
	// 構造化出力の品質を保つため控えめに設定
	"deepseek-reasoner": 10000, // Thinking mode
	"deepseek-chat": 10000, // Standard mode
	// Gemini models (1M tokens context window)
	"gemini-2.5-flash": 10000,
	"gemini-2.5-flash-lite": 10000,
	"gemini-2.0-flash": 10000,
};

export function getMaxChunkSizeForModel(model: string): number {
	return MODEL_MAX_CHUNK_SIZES[model] ?? MAX_CHUNK_SIZE;
}
