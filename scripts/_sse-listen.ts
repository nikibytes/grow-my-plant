import http from "node:http";
import fs from "node:fs";

const slug = process.argv[2] || "community-plant";
const out: string[] = [];
const req = http.get(`http://localhost:3000/api/stream/${slug}`, (res) => {
  res.setEncoding("utf8");
  let buf = "";
  res.on("data", (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const msg = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (msg.includes("event: leaf")) {
        out.push(msg);
        fs.writeFileSync("/tmp/sse-received.json", JSON.stringify(out, null, 2));
        console.log("RECEIVED LEAF EVENT:", msg.split("data: ")[1]);
        process.exit(0);
      }
    }
  });
});
req.on("error", (e) => { console.error("SSE error", e.message); process.exit(1); });
setTimeout(() => { console.error("timeout - no leaf event received"); process.exit(2); }, 8000);
