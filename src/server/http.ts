import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { FlowService } from "./service.ts";

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

async function readBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers["content-type"]?.split(";")[0] !== "application/json") throw new HttpError(415, "Use a JSON request body.");
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2048) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new HttpError(400, "Invalid JSON request."); }
}

/** Local capability boundary, not a production multi-user authentication system.
 * Reject cross-origin and invalid-token requests before any integration access.
 */
export function createFlowServer(service: FlowService, dist: string): http.Server {
  const token = randomBytes(32).toString("base64url");
  let running = false;
  const server = http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status: number, value: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(value));
    };
    try {
      const address = server.address();
      const port = address && typeof address !== "string" ? address.port : 0;
      const host = request.headers.host;
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) throw new HttpError(403, "Local host required.");
      if (request.headers.origin && request.headers.origin !== `http://${host}`) throw new HttpError(403, "Same-origin access required.");
      if (request.headers["sec-fetch-site"] === "cross-site") throw new HttpError(403, "Cross-site access rejected.");
      const url = new URL(request.url || "/", `http://${host}`);
      if (url.pathname.startsWith("/api/")) {
        if (url.pathname === "/api/session" && request.method === "GET") return json(200, { token });
        const supplied = request.headers["x-flow-token"];
        if (typeof supplied !== "string" || supplied.length !== token.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) throw new HttpError(401, "Open the local app to establish a session.");
        if (url.pathname === "/api/cases" && request.method === "GET") return json(200, service.list());
        if (request.method !== "POST" || !["/api/investigate", "/api/lessons"].includes(url.pathname)) throw new HttpError(404, "API route not found.");
        const body = await readBody(request);
        if (typeof body.caseId !== "string" || !service.list().cases.some((c) => c.id === body.caseId)) throw new HttpError(400, "Select a known synthetic case.");
        if (url.pathname === "/api/lessons") {
          if (Object.keys(body).some((key) => !["caseId", "text"].includes(key)) || typeof body.text !== "string" || body.text.trim().length < 20 || body.text.trim().length > 400 || /[\x00-\x1f\x7f]/.test(body.text)) throw new HttpError(400, "Use a 20 to 400 character single-line synthetic analyst note.");
          if (!service.list().status.memory) throw new HttpError(503, "H-MEM is not configured.");
          return json(201, service.saveLesson(body.caseId, body.text));
        }
        if (Object.keys(body).some((key) => !["caseId", "source", "explain"].includes(key)) || typeof body.source !== "string" || !["fixture", "zetaris"].includes(body.source) || typeof body.explain !== "boolean") throw new HttpError(400, "Select fixture or zetaris and an explicit explanation choice.");
        if (running) throw new HttpError(429, "An investigation is already running. Wait for it to finish.");
        running = true;
        try { return json(200, await service.investigate(body.caseId, body.source as "fixture" | "zetaris", body.explain)); }
        finally { running = false; }
      }
      if (request.method !== "GET" && request.method !== "HEAD") throw new HttpError(405, "Method not allowed.");
      // Serve only generated entry/assets. Env files, source and arbitrary paths
      // never enter the filesystem resolver, including encoded traversal strings.
      const name = url.pathname === "/" ? "index.html" : url.pathname.startsWith("/assets/") && /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url.pathname) ? url.pathname.slice(1) : "";
      if (!name || name.includes("..")) throw new HttpError(404, "Page not found.");
      const file = path.join(dist, name);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new HttpError(404, "Build the local interface before starting.");
      const extension = path.extname(file);
      const type = extension === ".html" ? "text/html; charset=utf-8" : extension === ".js" ? "text/javascript; charset=utf-8" : extension === ".css" ? "text/css; charset=utf-8" : "application/octet-stream";
      response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      response.end(request.method === "HEAD" ? undefined : fs.readFileSync(file));
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      // External exceptions can carry credentials, source content or paths.
      return json(503, { error: "The investigation could not complete. Check the selected local integration and try again. No source fallback was used." });
    }
  });
  server.requestTimeout = 150_000;
  server.headersTimeout = 10_000;
  return server;
}
