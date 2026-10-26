import ReactNativeBlobUtil from 'react-native-blob-util';
import {MODEL} from '../config';
import {Deps, ModelDownloader} from './downloader';

const fs = ReactNativeBlobUtil.fs;

const deps: Deps = {
  dir: `${fs.dirs.DocumentDir}/models`,
  url: MODEL.url,
  fileName: MODEL.fileName,
  minBytes: MODEL.minBytes,
  exists: p => fs.exists(p),
  size: async p => Number((await fs.stat(p)).size),
  remove: async p => {
    await fs.unlink(p);
  },
  move: async (a, b) => {
    await fs.mv(a, b);
  },
  mkdir: async p => {
    if (!(await fs.isDir(p))) await fs.mkdir(p);
  },
  headSize: async url => {
    const res = await fetch(url, {method: 'HEAD'});
    return Number(res.headers.get('content-length') || 0);
  },
  fetchRange: (url, offset, path, onProgress) => {
    const task = ReactNativeBlobUtil.config({
      fileCache: true,
      path,
      overwrite: false, // append to the .part file: this is what makes resume work
    }).fetch('GET', url, offset > 0 ? {Range: `bytes=${offset}-`} : {});
    task.progress({count: 100, interval: 400}, received => onProgress(Number(received)));
    return {
      promise: task.then(r => ({status: r.info().status})),
      cancel: () => task.cancel(() => {}),
    };
  },
  now: () => Date.now(),
};

export const modelDownloader = new ModelDownloader(deps);
