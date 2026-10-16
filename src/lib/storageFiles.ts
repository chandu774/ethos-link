export type StorageBucket = "assignment-files" | "submission-files" | "shared-files" | "notes-files" | "notes";

export function getStoragePathFromRef(fileRef: string | null | undefined, _bucket?: StorageBucket): string | null {
  if (!fileRef) return null;
  return fileRef;
}

export async function openStorageFile({
  bucket: _bucket,
  fileRef,
  fileName,
}: {
  bucket?: StorageBucket;
  fileRef: string | null | undefined;
  fileName?: string | null;
}) {
  if (!fileRef) throw new Error("Invalid file path.");

  // If it's already a relative /uploads or http url, open directly
  let targetUrl = fileRef;
  if (!/^https?:\/\//i.test(targetUrl) && !targetUrl.startsWith("/")) {
    targetUrl = `/uploads/${targetUrl}`;
  }

  const popup = window.open(targetUrl, "_blank", "noopener,noreferrer");
  if (!popup) {
    const link = document.createElement("a");
    link.href = targetUrl;
    if (fileName) link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
