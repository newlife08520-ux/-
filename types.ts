export interface UploadedFile {
  mimeType: string;
  data: string; // Base64
  name: string;
}

export interface AuditResult {
  rawMarkdown: string;
}

export type AuditStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error';

export interface AdminSettings {
  systemPrompt: string;
  modelId: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isError?: boolean;
}
