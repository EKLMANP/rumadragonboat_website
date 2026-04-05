// supabase/functions/telegram-webhook/index.ts
// Telegram Bot Webhook Edge Function
// 接收 Eric 的 Telegram 回覆，自動執行文章發布操作
//
// 支援指令：
//   生成             → 隨機主題生成文章
//   生成 {主題}      → 指定主題生成文章
//   發布 {news_id}   → 將文章設為已發布
//   修改 {news_id}   → 回覆已記錄（未來可擴充）
//   狀態             → 列出最近 5 篇草稿
//   說明 / help      → 顯示使用說明

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Telegram API helper ───────────────────────────────────────────────────────

async function sendTelegramMessage(botToken: string, chatId: string | number, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
        }),
    });
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
    // Only accept POST from Telegram
    if (req.method !== "POST") {
        return new Response("ok", { status: 200 });
    }

    try {
        // ── 1. Validate Telegram webhook secret ──────────────────────────────
        const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
        if (webhookSecret) {
            const incomingSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
            if (incomingSecret !== webhookSecret) {
                console.warn("Invalid webhook secret token");
                return new Response("Unauthorized", { status: 401 });
            }
        }

        // ── 2. Parse Telegram update ─────────────────────────────────────────
        const update = await req.json();
        const message = update?.message;

        if (!message?.text) {
            // Not a text message — ignore silently
            return new Response("ok", { status: 200 });
        }

        const chatId = message.chat.id;
        const text = message.text.trim();

        // ── 3. Verify sender is Eric ─────────────────────────────────────────
        const allowedChatId = Deno.env.get("TELEGRAM_CHAT_ID");
        if (allowedChatId && String(chatId) !== allowedChatId) {
            console.warn(`Unauthorized chat_id: ${chatId}`);
            return new Response("ok", { status: 200 }); // Silently ignore
        }

        // ── 4. Get env vars ──────────────────────────────────────────────────
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // ── 5. Parse command ─────────────────────────────────────────────────

        // 關鍵字研究 — 用 Gemini 做 SEO 研究，回傳 3 個建議主題
        if (text === "關鍵字研究" || text === "seo" || text.toLowerCase() === "seo research") {
            await handleSeoResearch(botToken, chatId);
            return new Response("ok", { status: 200 });
        }

        // 生成 / 生成 {主題} / 生成 {主題1},{主題2},{主題3}
        // 支援 User 的自然語言指令：「自動執行RUMA官網文章撰寫、發佈自動化流程」
        const generateMatch = text.match(/^生成(?:\s+(.+))?$/) ||
            text.includes("自動執行RUMA官網文章撰寫");

        if (generateMatch) {
            const topicStr = (Array.isArray(generateMatch) && generateMatch[1]) ? generateMatch[1].trim() : "";
            // 支援逗號分隔多個主題：生成 主題1,主題2,主題3
            const topics = topicStr ? topicStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [""];
            await handleGenerateMultiple(botToken, chatId, topics);
            return new Response("ok", { status: 200 });
        }


        // 發布 {id}
        const publishMatch = text.match(/^發布\s+([a-zA-Z0-9_-]+)/);
        if (publishMatch) {
            const newsId = publishMatch[1];
            await handlePublish(supabaseAdmin, botToken, chatId, newsId);
            return new Response("ok", { status: 200 });
        }

        // 修改 {id}
        const reviseMatch = text.match(/^修改\s+([a-zA-Z0-9_-]+)/);
        if (reviseMatch) {
            const newsId = reviseMatch[1];
            await sendTelegramMessage(botToken, chatId,
                `📝 已記錄修改需求（ID: \`${newsId}\`）\n\n請重新產出文章後，再次執行上傳。`
            );
            return new Response("ok", { status: 200 });
        }

        // 狀態 — 列出最近草稿
        if (text === "狀態" || text === "status") {
            await handleStatus(supabaseAdmin, botToken, chatId);
            return new Response("ok", { status: 200 });
        }

        // 說明 / help
        if (text === "說明" || text.toLowerCase() === "help") {
            await sendTelegramMessage(botToken, chatId, HELP_TEXT);
            return new Response("ok", { status: 200 });
        }

        // Unknown command
        await sendTelegramMessage(botToken, chatId,
            `❓ 不認識這個指令。\n\n${HELP_TEXT}`
        );
        return new Response("ok", { status: 200 });

    } catch (e) {
        console.error("telegram-webhook error:", (e as Error).message);
        return new Response("ok", { status: 200 }); // Always return 200 to Telegram
    }
});

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleSeoResearch(
    botToken: string,
    chatId: number
): Promise<void> {
    const geminiKey = Deno.env.get("GOOGLE_AI_STUDIO_API_KEY") ?? "";
    if (!geminiKey) {
        await sendTelegramMessage(botToken, chatId, "❌ GOOGLE_AI_STUDIO_API_KEY 未設定");
        return;
    }

    await sendTelegramMessage(botToken, chatId,
        `🔍 *正在進行 SEO 關鍵字研究...*\n\n請稍候約 15 秒，我會建護 3 個高流量主題。`
    );

    const prompt = `你是 RUMA Dragon Boat 龍舟隊的 SEO 專家。
請分析目前台灣龍舟運動的搜尋趨勢，建護 3 個高流量、低競爭的文章主題。

**要求：**
- 適合台灣龍舟新手和進階選手
- 具備 SEO 潛力（搜尋量高、競爭小）
- 內容實用、可擴展為 1500-2000 字的文章

**輸出格式（JSON）：**
{
  "topics": [
    {
      "title": "主題標題",
      "main_keyword": "主關鍵字",
      "reason": "為什麼這個主題有 SEO 潛力"
    }
  ]
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 1024, responseMimeType: "application/json" },
                }),
            }
        );

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const jsonText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const result = JSON.parse(jsonText);
        const topics = result.topics ?? [];

        if (topics.length === 0) throw new Error("No topics returned");

        const topicLines = topics.map((t: { title: string; main_keyword: string; reason: string }, i: number) =>
            `*${i + 1}. ${t.title}*\n🔑 關鍵字：${t.main_keyword}\n💡 ${t.reason}`
        ).join("\n\n");

        const topicList = topics.map((t: { title: string }) => t.title).join(",");

        await sendTelegramMessage(botToken, chatId,
            `📊 *SEO 關鍵字研究完成！*\n\n${topicLines}\n\n` +
            `────────────────────\n` +
            `🚀 *一鍵生成全部 3 篇：*\n` +
            `\`生成 ${topicList}\``
        );
    } catch (err) {
        await sendTelegramMessage(botToken, chatId,
            `❌ SEO 研究失敗：${(err as Error).message}`
        );
    }
}

