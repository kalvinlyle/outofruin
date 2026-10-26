// Minimal zip writer (deflate, no zip64) for the OTA fallback bundle, so the
// Vercel build needs neither the `zip` binary nor an npm install.
// The bundle is ~75 MB in a few hundred files, well inside zip's 4 GB / 65535-entry limits.
import { deflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Write `entries` ({ name, path }) into one zip at `out`. Names are the paths
 * inside the archive, forward-slashed, with index.html at the root: the
 * updater unpacks the archive straight into the bundle directory.
 *
 * @param {string} out
 * @param {{ name: string, path: string }[]} entries
 */
export function writeZip(out, entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, path } of entries) {
    const data = readFileSync(path);
    const packed = deflateRawSync(data, { level: 9 });
    // Already-compressed files (webp, zips) can grow under deflate; store them then.
    const stored = packed.length >= data.length;
    const body = stored ? data : packed;
    const method = stored ? 0 : 8;
    const crc = crc32(data);
    const nameBuf = Buffer.from(name, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(0, 10); // time/date: fixed, so identical inputs give identical bytes
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // made by
    cd.writeUInt16LE(20, 6); // needed
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(0, 12);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(out, Buffer.concat([...parts, cdBuf, end]));
}
