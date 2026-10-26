export const MODEL = {
  name: 'Qwen2.5-1.5B-Instruct',
  quant: 'Q4_K_M',
  fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
  minBytes: 900 * 1024 * 1024,
  approxGB: '1.0',
};

export const LLM = {
  nCtx: 3072,
  nBatch: 512,
  nThreads: 4,
  maxAnswerTokens: 300,
  topK: 3,
  gpuLayers: 0,
};

export const INGEST = {
  maxPdfPages: 60,
  pdfRenderWidth: 1600,
};
