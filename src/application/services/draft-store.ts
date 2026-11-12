import type { DraftContent, DraftContext, DraftHead, DraftPut, DraftReply } from "../../domain/drafts/draft";
export interface DraftRepository {
  instance(): Promise<string>;
  list(gameId?: string, offset?: number): Promise<{ drafts: DraftHead[]; total: number }>;
  create(context: DraftContext): Promise<DraftHead>;
  get(id: string, revision?: number): Promise<DraftReply>;
  put(id: string, expectedRevision: number, key: string, input: DraftPut): Promise<DraftHead>;
  confirmed(id: string, revision: number, sceneId: string, sceneRevision: number): Promise<void>;
  remove(id: string, revision: number): Promise<void>;
}
export interface DraftRemote {
  capabilities(): Promise<{ instanceId: string } | null>;
  list(gameId?: string, offset?: number): Promise<{ drafts: DraftHead[]; total: number }>;
  create(context: DraftContext, key: string): Promise<DraftHead>;
  get(id: string, revision?: number): Promise<DraftReply>;
  put(id: string, revision: number, key: string, input: DraftPut): Promise<DraftHead>;
  remove(id: string, revision: number): Promise<void>;
}
export interface DraftSnapshot { content: DraftContent; context: DraftContext }
