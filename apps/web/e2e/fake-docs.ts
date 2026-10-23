/**
 * Documents on "another site" for the Preview tool's e2e specs. /cors/ answers with
 * Access-Control-Allow-Origin, so the browser reads it directly; /plain/ doesn't, so
 * the tool falls back to the server's fetch (which e2e allows to reach this host:
 * PREVIEW_ALLOW_HOSTS in playwright.config.ts). Started by playwright.config.ts.
 */
import { createServer } from "node:http";

export const FAKE_DOCS_PORT = 4333;
export const FAKE_DOCS = `http://127.0.0.1:${String(FAKE_DOCS_PORT)}`;

/** A one-page PDF with a line of text, xref offsets and all. */
export function samplePdf(text: string): Buffer {
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  for (const offset of offsets)
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

const FILES: Record<string, { type: string; body: Buffer | string }> = {
  "notes.md": {
    type: "text/markdown",
    body: "# Meeting notes\n\n- Ship the **preview** tool\n- [Docs](https://example.com/docs)\n",
  },
  "table.csv": {
    type: "text/csv",
    body: "City,Population\nChengdu,21000000\n",
  },
  "report.pdf": {
    type: "application/pdf",
    body: samplePdf("Hello from a PDF"),
  },
};

function serve() {
  createServer((request, response) => {
    const url = new URL(request.url ?? "/", FAKE_DOCS);
    if (url.pathname === "/health") {
      response.end("ok");
      return;
    }
    const [, mode = "", name = ""] = url.pathname.split("/");
    const file = FILES[name];
    if (!file || (mode !== "cors" && mode !== "plain")) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": file.type,
      ...(mode === "cors" ? { "Access-Control-Allow-Origin": "*" } : {}),
    });
    response.end(file.body);
  }).listen(FAKE_DOCS_PORT, "127.0.0.1", () => {
    console.log(`Fake documents on ${FAKE_DOCS}`);
  });
}

if (import.meta.main) serve();
