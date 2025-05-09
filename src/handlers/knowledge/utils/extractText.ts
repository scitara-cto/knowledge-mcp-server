import officeParser from "officeparser";
import path from "path";

/**
 * Extract text from a file buffer based on file extension.
 * Supports Office files, PDFs, and plain text.
 * @param buffer The file buffer
 * @param filename The original file name (for extension)
 * @returns Extracted text
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (
    [".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods", ".pdf"].includes(ext)
  ) {
    // Use officeParser for Office and PDF files
    return new Promise((resolve, reject) => {
      officeParser.parseOfficeAsync(buffer).then(resolve).catch(reject);
    });
  } else if (ext === ".txt") {
    // Plain text
    return buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}
