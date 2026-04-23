export type StandaloneArtifactExportKind =
  | 'document-html'
  | 'presentation-html'
  | 'document-email';

export interface StandaloneExportAsset {
  relativePath: string;
  mimeType: string;
  bytesBase64: string;
}

export interface StandaloneArtifactExport {
  kind: StandaloneArtifactExportKind;
  title: string;
  filename: string;
  html: string;
  assets: StandaloneExportAsset[];
}

// TODO(backlog-phase-a): Add shared packaging helpers for standalone artifact exports.
