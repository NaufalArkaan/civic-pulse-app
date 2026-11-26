import assert from "node:assert";
import test from "node:test";
import {
  sanitizeFileName,
  isAllowedFile,
  inferFileCategory,
  validateFileSize,
  validateFileEntry,
  maskNIK,
  maskToken,
  MAX_FILE_SIZE_BYTES,
} from "../src/utils/fileValidation.ts";

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

test("Security: Sanitize file name strips Path Traversal attempts and dangerous patterns", () => {
  assert.strictEqual(sanitizeFileName("../../../etc/passwd"), "passwd");
  assert.strictEqual(sanitizeFileName("..\\..\\windows\\system32\\cmd.exe"), "cmd.exe");
  assert.strictEqual(sanitizeFileName("laporan..retakan.pdf"), "laporan.retakan.pdf");
  assert.strictEqual(sanitizeFileName("foto gempa (malang) #1.jpg"), "foto_gempa__malang___1.jpg");

  // Empty or dot-only edge cases
  const emptyRes = sanitizeFileName("");
  assert.ok(emptyRes.startsWith("file_"));

  const dotRes = sanitizeFileName("..");
  assert.ok(dotRes.startsWith("file_"));

  const singleDotRes = sanitizeFileName(".");
  assert.ok(singleDotRes.startsWith("file_"));
});

test("Security: File format white-listing accepts valid civic report media", () => {
  assert.strictEqual(isAllowedFile("foto_longsor.jpg", "image/jpeg"), true);
  assert.strictEqual(isAllowedFile("dokumen_mitigasi.pdf", "application/pdf"), true);
  assert.strictEqual(isAllowedFile("catatan_lapangan.txt", "text/plain"), true);
  assert.strictEqual(isAllowedFile("bukti_retakan.webp", "image/webp"), true);

  // Rejects dangerous executables / scripts / unauthorized formats
  assert.strictEqual(isAllowedFile("malware.exe", "application/x-msdownload"), false);
  assert.strictEqual(isAllowedFile("script.js", "application/javascript"), false);
  assert.strictEqual(isAllowedFile("exploit.sh", "application/x-sh"), false);
});

test("Security: Category inference categorizes photos and documents correctly", () => {
  assert.strictEqual(inferFileCategory("foto.png"), "photo");
  assert.strictEqual(inferFileCategory("foto.jpg"), "photo");
  assert.strictEqual(inferFileCategory("foto.webp"), "photo");
  assert.strictEqual(inferFileCategory("laporan.pdf"), "document");
  assert.strictEqual(inferFileCategory("laporan.txt"), "document");
  assert.strictEqual(inferFileCategory("arsip.bin"), "other");
});

test("Validation: Configurable file size limits and structured entry validation", () => {
  // Size checks
  assert.strictEqual(validateFileSize(1024).valid, true);
  assert.strictEqual(validateFileSize(MAX_FILE_SIZE_BYTES).valid, true);
  assert.strictEqual(validateFileSize(MAX_FILE_SIZE_BYTES + 1).valid, false);
  assert.strictEqual(validateFileSize(null).valid, true);
  assert.strictEqual(validateFileSize(-1).valid, false);

  // Full entry validation: valid case
  const validDoc = validateFileEntry("bukti_longsor.jpg", "image/jpeg", 500 * 1024);
  assert.strictEqual(validDoc.valid, true);
  assert.strictEqual(validDoc.category, "photo");
  assert.strictEqual(validDoc.sanitizedName, "bukti_longsor.jpg");

  // Full entry validation: oversize file (> MAX_FILE_SIZE_BYTES)
  const oversizeDoc = validateFileEntry(
    "laporan_jumbo.pdf",
    "application/pdf",
    MAX_FILE_SIZE_BYTES + 5 * 1024 * 1024
  );
  assert.strictEqual(oversizeDoc.valid, false);
  assert.ok(oversizeDoc.error?.includes("melebihi batas maksimum"));

  // Full entry validation: unauthorized extension
  const invalidExt = validateFileEntry("trojan.exe", "application/x-msdownload", 1024);
  assert.strictEqual(invalidExt.valid, false);
  assert.ok(invalidExt.error?.includes("tidak didukung"));
});

test("Privacy: Masking functions properly conceal NIK and Token", () => {
  assert.strictEqual(maskNIK("3573031204010001"), "357303******0001");
  assert.strictEqual(maskNIK(null), "-");
  assert.strictEqual(maskNIK(undefined), "-");
  assert.strictEqual(maskNIK("123"), "******");

  assert.strictEqual(maskToken("civic_tok_e91b2c3d4e5f6a7b"), "civic_tok_****6a7b");
  assert.strictEqual(maskToken(null), "-");
  assert.strictEqual(maskToken(undefined), "-");
  assert.strictEqual(maskToken("short"), "********");
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
