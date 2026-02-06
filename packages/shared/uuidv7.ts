import { randomBytes } from "crypto";

// RFC 9562 UUID v7 (time-ordered, milliseconds)
export function uuidv7(): string {
  const bytes = randomBytes(16);
  const now = Date.now();

  // 48-bit unix epoch milliseconds
  bytes[0] = (now >>> 40) & 0xff;
  bytes[1] = (now >>> 32) & 0xff;
  bytes[2] = (now >>> 24) & 0xff;
  bytes[3] = (now >>> 16) & 0xff;
  bytes[4] = (now >>> 8) & 0xff;
  bytes[5] = now & 0xff;

  // version 7
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // variant 10xx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return (
    byteToHex(bytes[0]) +
    byteToHex(bytes[1]) +
    byteToHex(bytes[2]) +
    byteToHex(bytes[3]) +
    "-" +
    byteToHex(bytes[4]) +
    byteToHex(bytes[5]) +
    "-" +
    byteToHex(bytes[6]) +
    byteToHex(bytes[7]) +
    "-" +
    byteToHex(bytes[8]) +
    byteToHex(bytes[9]) +
    "-" +
    byteToHex(bytes[10]) +
    byteToHex(bytes[11]) +
    byteToHex(bytes[12]) +
    byteToHex(bytes[13]) +
    byteToHex(bytes[14]) +
    byteToHex(bytes[15])
  );
}

function byteToHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}
