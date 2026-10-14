
export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    const reply = (data, status = 200) =>
      Response.json(data, { status, headers: cors });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return reply(
        { success: false, error: "Gunakan metode GET." },
        405
      );
    }

    const key = process.env.SAVEAPI_KEY;
    if (!key) {
      return reply({
        success: false,
        error: "SAVEAPI_KEY belum diatur di Vercel."
      }, 500);
    }

    const params = new URL(request.url).searchParams;
    const input = params.get("url");
    const format = (params.get("format") || "").toLowerCase();
    const quality = (params.get("quality") || "720").toLowerCase();

    let videoUrl;

    try {
      videoUrl = new URL(input || "");
      const host = videoUrl.hostname.toLowerCase();

      const allowed =
        host === "youtube.com" ||
        host.endsWith(".youtube.com") ||
        host === "youtu.be" ||
        host === "tiktok.com" ||
        host.endsWith(".tiktok.com");

      if (videoUrl.protocol !== "https:" || !allowed) {
        throw new Error("URL tidak didukung.");
      }
    } catch {
      return reply({
        success: false,
        error: "Masukkan link HTTPS YouTube atau TikTok yang valid."
      }, 400);
    }

    const isYouTube =
      videoUrl.hostname === "youtu.be" ||
      videoUrl.hostname.endsWith("youtube.com");

    // Validasi pilihan format.
    if (format && !["mp4", "mp3", "m4a"].includes(format)) {
      return reply({
        success: false,
        error: "Format harus mp4, mp3, atau m4a."
      }, 400);
    }

    try {
      const headers = { Authorization: `Bearer ${key}` };
      let endpoint;
      const apiUrl = new URL("https://api.saveapi.org/v1/download");

      if (isYouTube && format) {
        // YouTube perlu membuat link unduhan tersendiri.
        const createUrl = new URL(
          "https://api.saveapi.org/v1/youtube/create"
        );

        createUrl.searchParams.set("url", videoUrl.href);
        createUrl.searchParams.set(
          "quality",
          format === "mp4" ? `${quality.replace(/p$/, "")}p` : format
        );

        endpoint = createUrl;
      } else {
        // Tanpa format: tampilkan informasi media.
        // Platform selain YouTube: gunakan link langsung.
        apiUrl.searchParams.set("url", videoUrl.href);
        endpoint = apiUrl;
      }

      const response = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(55000)
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        return reply(data, response.ok ? 422 : response.status);
      }

      // Samakan hasil YouTube create dengan format yang dibaca website.
      if (isYouTube && format) {
        const directUrl = data.url || data.download_url;

        if (!directUrl) {
          return reply({
            success: false,
            error: "SaveAPI tidak mengembalikan link unduhan.",
            details: data
          }, 502);
        }

        return reply({
          success: true,
          platform: "youtube",
          title: data.title || "",
          filename: data.filename || "",
          expires: data.expires || null,
          medias: [{
            url: directUrl,
            type: format === "mp4" ? "video" : "audio",
            ext: format,
            quality: format === "mp4" ? quality + "p" : format,
            label: format === "mp4" ? "Video " + quality + "p" : format.toUpperCase()
          }],
          credits: data.credits || null
        });
      }

      return reply(data);
    } catch (error) {
      return reply({
        success: false,
        error: error.name === "TimeoutError"
          ? "SaveAPI terlalu lama merespons. Coba lagi."
          : "Gagal menghubungi SaveAPI. Coba lagi."
      }, 502);
    }
  }
};
