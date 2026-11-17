const APP_ORIGIN = "https://samirahmedbasal-art.github.io";
const MODEL = "gemini-3.5-flash-lite";
const MAX_BODY_BYTES = 16 * 1024 * 1024;

const json = (body, status, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});

function cors(origin) {
  return {
    "access-control-allow-origin": origin === APP_ORIGIN ? APP_ORIGIN : "null",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function textResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.filter(x => typeof x.text === "string").map(x => x.text).join("\n").trim();
}

function validMeasurements(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return false;
  const keys = ["date", "weight", "fatPct", "muscle", "fat", "visceral"];
  return value.every(row => row && typeof row === "object" && keys.every(key =>
    row[key] == null || (key === "date" ? typeof row[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row[key]) : Number.isFinite(row[key]) && row[key] >= 0)
  ));
}

function validImage(image) {
  return image && ["image/jpeg", "image/png", "image/webp"].includes(image.mimeType) &&
    typeof image.data === "string" && image.data.length > 0 && image.data.length <= 7_000_000 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(image.data);
}

async function generate(env, contents) {
  const model = env.GEMINI_MODEL || MODEL;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.25, maxOutputTokens: 700 } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data?.error?.message || "Gemini could not complete the analysis.", status: response.status };
  return { text: textResponse(data) || "No analysis was returned." };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const headers = cors(origin);
    if (origin !== APP_ORIGIN) return json({ error: "Origin not allowed." }, 403, headers);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Use POST." }, 405, headers);
    if (!env.GEMINI_API_KEY || !env.IRONLOG_ACCESS_TOKEN) return json({ error: "AI service is not configured." }, 503, headers);
    if (request.headers.get("authorization") !== `Bearer ${env.IRONLOG_ACCESS_TOKEN}`) return json({ error: "Not authorized." }, 401, headers);
    const size = Number(request.headers.get("content-length") || 0);
    if (size > MAX_BODY_BYTES) return json({ error: "Request is too large." }, 413, headers);
    let input;
    try { input = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400, headers); }
    const route = new URL(request.url).pathname;
    let contents;
    if (route === "/analyze/body") {
      if (!validMeasurements(input.measurements)) return json({ error: "Invalid measurement history." }, 400, headers);
      const language = input.language === "en" ? "English" : "Arabic";
      contents = [{ role: "user", parts: [{ text: `Review these InBody/body-composition measurements in chronological order and reply in ${language}. Give: (1) a short trend summary, (2) 2-3 practical training/recovery/habit actions, and (3) one measurement-context caveat. Do not diagnose disease, prescribe supplements or medication, shame appearance, or infer unstated facts. State that InBody estimates vary with hydration and measurement conditions.\n\nMeasurements JSON:\n${JSON.stringify(input.measurements)}` }] }];
    } else if (route === "/analyze/photo") {
      if (!Array.isArray(input.images) || input.images.length !== 2 || !validImage(input.images[0]) || !validImage(input.images[1])) return json({ error: "Two supported images are required." }, 400, headers);
      const [older, newer] = input.images;
      const language = input.language === "en" ? "English" : "Arabic";
      contents = [{ role: "user", parts: [
        { text: `Compare these two user-provided monthly physique progress photos. The first is the earlier photo (${String(older.month || "earlier").slice(0, 7)}); the second is the later photo (${String(newer.month || "later").slice(0, 7)}). Reply in ${language}. Describe only visible, non-identifying differences and uncertainty caused by pose, clothing, lighting, camera distance, and hydration. Never estimate body-fat percentage, weight, or medical status from photos. Give at most three neutral training or tracking suggestions. Do not infer identity or age. Keep the response supportive and factual.` },
        { inline_data: { mime_type: older.mimeType, data: older.data } },
        { inline_data: { mime_type: newer.mimeType, data: newer.data } }
      ] }];
    } else return json({ error: "Unknown analysis route." }, 404, headers);
    const result = await generate(env, contents);
    if (result.error) return json({ error: result.status === 429 ? "Gemini free-tier limit reached. Try later." : result.error }, result.status >= 400 && result.status < 600 ? result.status : 502, headers);
    return json({ analysis: result.text }, 200, headers);
  }
};

