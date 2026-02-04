import { randomUUID } from "node:crypto";

export type AnalyticsEvent = {
  id: string;
  playerRef: string;
  event: string;
  sessionId?: string | null;
  meta?: Record<string, any> | null;
  createdAt: number;
};

export interface AnalyticsStore {
  record(entry: Omit<AnalyticsEvent, "id" | "createdAt">): Promise<AnalyticsEvent>;
}

export class InMemoryAnalyticsStore implements AnalyticsStore {
  private events: AnalyticsEvent[] = [];

  async record(entry: Omit<AnalyticsEvent, "id" | "createdAt">): Promise<AnalyticsEvent> {
    const full: AnalyticsEvent = { ...entry, id: randomUUID(), createdAt: Date.now() };
    this.events.push(full);
    return full;
  }
}
