import fs from "node:fs";
import path from "node:path";
import { loadConfig, ROOT } from "./config.ts";
import { FlowService } from "./service.ts";
import { createFlowServer } from "./http.ts";
import { createMemory } from "../integrations/memory.ts";
import { explainWithNvidia } from "../integrations/nvidia.ts";
import { loadZetarisDataset } from "../integrations/zetaris.ts";
import type { Dataset } from "../domain/types.ts";

async function main(): Promise<void> {
  const config = loadConfig();
  const dataset: Dataset = JSON.parse(fs.readFileSync(path.join(ROOT, "data/demo.json"), "utf8"));
  let memory;
  try { memory = await createMemory(config.meterlessRepo, config.memoryDir); }
  catch { console.log("H-MEM is unavailable. Configure METERLESS_REPO to enable analyst notes."); }
  const sourceConfigured = fs.existsSync(path.join(config.zetarisRepo, "scripts", "zetaris_sql.py")) && fs.existsSync(config.envFile);
  const service = new FlowService(dataset, { memory,
    zetaris: sourceConfigured ? (caseId) => loadZetarisDataset(dataset, caseId, { repo: config.zetarisRepo, envFile: config.envFile, python: config.python }) : undefined,
    explain: config.nvidiaKey ? (result) => explainWithNvidia(result, config) : undefined });
  const server = createFlowServer(service, path.join(ROOT, "dist"));
  server.once("error", () => { console.error("FlowExplain could not start. Check FLOW_PORT and local configuration."); process.exitCode = 1; });
  server.listen(config.port, "127.0.0.1", () => console.log(`FlowExplain local preview: http://127.0.0.1:${config.port}`));
}
main().catch(() => { console.error("FlowExplain startup failed. Check local path and provider configuration; no secret values were printed."); process.exitCode = 1; });
