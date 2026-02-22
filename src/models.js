export const DEFAULT_LOCAL_MODEL = 'Qwen3-1.7B-q4f16_1-MLC';
export const CHARS_PER_TOKEN = 3; // conservative heuristic (English text + markup)
export const SYSTEM_PROMPT_TOKENS = 150; // estimated overhead for system prompt + framing

// Curated local models — one per size tier, q4f16 quantization for smaller downloads
// context: MLC-compiled context_window_size (from WebLLM prebuiltAppConfig)
export const LOCAL_MODELS = [
	{ id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', name: 'SmolLM2', params: '360M', vram: '376 MB', context: 4096, tag: 'Tiny' },
	{ id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama', params: '1.1B', vram: '697 MB', context: 2048, tag: 'Light' },
	{ id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2', params: '1B', vram: '879 MB', context: 4096, tag: '' },
	{ id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5', params: '1.5B', vram: '1.6 GB', context: 4096, tag: '' },
	{ id: 'Qwen3-1.7B-q4f16_1-MLC', name: 'Qwen 3', params: '1.7B', vram: '2.0 GB', context: 4096, tag: 'Recommended' },
	{ id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3.2', params: '3B', vram: '2.3 GB', context: 4096, tag: '' },
	{ id: 'Qwen3-4B-q4f16_1-MLC', name: 'Qwen 3', params: '4B', vram: '3.4 GB', context: 4096, tag: '' },
	{ id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 Mini', params: '3.8B', vram: '3.7 GB', context: 4096, tag: '' },
	{ id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC', name: 'DeepSeek R1', params: '7B', vram: '5.1 GB', context: 4096, tag: 'Reasoning' },
	{ id: 'Qwen3-8B-q4f16_1-MLC', name: 'Qwen 3', params: '8B', vram: '5.7 GB', context: 4096, tag: 'Best' },
];

/** Get the context window size (in tokens) for a given model ID. */
export function getModelContext(localModel) {
	const entry = LOCAL_MODELS.find((m) => m.id === localModel);
	return entry?.context || 4096;
}

/** Max output tokens — one third of context, capped at 1024. */
export function getOutputTokens(localModel) {
	return Math.min(1024, Math.floor(getModelContext(localModel) / 3));
}

/** Max characters of page content that fit in a single inference pass. */
export function getAvailableChars(localModel) {
	const available = getModelContext(localModel) - SYSTEM_PROMPT_TOKENS - getOutputTokens(localModel);
	return Math.max(available, 256) * CHARS_PER_TOKEN;
}
