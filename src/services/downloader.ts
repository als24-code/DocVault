export type DlStatus = 'checking' | 'missing' | 'downloading' | 'paused' | 'ready' | 'error';

export type DlState = {
  status: DlStatus;
  received: number;
  total: number;
  bytesPerSec: number;
  error?: string;
};

export type RangeFetch = {
  promise: Promise<{status: number}>;
  cancel: () => void;
};

export interface Deps {
  dir: string;
  url: string;
  fileName: string;
  minBytes: number;
  exists(path: string): Promise<boolean>;
  size(path: string): Promise<number>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  headSize(url: string): Promise<number>;
  fetchRange(url: string, offset: number, path: string, onProgress: (bytesThisRun: number) => void): RangeFetch;
  now(): number;
}

export class ModelDownloader {
  private state: DlState = {status: 'checking', received: 0, total: 0, bytesPerSec: 0};
  private listeners = new Set<(s: DlState) => void>();
  private current: RangeFetch | null = null;
  private cancelled = false;

  constructor(private d: Deps) {}

  get finalPath() {
    return `${this.d.dir}/${this.d.fileName}`;
  }
  private get partPath() {
    return this.finalPath + '.part';
  }

  getState() {
    return this.state;
  }

  subscribe(fn: (s: DlState) => void) {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private set(patch: Partial<DlState>) {
    this.state = {...this.state, ...patch};
    this.listeners.forEach(l => l(this.state));
  }

  /** Looks at the disk: finished file, partial file, or nothing. */
  async check() {
    await this.d.mkdir(this.d.dir);
    if (await this.d.exists(this.finalPath)) {
      const size = await this.d.size(this.finalPath);
      if (size >= this.d.minBytes) {
        this.set({status: 'ready', received: size, total: size, error: undefined});
        return;
      }
      await this.d.remove(this.finalPath);
    }
    if (await this.d.exists(this.partPath)) {
      const size = await this.d.size(this.partPath);
      this.set({status: 'paused', received: size, error: undefined});
    } else {
      this.set({status: 'missing', received: 0, error: undefined});
    }
  }

  async start() {
    if (this.state.status === 'downloading' || this.state.status === 'ready') return;
    this.cancelled = false;
    this.set({status: 'downloading', error: undefined, bytesPerSec: 0});
    try {
      await this.d.mkdir(this.d.dir);
      let total = 0;
      try {
        total = await this.d.headSize(this.d.url);
      } catch {
        total = 0; // size unknown; the final size check falls back to minBytes
      }
      let offset = (await this.d.exists(this.partPath)) ? await this.d.size(this.partPath) : 0;
      if (total && offset > total) {
        await this.d.remove(this.partPath);
        offset = 0;
      }
      this.set({received: offset, total});

      if (!total || offset < total) {
        const startedAt = this.d.now();
        let lastEmit = 0;
        const run = this.d.fetchRange(this.d.url, offset, this.partPath, got => {
          const t = this.d.now();
          if (t - lastEmit < 300) return;
          lastEmit = t;
          const secs = Math.max(0.001, (t - startedAt) / 1000);
          this.set({received: offset + got, bytesPerSec: got / secs});
        });
        this.current = run;
        const res = await run.promise;
        this.current = null;
        if (res.status !== 200 && res.status !== 206) {
          throw new Error(`Download server answered with status ${res.status}.`);
        }
        if (offset > 0 && res.status === 200) {
          await this.d.remove(this.partPath);
          this.set({status: 'missing', received: 0, error: 'The server does not support resuming. Please start the download again.'});
          return;
        }
      }

      const size = await this.d.size(this.partPath);
      if (total && size > total) {
        await this.d.remove(this.partPath);
        throw new Error('The downloaded file is larger than expected. Please try again.');
      }
      if ((total && size < total) || size < this.d.minBytes) {
        this.set({status: 'paused', received: size, error: 'The connection ended early. Tap Resume to continue.'});
        return;
      }
      await this.d.move(this.partPath, this.finalPath);
      this.set({status: 'ready', received: size, total: size, bytesPerSec: 0});
    } catch (e: any) {
      this.current = null;
      const size = (await this.d.exists(this.partPath)) ? await this.d.size(this.partPath) : 0;
      if (this.cancelled) {
        this.set({status: 'paused', received: size, bytesPerSec: 0});
      } else {
        this.set({
          status: size > 0 ? 'paused' : 'error',
          received: size,
          bytesPerSec: 0,
          error: (e && e.message) || 'Download failed. Check your connection and try again.',
        });
      }
    }
  }

  pause() {
    if (this.state.status !== 'downloading') return;
    this.cancelled = true;
    this.current?.cancel();
  }

  async remove() {
    this.pause();
    if (await this.d.exists(this.finalPath)) await this.d.remove(this.finalPath);
    if (await this.d.exists(this.partPath)) await this.d.remove(this.partPath);
    this.set({status: 'missing', received: 0, total: 0, error: undefined});
  }
}
