import { investigate } from "../domain/investigate.ts";
import type { Dataset, Investigation, Lesson } from "../domain/types.ts";
import type { MemoryService } from "../integrations/memory.ts";

interface Services {
  memory?: MemoryService;
  zetaris?: (caseId: string) => Promise<Dataset>;
  explain?: (result: Investigation) => Promise<Investigation["narrative"]>;
}
export class FlowService {
  constructor(private dataset: Dataset, private adapters: Services) {}

  list() {
    return { cases: this.dataset.cases, asOf: this.dataset.asOf, synthetic: true as const,
      status: { memory: !!this.adapters.memory, zetaris: !!this.adapters.zetaris, nvidia: !!this.adapters.explain } };
  }

  async investigate(caseId: string, source: "fixture" | "zetaris", explain: boolean): Promise<Investigation> {
    const item = this.dataset.cases.find((c) => c.id === caseId);
    if (!item) throw new Error("Unknown case.");
    if (source === "zetaris" && !this.adapters.zetaris) throw new Error("Zetaris is not configured.");
    const dataset = source === "zetaris" ? await this.adapters.zetaris!(caseId) : this.dataset;
    const result = investigate(dataset, caseId);
    result.source = source;
    result.sourceLabel = source === "zetaris" ? "Zetaris read-only join of synthetic snapshots" : "Local synthetic fixtures";
    result.lessons = this.adapters.memory?.recall(item) ?? [];
    if (explain) result.narrative = this.adapters.explain ? await this.adapters.explain(result) : { status: "unavailable", text: "", reason: "NVIDIA is not configured. The evidence-based findings are unchanged." };
    return result;
  }

  saveLesson(caseId: string, text: string): Lesson {
    const item = this.dataset.cases.find((c) => c.id === caseId);
    if (!item || !this.adapters.memory) throw new Error("Memory or case unavailable.");
    return this.adapters.memory.save(item, text);
  }
}
