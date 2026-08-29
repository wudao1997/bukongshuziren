// OpenClaw 本地工具服务：为 OpenClaw / 小龙虾提供可控的 HTTP 调用入口。
const http = require("http");

function readRequestText(req) {
  return new Promise((resolve, reject) => {
    let text = "";
    req.on("data", (chunk) => {
      text += chunk.toString("utf-8");
      if (text.length > 1024 * 1024 * 2) {
        reject(new Error("request body too large"));
        try {
          req.destroy();
        } catch {}
      }
    });
    req.on("end", () => resolve(text));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRequestText(req);
  if (!String(raw || "").trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`invalid json: ${String(e?.message || e)}`);
  }
}

function sendJson(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": body.length
  });
  res.end(body);
}

function pickPathValue(source, refPath) {
  const parts = String(refPath || "")
    .split(".")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) {
      throw new Error(`未找到引用：${refPath}`);
    }
    current = current[part];
  }
  return current;
}

function resolveArgRefs(input, outputs) {
  if (Array.isArray(input)) return input.map((item) => resolveArgRefs(item, outputs));
  if (!input || typeof input !== "object") return input;
  if (typeof input.$ref === "string" && Object.keys(input).length === 1) {
    return pickPathValue(outputs, input.$ref);
  }
  const next = {};
  for (const [key, value] of Object.entries(input)) {
    next[key] = resolveArgRefs(value, outputs);
  }
  return next;
}

function normalizeToolList(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    name: String(item?.name || "").trim(),
    description: String(item?.description || "").trim(),
    inputSchema: item?.inputSchema || {},
    outputSchema: item?.outputSchema || {}
  }));
}

async function runPlanSteps(steps, runTool, context = {}) {
  const outputs = { $context: context && typeof context === "object" ? context : {} };
  const results = [];
  const list = Array.isArray(steps) ? steps : [];
  for (let index = 0; index < list.length; index += 1) {
    const step = list[index] && typeof list[index] === "object" ? list[index] : {};
    const tool = String(step.tool || "").trim();
    if (!tool) throw new Error(`第 ${index + 1} 步缺少 tool`);
    const args = resolveArgRefs(step.args && typeof step.args === "object" ? step.args : {}, outputs);
    const result = await runTool({
      tool,
      args,
      context,
      stepIndex: index,
      step
    });
    results.push({
      index,
      tool,
      ok: result?.ok !== false,
      data: result
    });
    if (result?.ok === false) {
      return {
        ok: false,
        failedStep: index,
        failedTool: tool,
        results,
        outputs
      };
    }
    const saveAs = String(step.saveAs || "").trim();
    if (saveAs) outputs[saveAs] = result;
  }
  return { ok: true, results, outputs };
}

function createOpenClawToolService(options = {}) {
  const host = String(options.host || "127.0.0.1").trim() || "127.0.0.1";
  const port = Math.max(1, Number(options.port || 37231) || 37231);
  const serviceName = String(options.serviceName || "openclaw-ipfactory-tools").trim() || "openclaw-ipfactory-tools";
  const getStatus = typeof options.getStatus === "function" ? options.getStatus : () => ({});
  const listTools = typeof options.listTools === "function" ? options.listTools : () => [];
  const runTool = typeof options.runTool === "function" ? options.runTool : async () => ({ ok: false, message: "tool runner not configured" });
  const onLog = typeof options.onLog === "function" ? options.onLog : () => {};

  let server = null;
  let startedAt = 0;

  const handleRequest = async (req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    try {
      if (method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, {
          ok: true,
          service: serviceName,
          host,
          port,
          startedAt,
          tools: normalizeToolList(await Promise.resolve(listTools())).length,
          status: await Promise.resolve(getStatus())
        });
      }

      if ((method === "GET" || method === "POST") && url.pathname === "/tools/list") {
        const tools = normalizeToolList(await Promise.resolve(listTools()));
        return sendJson(res, 200, {
          ok: true,
          service: serviceName,
          tools
        });
      }

      if (method === "POST" && url.pathname === "/tools/run") {
        const body = await readJsonBody(req);
        const tool = String(body?.tool || "").trim();
        const args = body?.args && typeof body.args === "object" ? body.args : {};
        if (!tool) return sendJson(res, 400, { ok: false, message: "missing tool" });
        const result = await runTool({
          tool,
          args,
          context: body?.context && typeof body.context === "object" ? body.context : {},
          requestBody: body
        });
        return sendJson(res, result?.ok === false ? 400 : 200, result);
      }

      if (method === "POST" && url.pathname === "/plan/run") {
        const body = await readJsonBody(req);
        const goal = String(body?.goal || "").trim();
        const context = body?.context && typeof body.context === "object" ? body.context : {};
        const steps = Array.isArray(body?.steps) ? body.steps : [];
        if (!steps.length) return sendJson(res, 400, { ok: false, message: "missing steps", goal });
        const result = await runPlanSteps(steps, runTool, context);
        return sendJson(res, result?.ok === false ? 400 : 200, {
          ok: result.ok,
          goal,
          ...result
        });
      }

      return sendJson(res, 404, {
        ok: false,
        message: `not found: ${method} ${url.pathname}`
      });
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        message: String(e?.message || e)
      });
    }
  };

  return {
    async start() {
      if (server) {
        return { ok: true, host, port, startedAt };
      }
      const nextServer = http.createServer((req, res) => {
        handleRequest(req, res).catch((error) => {
          sendJson(res, 500, { ok: false, message: String(error?.message || error) });
        });
      });
      await new Promise((resolve, reject) => {
        nextServer.once("error", reject);
        nextServer.listen(port, host, () => resolve());
      }).catch((error) => {
        try {
          nextServer.close();
        } catch {}
        throw error;
      });
      server = nextServer;
      startedAt = Date.now();
      try {
        onLog("info", `OpenClaw 工具服务已启动：http://${host}:${port}`);
      } catch {}
      return { ok: true, host, port, startedAt };
    },
    async stop() {
      if (!server) return { ok: true };
      const current = server;
      server = null;
      await new Promise((resolve) => current.close(() => resolve()));
      try {
        onLog("info", `OpenClaw 工具服务已停止：${serviceName}`);
      } catch {}
      return { ok: true };
    },
    getState() {
      return {
        ok: true,
        host,
        port,
        startedAt,
        running: !!server,
        service: serviceName
      };
    }
  };
}

module.exports = {
  createOpenClawToolService,
  runOpenClawPlanSteps: runPlanSteps
};
