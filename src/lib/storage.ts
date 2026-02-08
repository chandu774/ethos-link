import { supabase } from "@/integrations/supabase/client";

export async function uploadAvatarFile({
  bucket,
  pathPrefix,
  file,
}: {
  bucket: "profile-avatars" | "group-avatars" | "community-images";
  pathPrefix: string;
  file: File;
}) {
  const extension = file.name.split(".").pop() || "png";
  const fileName = `${pathPrefix}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
