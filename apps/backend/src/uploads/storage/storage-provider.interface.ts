import type { Readable } from 'node:stream';

export interface SavedFile {
  /** Storage-relative key — stable regardless of the provider's underlying host/disk layout. */
  path: string;
  /** Fully-qualified, directly fetchable URL. */
  url: string;
}

export interface StorageProvider {
  save(buffer: Buffer, extension: string): Promise<SavedFile>;
  /** Reads a previously saved file by its `SavedFile.path` key. */
  open(path: string): Promise<Readable>;
  /** Removes a previously saved file by its `SavedFile.path` key. */
  delete(path: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
