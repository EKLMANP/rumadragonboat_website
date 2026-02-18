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

        // 生成 / 生成 {主題}
        const generateMatch = text.match(/^生成(?:\s+(.+))?$/);
        if (generateMatch) {
            const topic = generateMatch[1]?.trim() || "";
            await handleGenerate(botToken, chatId, topic);
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

async function handleGenerate(
    botToken: string,
    chatId: number,
    topic: string
): Promise<void> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const generateUrl = `${supabaseUrl.replace("/rest/v1", "")}/functions/v1/generate-article`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Call generate-article function asynchronously (fire and forget)
    // The generate-article function will send its own Telegram notification when done
    fetch(generateUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(topic ? { topic } : {}),
    }).catch(err => console.error("generate-article call failed:", err));
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
        `🔗 https://uat.rumadragonboat.com/news/${article.slug}\n` +
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

✍️ *生成文章*
\`生成\`
→ 隨機選取主題，自動生成文章草稿

\`生成 {主題}\`
→ 指定主題生成文章（例：\`生成 龍舟訓練技巧\`）

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
