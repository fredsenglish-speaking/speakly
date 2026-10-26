import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { buildXlsx } from "./xlsx.ts";

/** Reads the files back out of the zip by walking its local headers. */
function unzip(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const data = buf.subarray(i + 30 + nameLen, i + 30 + nameLen + size);
    out.set(name, inflateRawSync(data).toString("utf8"));
    i += 30 + nameLen + size;
  }
  return out;
}

test("builds a workbook with one sheet per entry, escaped text and numbers", () => {
  const files = unzip(
    buildXlsx([
      { name: "Tələbələr", header: ["Ad", "Say"], rows: [["Əli & <Vəli>", 3]] },
      { name: "Müəllimlər", header: ["Müəllim"], rows: [] },
    ]),
  );
  assert.ok(files.has("[Content_Types].xml"));
  assert.match(files.get("xl/workbook.xml")!, /name="Tələbələr".*name="Müəllimlər"/);
  const sheet = files.get("xl/worksheets/sheet1.xml")!;
  assert.match(sheet, /Əli &amp; &lt;Vəli&gt;/);
  assert.match(sheet, /<c r="B2"><v>3<\/v><\/c>/);
  assert.match(sheet, /<autoFilter ref="A1:B2"\/>/);
  assert.ok(files.has("xl/worksheets/sheet2.xml"));
});
