import {initLlama, LlamaContext} from 'llama.rn';
import {LLM} from '../config';
import {buildMessages} from '../core/prompt';
import {Hit} from '../core/types';

let ctx: LlamaContext | null = null;
let loading: Promise<void> | null = null;

export function isLoaded() {
  return ctx !== null;
}

export function loadModel(path: string): Promise<void> {
  if (ctx) return Promise.resolve();
  if (!loading) {
    loading = initLlama({
      model: path,
      n_ctx: LLM.nCtx,
      n_batch: LLM.nBatch,
      n_ubatch: LLM.nBatch,
      n_threads: LLM.nThreads,
      n_parallel: 1, 
      n_gpu_layers: LLM.gpuLayers, 
      use_mmap: true, 
      use_mlock: false, 
    })
      .then(c => {
        ctx = c;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export async function unloadModel() {
  const c = ctx;
  ctx = null;
  if (c) await c.release();
}

export async function ask(
  question: string,
  hits: Hit[],
  onToken: (textSoFar: string) => void,
): Promise<string> {
  if (!ctx) throw new Error('The model is not loaded yet.');
  let acc = '';
  const res = await ctx.completion(
    {
      messages: buildMessages(question, hits),
      n_predict: LLM.maxAnswerTokens,
      temperature: 0.1, // factual extraction, not creative writing
      top_p: 0.9,
      top_k: 40,
      stop: ['<|im_end|>', '<|endoftext|>'],
    },
    d => {
      acc += d.token;
      onToken(acc);
    },
  );
  return (res.content ?? res.text ?? acc).trim();
}

export function stop() {
  return ctx ? ctx.stopCompletion() : Promise.resolve();
}
