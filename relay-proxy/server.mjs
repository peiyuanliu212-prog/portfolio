// Dumb reverse proxy: public entry on this host's domain, forwards
// everything to the Cloudflare Worker (which holds KV, quota, secrets).
// No state, no secrets here.
import http from "node:http";

const UPSTREAM = "https://image-relay.peiyuanliu212.workers.dev";

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (["host", "connection", "content-length"].includes(k)) continue;
      headers[k] = v;
    }
    const resp = await fetch(UPSTREAM + req.url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
      redirect: "manual",
    });
    const out = {};
    resp.headers.forEach((v, k) => { if (k !== "content-length") out[k] = v; });
    res.writeHead(resp.status, out);
    res.end(Buffer.from(await resp.arrayBuffer()));
  } catch (e) {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("通道暂时不可用，请稍后再试");
  }
});

server.listen(process.env.PORT || 10000, () => console.log("relay proxy up"));
