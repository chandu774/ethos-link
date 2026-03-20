import { supabase } from "@/integrations/supabase/client";

export type StorageBucket = "assignment-files" | "submission-files" | "shared-files" | "notes-files" | "notes";

export function getStoragePathFromRef(fileRef: string | null | undefined, bucket: StorageBucket): string | null {
  if (!fileRef) return null;
  if (!/^https?:\/\//i.test(fileRef)) return fileRef;

  try {
    const url = new URL(fileRef);
    const path = decodeURIComponent(url.pathname);
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ];

    for (const pattern of patterns) {
      const index = path.indexOf(pattern);
      if (index >= 0) {
        const objectPath = path.slice(index + pattern.length);
        return objectPath || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function openStorageFile({
  bucket,
  fileRef,
  fileName,
}: {
  bucket: StorageBucket;
  fileRef: string | null | undefined;
  fileName?: string | null;
}) {
  const objectPath = getStoragePathFromRef(fileRef, bucket);
  if (!objectPath) throw new Error("Invalid file path.");

  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !data) {
    throw error || new Error("Failed to download file.");
  }

  const blobUrl = URL.createObjectURL(data);
  const popup = window.open(blobUrl, "_blank", "noopener,noreferrer");

  if (!popup) {
    const link = document.createElement("a");
    link.href = blobUrl;
    if (fileName) link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
}
