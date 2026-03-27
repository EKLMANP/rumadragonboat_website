// supabase/functions/generate-article/index.ts
// 文章自動生成 Edge Function
// 接收 POST 請求，呼叫 Gemini API 生成繁中 + 英文文章，上傳草稿至 Supabase，發送 Telegram 通知
//
// 觸發來源：
//   1. Telegram webhook 指令：生成 / 生成 {主題}
//   2. GitHub Actions 每週五 08:00 排程
//
// Request Body (optional):
//   { "topic": "自訂主題" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── 預設主題池 ────────────────────────────────────────────────────────────────

const TOPIC_POOL = [
    "龍舟比賽前的體能訓練計畫：如何在 4 週內提升划槳爆發力",
    "龍舟划槳技術詳解：正確姿勢與出力效率的關鍵",
    "龍舟隊的團隊凝聚力：從訓練到比賽的心理建設",
    "台灣端午節龍舟文化完整介紹：歷史、習俗與現代競技",
    "龍舟新手常見問題 Q&A：第一次參加龍舟訓練必看",
    "龍舟運動的核心肌群訓練：提升划槳穩定性的 6 個動作",
    "龍舟比賽策略：鼓手節奏與划槳配合的默契訓練",
    "龍舟運動傷害預防：常見傷害部位與熱身伸展指南",
];

// ── Gemini API helper ─────────────────────────────────────────────────────────

async function generateArticleWithGemini(
    apiKey: string,
    topic: string
): Promise<{
    title: string;
    title_en: string;
    slug: string;
    excerpt: string;
    excerpt_en: string;
    category: string;
    content: object[];
    content_en: object[];
}> {
    const prompt = `你是一位專業的龍舟運動內容作家，為台灣龍舟隊 RUMA Dragon Boat 撰寫 SEO 優化的部落格文章。

請針對以下主題，產出一篇完整的繁體中文文章，並同時提供英文版本。

主題：${topic}

**輸出格式（JSON）：**
{
  "title": "繁體中文標題（吸引人、含關鍵字）",
  "title_en": "English title",
  "slug": "url-friendly-slug-in-english",
  "excerpt": "繁體中文摘要（150字以內）",
  "excerpt_en": "English excerpt (within 150 words)",
  "category": "運動相關",
  "content": [
    {"type": "heading", "level": 2, "content": "段落標題"},
    {"type": "paragraph", "content": "段落內容..."},
    {"type": "list", "ordered": false, "items": ["項目1", "項目2"]},
    {"type": "heading", "level": 3, "content": "子標題"},
    {"type": "paragraph", "content": "更多內容..."}
  ],
  "content_en": [
    // Same structure in English
  ]
}

**要求：**
- 繁體中文版：1500-2000 字，至少 6 個段落，含 H2/H3 標題結構
- 英文版：同等長度
- 內容實用、具體，適合龍舟新手和進階選手
- SEO 優化：自然融入關鍵字
- 只輸出 JSON，不要其他文字`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                },
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Gemini returned empty response");

    // Parse JSON (strip markdown code fences if present)
    const jsonText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(jsonText);
}

// ── HMAC preview token ────────────────────────────────────────────────────────

async function computePreviewToken(secret: string, slug: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(slug));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 32);
}

// ── Telegram helper ───────────────────────────────────────────────────────────

async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("ok", { status: 200 });
    }

    const geminiKey = Deno.env.get("GOOGLE_AI_STUDIO_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
    const previewSecret = Deno.env.get("PREVIEW_SECRET") ?? "";
    const rumasite = "https://uat.rumadragonboat.com";

    if (!geminiKey) {
        return new Response(JSON.stringify({ error: "GOOGLE_AI_STUDIO_API_KEY not set" }), { status: 500 });
    }

    // Parse optional topic from request body
    let topic: string;
    try {
        const body = await req.json().catch(() => ({}));
        topic = body?.topic?.trim() || TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
    } catch {
        topic = TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
    }

    // Notify start
    if (botToken && chatId) {
        await sendTelegramMessage(botToken, chatId,
            `⏳ *正在生成文章...*\n\n📝 主題：${topic}\n\n請稍候約 30 秒...`
        );
    }

    try {
        // 1. Generate article with Gemini
        console.log(`Generating article for topic: ${topic}`);
        const article = await generateArticleWithGemini(geminiKey, topic);

        // 2. Upload to Supabase
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check if slug already exists
        const { data: existing } = await supabase
            .from("news")
            .select("id")
            .eq("slug", article.slug)
            .single();

        if (existing) {
            // Append timestamp to make slug unique
            article.slug = `${article.slug}-${Date.now()}`;
        }

        const { data: inserted, error: insertError } = await supabase
            .from("news")
            .insert({
                title: article.title,
                title_en: article.title_en,
                slug: article.slug,
                excerpt: article.excerpt,
                excerpt_en: article.excerpt_en,
                category: article.category,
                content: article.content,
                content_en: article.content_en,
                is_published: false,
                cover_image: null,
            })
            .select("id, slug, title")
            .single();

        if (insertError || !inserted) {
            throw new Error(`Supabase insert failed: ${insertError?.message}`);
        }

        // 3. Compute preview token and send Telegram notification
        const token = await computePreviewToken(previewSecret, inserted.slug);
        const previewUrl = `${rumasite}/news/${inserted.slug}?preview=true&token=${token}`;

        const notifyText =
            `✅ *文章已生成並上傳草稿！*\n\n` +
            `📌 *${inserted.title}*\n` +
            `🆔 ID: \`${inserted.id}\`\n\n` +
            `👁 [預覽草稿](${previewUrl})\n\n` +
            `✅ 發布：\`發布 ${inserted.id}\`\n` +
            `❌ 修改：\`修改 ${inserted.id}\`\n` +
            `📋 查看所有草稿：\`狀態\``;

        if (botToken && chatId) {
            await sendTelegramMessage(botToken, chatId, notifyText);
        }

        return new Response(JSON.stringify({
            success: true,
            id: inserted.id,
            slug: inserted.slug,
            title: inserted.title,
            preview_url: previewUrl,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("generate-article error:", err);
        const errMsg = err instanceof Error ? err.message : String(err);

        if (botToken && chatId) {
            await sendTelegramMessage(botToken, chatId,
                `❌ *文章生成失敗*\n\n錯誤：${errMsg}\n\n請稍後再試或手動上傳。`
            );
        }

        return new Response(JSON.stringify({ error: errMsg }), { status: 500 });
    }
});
