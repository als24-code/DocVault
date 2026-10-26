export type Chunk = {
  id: string;
  docId: string;
  docName: string;
  page: number;
  text: string;
};

export type DocKind = 'pdf' | 'image' | 'text' | 'note' | 'sample';

export type VaultDoc = {
  id: string;
  name: string;
  kind: DocKind;
  addedAt: number;
  pageCount: number;
  chunks: Chunk[];
};

export type PageText = { page: number; text: string };

export type Hit = { chunk: Chunk; score: number; coverage: number };

export type Citation = { n: number; chunk: Chunk };

export type Answer = {
  text: string;
  citations: Citation[];
  notFound: boolean;
  unverifiedFigures: string[];
};
