export interface SavedFile {
  /** Storage-relative key — stable regardless of the provider's underlying host/disk layout. */
  path: string;
  /** Fully-qualified, directly fetchable URL. */
  url: string;
}

export interface StorageProvider {
  save(buffer: Buffer, extension: string): Promise<SavedFile>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
