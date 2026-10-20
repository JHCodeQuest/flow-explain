import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ApprovalCase, Lesson } from "../domain/types.ts";

interface RecordItem { id: string; content: string; source: string; timestamp: number; tags: string[] }
interface Engine {
  store: { all(): RecordItem[] };
  add(input: { content: string; source: string; type: string; tags: string[]; chatId: string; provenance: { origin: string; learnedAt: number; label: string } }): RecordItem;
  query(text: string, opts: { topN: number; threshold: number; chatId: string }): { memories: { memory: RecordItem }[] };
}
export interface MemoryService { save(item: ApprovalCase, text: string): Lesson; recall(item: ApprovalCase): Lesson[] }
const PREFIX = "flow-explain:analyst-note:";

/** Analyst notes remain advice, never findings. Scope every recall to this
 * application's record prefix and the selected scenario before returning it.
 */
export function wrapMemory(engine: Engine): MemoryService {
  function decode(record: RecordItem, item: ApprovalCase): Lesson | undefined {
    if (!record.source.startsWith(PREFIX) || !record.tags.includes(`scenario:${item.scenario}`)) return;
    try {
      const data = JSON.parse(record.content) as Record<string, unknown>;
      if (typeof data.text !== "string" || data.text.length < 20 || data.text.length > 400 || typeof data.caseId !== "string" || !/^FE-\d{3}$/.test(data.caseId)) return;
      return { id: record.id, text: data.text, scenario: item.scenario, sourceCaseId: data.caseId, createdAt: new Date(record.timestamp).toISOString() };
    } catch { return; }
  }
  return {
    save(item, text) {
      const trimmed = text.trim();
      if (trimmed.length < 20 || trimmed.length > 400 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(trimmed)) throw new Error("Analyst notes must contain 20 to 400 readable characters.");
      const content = JSON.stringify({ text: trimmed, caseId: item.id });
      const existing = engine.store.all().find((r) => r.source === PREFIX + item.id && r.content === content);
      const record = existing ?? engine.add({ content, source: PREFIX + item.id, type: "general", tags: ["flow-explain", `scenario:${item.scenario}`],
        chatId: `flow-explain:${item.scenario}`, provenance: { origin: "user_correction", learnedAt: Date.now(), label: "Analyst note, not verified evidence" } });
      const lesson = decode(record, item);
      if (!lesson) throw new Error("Could not read the saved analyst note.");
      return lesson;
    },
    recall(item) {
      const result = engine.query(`${item.scenario} ${item.title}`, { topN: 100, threshold: 0, chatId: `flow-explain:${item.scenario}` });
      return result.memories.flatMap(({ memory }) => { const lesson = decode(memory, item); return lesson ? [lesson] : []; }).slice(0, 3);
    },
  };
}

export async function createMemory(repo: string, persistDir: string): Promise<MemoryService> {
  const entry = path.join(repo, "engines", "hmem", "reference", "src", "index.ts");
  const module = await import(pathToFileURL(entry).href) as { HMEM: new (opts: { persistDir: string }) => Engine };
  return wrapMemory(new module.HMEM({ persistDir }));
}
