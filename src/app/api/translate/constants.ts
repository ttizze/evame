const MAX_CHUNK_SIZE = 10000;

// モデルごとの最大チャンクサイズ（文字数）
// gemini-2.0-flash: 出力8,192トークン上限 → 10,000文字
// gemini-2.5-*: 出力65,535トークン上限 → 30,000文字
const MODEL_MAX_CHUNK_SIZES: Record<string, number> = {
	// OpenAI GPT-5 models
	"gpt-5-nano-2025-08-07": 30000,
	// DeepSeek models
	"deepseek-reasoner": 30000,
	"deepseek-chat": 30000,
	// Gemini 2.5 models (出力65,535トークン上限)
	"gemini-2.5-flash": 30000,
	"gemini-2.5-flash-lite": 30000,
	// Gemini 2.0 models (出力8,192トークン上限)
	"gemini-2.0-flash": 10000,
};

export function getMaxChunkSizeForModel(model: string): number {
	return MODEL_MAX_CHUNK_SIZES[model] ?? MAX_CHUNK_SIZE;
}
