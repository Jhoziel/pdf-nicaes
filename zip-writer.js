(function exposeZipWriter(globalScope) {
  "use strict";

  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
    }
    crcTable[index] = value >>> 0;
  }

  function littleEndian(length, write) {
    const bytes = new Uint8Array(length);
    write(new DataView(bytes.buffer));
    return bytes;
  }

  function dosTimestamp(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: ((date.getHours() & 0x1F) << 11)
        | ((date.getMinutes() & 0x3F) << 5)
        | ((Math.floor(date.getSeconds() / 2)) & 0x1F),
      date: (((year - 1980) & 0x7F) << 9)
        | (((date.getMonth() + 1) & 0x0F) << 5)
        | (date.getDate() & 0x1F),
    };
  }

  async function* sourceChunks(source) {
    if (typeof source === "string") {
      yield encoder.encode(source);
      return;
    }
    if (source instanceof Uint8Array) {
      yield source;
      return;
    }
    if (source instanceof ArrayBuffer) {
      yield new Uint8Array(source);
      return;
    }
    if (ArrayBuffer.isView(source)) {
      yield new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      return;
    }
    if (source instanceof Blob) {
      if (source.stream) {
        const reader = source.stream().getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        yield new Uint8Array(await source.arrayBuffer());
      }
      return;
    }
    throw new TypeError("ZIP entries must be text, binary data, or a Blob.");
  }

  function createBlobSink() {
    const parts = [];
    return {
      async write(chunk) { parts.push(chunk); },
      async close() { return new Blob(parts, { type: "application/zip" }); },
    };
  }

  async function createFileSink(fileHandle) {
    const writable = await fileHandle.createWritable();
    return {
      async write(chunk) { await writable.write(chunk); },
      async close() {
        await writable.close();
        return null;
      },
      async abort() { await writable.abort(); },
    };
  }

  class Archive {
    constructor(sink) {
      if (!sink?.write || !sink?.close) throw new TypeError("A writable ZIP sink is required.");
      this.sink = sink;
      this.offset = 0;
      this.entries = [];
      this.entryNames = new Set();
      this.closed = false;
    }

    async write(chunk) {
      await this.sink.write(chunk);
      this.offset += chunk.byteLength;
      if (this.offset > 0xFFFFFFFF) throw new RangeError("ZIP64 archives are not supported.");
    }

    async add(name, source) {
      if (this.closed) throw new Error("The ZIP archive is already closed.");
      const rawName = String(name || "");
      const normalizedName = rawName.replace(/\\/g, "/");
      if (!normalizedName) throw new TypeError("A ZIP entry name is required.");
      const segments = normalizedName.split("/");
      const unsafe = normalizedName.startsWith("/")
        || /^[A-Za-z]:/.test(normalizedName)
        || segments.some((segment) => !segment || segment === "." || segment === "..");
      if (unsafe) throw new TypeError("ZIP entry names must be safe relative paths.");
      const entryKey = normalizedName.toLocaleLowerCase();
      if (this.entryNames.has(entryKey)) throw new TypeError("ZIP entry names must be unique.");
      const nameBytes = encoder.encode(normalizedName);
      if (nameBytes.byteLength > 0xFFFF) throw new RangeError("The ZIP entry name is too long.");
      this.entryNames.add(entryKey);

      const flags = 0x0808;
      const timestamp = dosTimestamp();
      const localOffset = this.offset;
      const localHeader = littleEndian(30, (view) => {
        view.setUint32(0, 0x04034B50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, flags, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, timestamp.time, true);
        view.setUint16(12, timestamp.date, true);
        view.setUint16(26, nameBytes.byteLength, true);
      });
      await this.write(localHeader);
      await this.write(nameBytes);

      let crc = 0xFFFFFFFF;
      let size = 0;
      for await (const chunk of sourceChunks(source)) {
        for (const byte of chunk) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
        size += chunk.byteLength;
        if (size > 0xFFFFFFFF) throw new RangeError("ZIP64 entries are not supported.");
        await this.write(chunk);
      }
      crc = (crc ^ 0xFFFFFFFF) >>> 0;

      const descriptor = littleEndian(16, (view) => {
        view.setUint32(0, 0x08074B50, true);
        view.setUint32(4, crc, true);
        view.setUint32(8, size, true);
        view.setUint32(12, size, true);
      });
      await this.write(descriptor);
      this.entries.push({
        nameBytes,
        flags,
        time: timestamp.time,
        date: timestamp.date,
        crc,
        size,
        localOffset,
      });
    }

    async close() {
      if (this.closed) throw new Error("The ZIP archive is already closed.");
      this.closed = true;
      if (this.entries.length > 0xFFFF) throw new RangeError("ZIP64 archives are not supported.");
      const centralOffset = this.offset;

      for (const entry of this.entries) {
        const centralHeader = littleEndian(46, (view) => {
          view.setUint32(0, 0x02014B50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, 20, true);
          view.setUint16(8, entry.flags, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, entry.time, true);
          view.setUint16(14, entry.date, true);
          view.setUint32(16, entry.crc, true);
          view.setUint32(20, entry.size, true);
          view.setUint32(24, entry.size, true);
          view.setUint16(28, entry.nameBytes.byteLength, true);
          view.setUint32(42, entry.localOffset, true);
        });
        await this.write(centralHeader);
        await this.write(entry.nameBytes);
      }

      const centralSize = this.offset - centralOffset;
      const end = littleEndian(22, (view) => {
        view.setUint32(0, 0x06054B50, true);
        view.setUint16(8, this.entries.length, true);
        view.setUint16(10, this.entries.length, true);
        view.setUint32(12, centralSize, true);
        view.setUint32(16, centralOffset, true);
      });
      await this.write(end);
      return this.sink.close();
    }

    async abort() {
      this.closed = true;
      if (this.sink.abort) await this.sink.abort();
    }
  }

  globalScope.ZipWriter = Object.freeze({ Archive, createBlobSink, createFileSink });
}(typeof window === "undefined" ? globalThis : window));
