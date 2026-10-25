// AI Chat edge function — proxies user messages to Google Gemini's free-tier API.
// The API key (GEMINI_API_KEY) is stored as a Supabase secret and never reaches the browser.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = [
  "You are NovaMind, a friendly and encouraging AI study companion for students.",
  "",
  "Style and clarity:",
  "- Answer in clear, direct, simple English that a beginner can understand.",
  "- Explain difficult concepts step by step, in order. Use plain words; define any term a beginner might not know.",
  "- Use short headings (##), bullet points, and numbered steps when they help. Keep paragraphs to 2-3 sentences.",
  "- Give a concrete example for each main idea.",
  "- Be concise. Do not repeat the same point in different words. Do not pad with vague filler or generic intros like \"Great question!\".",
  "- Answer the user's ACTUAL question. If they ask something specific, respond to that, not the general topic around it.",
  "",
  "Study questions:",
  "- Give a structured explanation: a short overview first, then steps or a breakdown, then a practical example.",
  "- For techniques, briefly say what it is, how to do it step by step, and one concrete example of using it.",
  "",
  "Coding questions:",
  "- Provide short, beginner-friendly code. Comment each non-obvious line in plain English.",
  "- After the code, explain in 2-4 short bullets what it does and how it works.",
  "- Keep examples minimal and runnable; avoid advanced syntax unless the user asks for it.",
  "",
  "Ambiguity and honesty:",
  "- If the request is genuinely ambiguous and the answer would change a lot depending on what they meant, give your best guess briefly, then ask ONE short clarifying question. Do not ask for clarification when the intent is reasonably clear.",
  "- If you do not know something or are not sure, say so plainly. Never invent facts, citations, or specifics you are not confident about.",
  "",
  "Scope:",
  "- Focus on studying, learning, time management, note-taking, exam revision, motivation, and beginner coding help.",
  "- If a question is far outside these topics, give a brief honest answer and, if useful, steer gently back to learning.",
].join("\n");

const MAX_MESSAGE = 2000;

function errorBody(message: string, code: string) {
  return JSON.stringify({ error: message, code });
}

function errorResponse(status: number, message: string, code: string) {
  return new Response(errorBody(message, code), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Only POST is supported.", "method_not_allowed");
  }

  // Gemini API key is read from Supabase edge function secrets.
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !apiKey.trim()) {
    return errorResponse(
      503,
      "The AI service is not configured yet. Add the GEMINI_API_KEY secret to enable real AI responses.",
      "missing_key"
    );
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.", "bad_request");
  }

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!rawMessage) {
    return errorResponse(400, "A non-empty 'message' field is required.", "bad_request");
  }
  if (rawMessage.length > MAX_MESSAGE) {
    return errorResponse(413, `Message is too long (max ${MAX_MESSAGE} characters).`, "too_large");
  }

  // Accept an optional chat history array to give the model conversation context.
  type Turn = { role: "user" | "model"; text: string };
  const history: Turn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (t): t is Turn =>
            typeof t === "object" &&
            t !== null &&
            (t.role === "user" || t.role === "model") &&
            typeof t.text === "string"
        )
        .slice(-10)
        .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_MESSAGE) }))
    : [];

  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: rawMessage }] },
  ];

  try {
    const model = "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 768,
        topP: 0.9,
      },
    });

    const callGemini = async () =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

    let geminiRes = await callGemini();

    // One automatic retry for transient 5xx/network hiccups so a momentary
    // provider blip doesn't surface to the user as a hard failure.
    if (geminiRes.status >= 500) {
      await new Promise((r) => setTimeout(r, 800));
      geminiRes = await callGemini();
    }

    if (geminiRes.status === 429) {
      return errorResponse(
        429,
        "The free AI tier is rate-limited. Please wait about a minute and try again.",
        "rate_limited"
      );
    }

    if (!geminiRes.ok) {
      const detail = await geminiRes.text().catch(() => "");
      console.error("Gemini error", geminiRes.status, detail);
      if (geminiRes.status >= 500) {
        return errorResponse(503, "The AI provider is temporarily unavailable. Please try again.", "provider_unavailable");
      }
      return errorResponse(502, "The AI provider rejected the request. Try rephrasing your message.", "provider_error");
    }

    const data = await geminiRes.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text)
        .filter((t: unknown): t is string => typeof t === "string")
        .join(" ")
        .trim();

    if (!text) {
      return errorResponse(
        502,
        "The AI returned an empty response. Try rephrasing your question.",
        "empty_response"
      );
    }

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI chat failure", err);
    return errorResponse(
      500,
      "Could not reach the AI service. Check your connection and try again.",
      "network_error"
    );
  }
});
