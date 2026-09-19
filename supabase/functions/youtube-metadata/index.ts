import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extracts YouTube video ID from supported URL patterns
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already an 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex patterns covering standard youtube formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function parseIsoDuration(durationStr: string): string {
  if (!durationStr) return "15:00";
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "15:00";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${minutes}:${formattedSeconds}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrlOrId = body.youtube_url || body.video_id || body.url || "";

    const videoId = extractYouTubeVideoId(rawUrlOrId);
    if (!videoId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid YouTube URL. Please provide a valid YouTube watch, short, or youtu.be link.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const standardThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    let title = "";
    let channelName = "YouTube Educator";
    let thumbnailUrl = standardThumbnail;
    let duration = "15:00";
    let hasCaptions = false;
    let publishedAt: string | null = null;

    const apiKey = Deno.env.get("YOUTUBE_API_KEY");

    // 1. Try official YouTube Data API v3 if API key exists
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            title = item.snippet?.title || "";
            channelName = item.snippet?.channelTitle || channelName;
            publishedAt = item.snippet?.publishedAt || null;
            if (item.snippet?.thumbnails?.maxres?.url) {
              thumbnailUrl = item.snippet.thumbnails.maxres.url;
            } else if (item.snippet?.thumbnails?.high?.url) {
              thumbnailUrl = item.snippet.thumbnails.high.url;
            }

            if (item.contentDetails?.duration) {
              duration = parseIsoDuration(item.contentDetails.duration);
            }
            if (item.contentDetails?.caption === "true") {
              hasCaptions = true;
            }
          }
        }
      } catch (apiErr) {
        console.warn("YouTube Data API call failed, trying official oEmbed fallback:", apiErr);
      }
    }

    // 2. If title wasn't found from Data API, query official YouTube oEmbed API
    if (!title) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) {
            title = oembedData.title;
          }
          if (oembedData.author_name) {
            channelName = oembedData.author_name;
          }
          if (oembedData.thumbnail_url) {
            thumbnailUrl = oembedData.thumbnail_url;
          }
        }
      } catch (oembedErr) {
        console.warn("YouTube oEmbed fetch error:", oembedErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        videoUrl,
        title: title || body.fallback_title || "Lecture Video",
        channelName,
        thumbnailUrl,
        duration,
        hasCaptions,
        publishedAt: publishedAt || new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("youtube-metadata function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || "Internal server error fetching YouTube metadata",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