async function handleGenerateMultiple(
    botToken: string,
    chatId: number,
    topics: string[]
): Promise<void> {
    const count = topics.length;
    const topicDesc = topics.filter(Boolean).join("、") || "隨機主題";

    await sendTelegramMessage(botToken, chatId,
        `⏳ *正在生成 ${count} 篇文章...*\n\n📝 主題：${topicDesc}\n\n請稍候，每篇約 30 秒，共約 ${count * 30} 秒。`
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const generateUrl = `${supabaseUrl}/functions/v1/generate-article`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    for (const topic of topics) {
        fetch(generateUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify(topic ? { topic } : {}),
        }).catch(err => console.error("generate-article call failed:", err));

        // Small delay between calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

async function handlePublish(
    supabase: ReturnType<typeof createClient>,
    botToken: string,
    chatId: number,
    newsId: string
): Promise<void> {
    // Fetch article first to confirm it exists and get slug/title
    const { data: article, error: fetchError } = await supabase
        .from("news")
        .select("id, title, slug, is_published")
        .eq("id", newsId)
        .single();

    if (fetchError || !article) {
        await sendTelegramMessage(botToken, chatId,
            `❌ 找不到文章 ID：\`${newsId}\`\n\n請確認 ID 是否正確。`
        );
        return;
    }

    if (article.is_published) {
        await sendTelegramMessage(botToken, chatId,
            `⚠️ 這篇文章已經是發布狀態了！\n\n📌 *${article.title}*\n🔗 https://rumadragonboat.com/news/${article.slug}`
        );
        return;
    }

    // Publish the article
    const publishedAt = new Date().toISOString();
    const { error: updateError } = await supabase
        .from("news")
        .update({
            is_published: true,
            published_at: publishedAt,
        })
        .eq("id", newsId);

    if (updateError) {
        console.error("Publish failed:", updateError);
        await sendTelegramMessage(botToken, chatId,
            `❌ 發布失敗：${updateError.message}\n\n請稍後再試或手動至後台發布。`
        );
        return;
    }

    // Success!
    await sendTelegramMessage(botToken, chatId,
        `🚀 *文章已正式發布（UAT）！*\n\n` +
        `📌 ${article.title}\n` +
        `🔗 https://rumadragonboat.com/news/${article.slug}\n` +
        `📊 GA 將從現在開始追蹤流量表現`
    );
}

async function handleStatus(
    supabase: ReturnType<typeof createClient>,
    botToken: string,
    chatId: number
): Promise<void> {
    const { data: drafts, error } = await supabase
        .from("news")
        .select("id, title, slug, created_at")
        .eq("is_published", false)
        .order("created_at", { ascending: false })
        .limit(5);

    if (error || !drafts || drafts.length === 0) {
        await sendTelegramMessage(botToken, chatId, "📭 目前沒有待審核的草稿文章。");
        return;
    }

    const list = drafts.map((d, i) =>
        `${i + 1}. *${d.title}*\n   ID: \`${d.id}\`\n   指令：發布 ${d.id}`
    ).join("\n\n");

    await sendTelegramMessage(botToken, chatId,
        `📋 *待審核草稿（最近 ${drafts.length} 篇）*\n\n${list}`
    );
}

// ── Help text ─────────────────────────────────────────────────────────────────

const HELP_TEXT = `
*RUMA 文章審核 Bot 使用說明*

🔍 *SEO 關鍵字研究*
\`關鍵字研究\`
→ 用 AI 分析搜尋趨勢，建護 3 個高流量主題

✍️ *生成文章*
\`生成\`
→ 隨機選取主題，自動生成 1 篇文章草稿

\`生成 {主題}\`
→ 指定主題生成 1 篇（例：\`生成 龍舟訓練技巧\`）

\`生成 {主題1},{主題2},{主題3}\`
→ 逗號分隔，一次生成多篇（例：\`生成 龍舟熱身,划槳技巧,比賽策略\`）

📤 *發布文章*
\`發布 {文章ID}\`
→ 將草稿正式發布至官網

📝 *記錄修改*
\`修改 {文章ID}\`
→ 記錄需要修改（不會自動重新產出）

📋 *查看草稿*
\`狀態\`
→ 列出最近 5 篇待審核草稿

❓ *顯示說明*
\`說明\` 或 \`help\`
→ 顯示此說明
`.trim();
