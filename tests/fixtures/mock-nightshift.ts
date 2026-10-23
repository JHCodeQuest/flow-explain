import http from "node:http";

export const MOCK_LABEL = "Mock runtime — scripted responses";
export const MOCK_TOKEN = "synthetic-mock-token";
const d = (summary: string, citations: string[]) => JSON.stringify({ summary, citations });
// [first draft, revision]. FE-101 revises, FE-102 is accepted, FE-103 fails twice, FE-104 revises.
const SCRIPT: Record<string, [string, string]> = {
  "FE-101": [d("The manager has not approved this request, so finance never received it.", ["E-103", "R-02"]),
    d("Manager approval completed (E-102); the finance assignment then failed (E-103) under R-02. A person should check the destination group.", ["E-102", "E-103", "R-02"])],
  "FE-102": [d("Manager approval has been pending past the review window (E-202, R-01). This does not establish why. A person should confirm the task reached the intended role.", ["E-202", "R-01"]), ""],
  "FE-103": [d("The supplier request failed validation (E-301, R-03) and is also tied to E-999.", ["E-301", "R-03", "E-999"]),
    d("The supplier request failed validation (E-301, R-03); the destination group is missing.", ["E-301", "R-03"])],
  "FE-104": [d("This stall was caused by a connector outage (E-401, R-04).", ["E-401", "R-04"]),
    d("Evidence is insufficient to name a cause (E-401, R-04). A person should inspect the run history.", ["E-401", "R-04"])],
};

/** Loopback stand-in for the Nightshift runtime. Replies come from a fixed script keyed by
 * case, so a demo or test can force an accepted, revised or returned outcome. Test/demo only.
 */
export async function startMockRuntime() {
  const calls: { caseId: string; revision: boolean }[] = [];
  const server = http.createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${MOCK_TOKEN}`) { response.writeHead(401).end(); return; }
    if (request.url === "/v1/models") { response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: [{ id: "meterless/auto" }] })); return; }
    const chunks: Buffer[] = [];
    request.on("data", (c) => chunks.push(c)).on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { messages: { content: string }[] };
      const context = JSON.parse(body.messages[1].content) as { case: { id: string }; revision?: unknown };
      const revision = !!context.revision;
      calls.push({ caseId: context.case.id, revision });
      const content = SCRIPT[context.case.id]?.[revision ? 1 : 0] ?? "";
      // The reasoning field must never reach the browser; the sentinel lets tests prove that.
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ model: "mock-runtime/scripted-responses", choices: [{ message: { content, reasoning_content: "MOCK-HIDDEN-REASONING" } }] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return { calls, port, base: `http://127.0.0.1:${port}/v1`, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}
