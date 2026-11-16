import assert from "node:assert";
import test from "node:test";

// Validasi File & Sanitasi Path Traversal
function sanitizeFileName(rawName) {
  if (!rawName) return `file_${Date.now()}`;
  const clean = rawName
    .replace(/^.*[\\/]/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".");
  return clean || `file_${Date.now()}`;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt"];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
];

function isAllowedFile(fileName, mimeType) {
  const lowerName = fileName.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (mimeType) {
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
    return hasValidExt || isMimeAllowed;
  }
  return hasValidExt;
}

function inferFileCategory(fileName, mimeType) {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    mimeType?.startsWith("image/")
  ) {
    return "photo";
  }
  if (lower.endsWith(".pdf") || lower.endsWith(".txt") || mimeType?.includes("pdf")) {
    return "document";
  }
  return "other";
}

function maskNIK(nik) {
  if (!nik) return "-";
  if (nik.length < 10) return "******";
  const start = nik.slice(0, 6);
  const end = nik.slice(-4);
  const maskedMiddle = "*".repeat(Math.max(4, nik.length - 10));
  return `${start}${maskedMiddle}${end}`;
}

function maskToken(token) {
  if (!token) return "-";
  if (token.length < 12) return "********";
  const prefix = token.slice(0, 10);
  const suffix = token.slice(-4);
  return `${prefix}****${suffix}`;
}

const MAX_SECURE_PAYLOAD_BYTES = 2048;
function validateSecurePayload(value) {
  if (value === undefined || value === null) {
    return { valid: false, error: "Nilai tidak boleh null/undefined" };
  }
  const bytes = new TextEncoder().encode(value).length;
  if (bytes > MAX_SECURE_PAYLOAD_BYTES) {
    return { valid: false, error: `Payload terlalu besar (${bytes} bytes)` };
  }
  return { valid: true };
}

test("Security: Sanitize file name strips Path Traversal attempts", () => {
  assert.strictEqual(sanitizeFileName("../../../etc/passwd"), "passwd");
  assert.strictEqual(sanitizeFileName("..\\..\\windows\\system32\\cmd.exe"), "cmd.exe");
  assert.strictEqual(sanitizeFileName("laporan..retakan.pdf"), "laporan.retakan.pdf");
  assert.strictEqual(sanitizeFileName("foto gempa (malang) #1.jpg"), "foto_gempa__malang___1.jpg");
});

test("Security: File format white-listing accepts valid civic report media", () => {
  assert.strictEqual(isAllowedFile("foto_longsor.jpg", "image/jpeg"), true);
  assert.strictEqual(isAllowedFile("dokumen_mitigasi.pdf", "application/pdf"), true);
  assert.strictEqual(isAllowedFile("catatan_lapangan.txt", "text/plain"), true);
  // Rejects dangerous executables / scripts
  assert.strictEqual(isAllowedFile("malware.exe", "application/x-msdownload"), false);
  assert.strictEqual(isAllowedFile("script.js", "application/javascript"), false);
});

test("Security: Category inference categorizes photos and documents correctly", () => {
  assert.strictEqual(inferFileCategory("foto.png"), "photo");
  assert.strictEqual(inferFileCategory("laporan.pdf"), "document");
  assert.strictEqual(inferFileCategory("arsip.bin"), "other");
});

test("Privacy: Masking functions properly conceal NIK and Token", () => {
  assert.strictEqual(maskNIK("3573031204010001"), "357303******0001");
  assert.strictEqual(maskNIK(null), "-");
  assert.strictEqual(maskToken("civic_tok_e91b2c3d4e5f6a7b"), "civic_tok_****6a7b");
  assert.strictEqual(maskToken(null), "-");
});

test("Security: SecureStore payload limit guard rejects large base64/media payloads", () => {
  const smallSecret = "civic_tok_e91b2c3d4e5f6a7b";
  assert.strictEqual(validateSecurePayload(smallSecret).valid, true);

  // Large string simulating a 5KB base64 image wrongly directed to SecureStore
  const largeMediaPayload = "A".repeat(5000);
  const result = validateSecurePayload(largeMediaPayload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes("Payload terlalu besar"));
});
