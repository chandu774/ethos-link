import api from "@/lib/apiClient";

export async function uploadAvatarFile({
  bucket: _bucket,
  pathPrefix: _pathPrefix,
  file,
}: {
  bucket?: string;
  pathPrefix?: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.upload<{ url: string }>("/storage/upload", formData);
  return res.url;
}
