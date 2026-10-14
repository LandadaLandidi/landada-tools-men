
export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return Response.json(
        { success: false, error: "Gunakan metode GET." },
        { status: 405, headers: cors }
      );
    }

    const key = process.env.SAVEAPI_KEY;
    if (!key) {
      return Response.json(
        { success: false, error: "SAVEAPI_KEY belum diatur." },
        { status: 500, headers: cors }
      );
    }

    const input = new URL(request.url).searchParams.get("url");

    if (!input) {
      return Response.json(
        { success: false, error: "Masukkan parameter url." },
        { status: 400, headers: cors }
      );
    }

    let mediaUrl;
    try {
      mediaUrl = new URL(input);
      if (!["http:", "https:"].includes(mediaUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return Response.json(
        { success: false, error: "URL tidak valid." },
        { status: 400, headers: cors }
      );
    }

    try {
      const apiUrl = new URL("https://api.saveapi.org/v1/download");
      apiUrl.searchParams.set("url", mediaUrl.href);

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(25000)
      });

      const data = await response.json();

      return Response.json(data, {
        status: response.ok ? 200 : response.status,
        headers: cors
      });
    } catch {
      return Response.json(
        { success: false, error: "SaveAPI tidak merespons. Coba lagi." },
        { status: 502, headers: cors }
      );
    }
  }
};
