import {Deps, ModelDownloader} from '../src/services/downloader';

const TOTAL = 1000;

function makeDeps(opts: {ignoreRange?: boolean; dropAfter?: number; headFails?: boolean} = {}) {
  const files = new Map<string, number>();
  const ranges: number[] = [];
  let cancelRun: (() => void) | null = null;
  const deps: Deps = {
    dir: '/m',
    url: 'u',
    fileName: 'model.gguf',
    minBytes: 900,
    exists: async p => files.has(p),
    size: async p => files.get(p) || 0,
    remove: async p => void files.delete(p),
    move: async (a, b) => {
      files.set(b, files.get(a)!);
      files.delete(a);
    },
    mkdir: async () => {},
    headSize: async () => {
      if (opts.headFails) throw new Error('no head');
      return TOTAL;
    },
    fetchRange: (_u, offset, path, onProgress) => {
      ranges.push(offset);
      let rejectFn: (e: Error) => void = () => {};
      const promise = new Promise<{status: number}>((resolve, reject) => {
        rejectFn = reject;
        const start = opts.ignoreRange ? 0 : offset;
        let end = TOTAL;
        if (opts.dropAfter !== undefined) end = start + opts.dropAfter;
        files.set(path, (files.get(path) || 0) + (end - start));
        onProgress(end - start);
        resolve({status: opts.ignoreRange ? 200 : offset > 0 ? 206 : 200});
      });
      cancelRun = () => rejectFn(new Error('cancelled'));
      return {promise, cancel: () => cancelRun && cancelRun()};
    },
    now: (() => {
      let t = 0;
      return () => (t += 1000);
    })(),
  };
  return {deps, files, ranges};
}

describe('ModelDownloader', () => {
  it('downloads and finalizes', async () => {
    const {deps, files} = makeDeps();
    const d = new ModelDownloader(deps);
    await d.check();
    expect(d.getState().status).toBe('missing');
    await d.start();
    expect(d.getState().status).toBe('ready');
    expect(files.get('/m/model.gguf')).toBe(TOTAL);
    expect(files.has('/m/model.gguf.part')).toBe(false);
  });

  it('resumes from the partial file with a Range offset', async () => {
    const {deps, files, ranges} = makeDeps({dropAfter: 400});
    const d = new ModelDownloader(deps);
    await d.check();
    await d.start();
    expect(d.getState().status).toBe('paused');
    expect(d.getState().received).toBe(400);
    expect(files.get('/m/model.gguf.part')).toBe(400);

    const d2 = new ModelDownloader({
      ...deps,
      fetchRange: (u, off, p, cb) => {
        ranges.push(off);
        files.set(p, (files.get(p) || 0) + (TOTAL - off));
        cb(TOTAL - off);
        return {promise: Promise.resolve({status: 206}), cancel: () => {}};
      },
    });
    await d2.check();
    expect(d2.getState()).toMatchObject({status: 'paused', received: 400});
    await d2.start();
    expect(ranges).toEqual([0, 400]);
    expect(d2.getState().status).toBe('ready');
    expect(files.get('/m/model.gguf')).toBe(TOTAL);
  });

  it('recovers when the server ignores Range', async () => {
    const {deps, files} = makeDeps({ignoreRange: true, dropAfter: 400});
    const d = new ModelDownloader(deps);
    await d.check();
    await d.start(); 
    await d.start(); 
    expect(d.getState().status).toBe('missing');
    expect(d.getState().error).toMatch(/resuming/);
    expect(files.has('/m/model.gguf.part')).toBe(false);
  });

  it('works when the HEAD request fails', async () => {
    const {deps} = makeDeps({headFails: true});
    const d = new ModelDownloader(deps);
    await d.check();
    await d.start();
    expect(d.getState().status).toBe('ready');
  });

  it('rejects a file that is too small', async () => {
    const {deps, files} = makeDeps({headFails: true, dropAfter: 300});
    const d = new ModelDownloader(deps);
    await d.check();
    await d.start();
    expect(d.getState().status).toBe('paused');
    expect(files.has('/m/model.gguf')).toBe(false);
  });

  it('pause cancels without an error', async () => {
    const {deps} = makeDeps();
    deps.fetchRange = () => {
      let rej: (e: Error) => void = () => {};
      const promise = new Promise<{status: number}>((_, r) => (rej = r));
      return {promise, cancel: () => rej(new Error('cancelled'))};
    };
    const d = new ModelDownloader(deps);
    await d.check();
    const run = d.start();
    await new Promise(r => setTimeout(r, 5));
    d.pause();
    await run;
    expect(d.getState().status).toBe('paused');
    expect(d.getState().error).toBeUndefined();
  });

  it('detects an already finished model on launch', async () => {
    const {deps, files} = makeDeps();
    files.set('/m/model.gguf', TOTAL);
    const d = new ModelDownloader(deps);
    await d.check();
    expect(d.getState().status).toBe('ready');
  });
});
