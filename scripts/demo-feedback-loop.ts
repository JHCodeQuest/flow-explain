// Mock runtime — scripted responses. Offline demo of the draft/check/revise loop; not a live provider.
// Uses the real FlowExplain server and adapter against a scripted loopback runtime, with no secrets or memory.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../src/server/config.ts";
import { createFlowServer } from "../src/server/http.ts";
import { FlowService } from "../src/server/service.ts";
import { explainWithNightshift } from "../src/integrations/meterless.ts";
import { MOCK_LABEL, MOCK_TOKEN, startMockRuntime } from "../tests/fixtures/mock-nightshift.ts";
import type { Dataset } from "../src/domain/types.ts";

const dataset: Dataset = JSON.parse(fs.readFileSync(path.join(ROOT, "data/demo.json"), "utf8"));
const runtime = await startMockRuntime();
const config = { meterlessBase: runtime.base, meterlessToken: MOCK_TOKEN, meterlessModel: "meterless/auto" };
const service = new FlowService(dataset, { explainProvider: MOCK_LABEL,
  explain: async (result) => ({ ...await explainWithNightshift(result, config), provider: MOCK_LABEL }) });
const server = createFlowServer(service, path.join(ROOT, "dist"));
const port = Number(process.env.FLOW_PORT || 4318);
server.listen(port, "127.0.0.1", () => console.log(`${MOCK_LABEL}\nFlowExplain demo: http://127.0.0.1:${port}\nTick the explanation box and investigate FE-101..FE-104.\nExpected: FE-102 accepted, FE-101 and FE-104 revised, FE-103 returned.`));
process.on("SIGINT", () => { console.log("Completions per case:", JSON.stringify(runtime.calls)); process.exit(0); });
