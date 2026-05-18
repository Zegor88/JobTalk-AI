import { createRequestHandler } from "react-router";
import * as build from "../build/server/index.js";

const mode = process.env.NODE_ENV ?? "production";
process.env.NODE_ENV = mode;

const handleRequest = createRequestHandler(build, mode);

function nodeHeadersToWeb(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else {
      headers.set(name, value);
    }
  }
  return headers;
}

function nodeReqToWeb(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = new URL(req.url, `${proto}://${host}`);
  const init = {
    method: req.method,
    headers: nodeHeadersToWeb(req),
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req;
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function writeWebResponseToNode(response, res) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export default async function handler(req, res) {
  try {
    const request = nodeReqToWeb(req);
    const response = await handleRequest(request);
    await writeWebResponseToNode(response, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain");
    res.end(`Internal Server Error\n${err?.stack ?? err}`);
  }
}
