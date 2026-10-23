import { test } from "node:test";
import assert from "node:assert/strict";
import { readBoundedHealthBody } from "../staging-health.mjs";

test("accepts exact decoded bytes across chunks, including UTF-8 split boundaries", async () => {
  const original = Buffer.from("ação sintética"), parts = [original.subarray(0, 2), original.subarray(2)];
  const response = new Response(new ReadableStream({ pull(c) { const v=parts.shift(); if(v)c.enqueue(v); else c.close(); } }));
  assert.deepEqual(await readBoundedHealthBody(response,original.length), original);
});

test("cancels a growing stream before consuming remaining chunks despite a false length", async () => {
  let produced=0, cancelled=false;
  const response = new Response(new ReadableStream({ pull(c) { produced++; c.enqueue(new Uint8Array(4)); }, cancel() { cancelled=true; } }, {highWaterMark:0}), {headers:{"content-length":"1"}});
  await assert.rejects(readBoundedHealthBody(response,8), /exceeds its byte bound/);
  assert.equal(cancelled,true);
  assert.equal(produced,3);
});

test("rejects one oversized chunk even without Content-Length", async () => {
  let cancelled=false;
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(65)); }, cancel() { cancelled=true; } }));
  await assert.rejects(readBoundedHealthBody(response,64), /exceeds its byte bound/);
  assert.equal(cancelled,true);
});

test("fails on a truncated transport instead of reporting a partial successful read", async () => {
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(2)); c.error(new Error("synthetic transport closed")); } }));
  await assert.rejects(readBoundedHealthBody(response,10), /synthetic transport closed/);
});
