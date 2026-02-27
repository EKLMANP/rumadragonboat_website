// supabase/functions/schedule-practices/index.ts
// 每週自動建立船練活動 + LINE 推播通知
//
// 觸發方式：由 GAS Time-driven Trigger (每週日 21:00-22:00) 呼叫
// 功能：
//   1. 計算下週三、四、六、日的日期
//   2. 檢查 activities 表是否已有該日期的 boat_practice（避免重複）
//   3. INSERT 新的船練活動
//   4. 呼叫 LINE Messaging API push message 通知 RUMA 群組

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── 船練排程設定 ─────────────────────────────────────────────────────────────

interface PracticeSchedule {
    dayOffset: number; // 從週日算起的天數 (週三=3, 週四=4, 週六=6, 週日=7)
    name: string;
    startTime: string;
    endTime: string;
    location: string;
}

const WEEKLY_SCHEDULES: PracticeSchedule[] = [
    { dayOffset: 3, name: "週三船練", startTime: "05:45", endTime: "07:00", location: "碧潭" },
    { dayOffset: 4, name: "週四船練", startTime: "05:45", endTime: "07:00", location: "碧潭" },
    { dayOffset: 6, name: "週六船練", startTime: "09:00", endTime: "11:00", location: "碧潭" },
    { dayOffset: 7, name: "週日船練", startTime: "07:45", endTime: "09:30", location: "碧潭" },
];

// ── 日期工具 ─────────────────────────────────────────────────────────────────

/**
 * 取得台灣時區的「今天」(UTC+8)
 */
function getTaiwanToday(): Date {
    const now = new Date();
    // 轉換為 UTC+8
    const taiwanOffset = 8 * 60; // minutes
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const taiwanMs = utcMs + taiwanOffset * 60000;
    const taiwanNow = new Date(taiwanMs);
    // 只取日期部分
    taiwanNow.setHours(0, 0, 0, 0);
    return taiwanNow;
}

/**
 * 計算目標日期 (從 baseDate 加上 dayOffset 天)
 * 回傳 'YYYY-MM-DD' 格式
 */
function getTargetDate(baseDate: Date, dayOffset: number): string {
    const target = new Date(baseDate);
    target.setDate(baseDate.getDate() + dayOffset);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * 格式化日期為中文可讀格式 (用於 LINE 訊息)
 * 例：'2026-02-25' → '2/25(三)'
 * 注意：手動解析避免 Deno UTC 時區偏移問題
 */
function formatDateChinese(dateStr: string): string {
    const parts = dateStr.split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    // 使用 UTC 方法避免時區偏移
    const d = new Date(Date.UTC(year, month - 1, day));
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const dayName = dayNames[d.getUTCDay()];
    return `${month}/${day}(${dayName})`;
}

// ── LINE Messaging API ───────────────────────────────────────────────────────

async function pushLineMessage(
    channelToken: string,
    groupId: string,
    messageText: string
): Promise<void> {
    const url = "https://api.line.me/v2/bot/message/push";
    const payload = {
        to: groupId,
        messages: [{ type: "text", text: messageText }],
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channelToken}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LINE push failed (${response.status}): ${errorBody}`);
    }

    console.log("LINE 推播成功");
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
    // 支援 GET (瀏覽器測試) 和 POST (GAS 呼叫)
    if (req.method !== "POST" && req.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        // ── 1. 初始化 Supabase Admin Client ──────────────────────────────
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const lineChannelToken = Deno.env.get("LINE_CHANNEL_TOKEN") ?? "";
        const lineGroupId = Deno.env.get("LINE_GROUP_ID") ?? "";

        if (!supabaseUrl || !serviceRoleKey) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // ── 2. 計算下週船練日期 ──────────────────────────────────────────
        const today = getTaiwanToday();
        console.log(`今天 (台灣時間): ${today.toISOString().split("T")[0]}`);

        const targetDates = WEEKLY_SCHEDULES.map((schedule) => ({
            ...schedule,
            date: getTargetDate(today, schedule.dayOffset),
        }));

        console.log("目標日期:", targetDates.map((t) => `${t.name} ${t.date}`));

        // ── 3. 檢查已存在的活動 (防止重複) ──────────────────────────────
        const dateStrings = targetDates.map((t) => t.date);

        const { data: existingActivities, error: queryError } = await supabaseAdmin
            .from("activities")
            .select("date")
            .eq("type", "boat_practice")
            .in("date", dateStrings);

        if (queryError) {
            throw new Error(`查詢現有活動失敗: ${queryError.message}`);
        }

        const existingDates = new Set(
            (existingActivities || []).map((a: { date: string }) => a.date)
        );

        // ── 4. 篩選出需要建立的活動 ──────────────────────────────────────
        const toCreate = targetDates.filter((t) => !existingDates.has(t.date));

        if (toCreate.length === 0) {
            console.log("所有日期已存在，跳過建立");
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "所有日期已存在，無需建立",
                    created: [],
                    skipped: dateStrings,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // ── 5. 批次 INSERT 新活動 ────────────────────────────────────────
        const insertPayload = toCreate.map((t) => ({
            name: t.name,
            type: "boat_practice",
            date: t.date,
            start_time: t.startTime,
            end_time: t.endTime,
            location: t.location,
            description: `${formatDateChinese(t.date)} ${t.startTime}-${t.endTime} @${t.location}`,
        }));

        const { data: created, error: insertError } = await supabaseAdmin
            .from("activities")
            .insert(insertPayload)
            .select();

        if (insertError) {
            throw new Error(`建立活動失敗: ${insertError.message}`);
        }

        console.log(`成功建立 ${created?.length ?? 0} 場船練活動`);

        // ── 6. LINE 推播通知 (雙軌期暫時關閉) ─────────────────────────────
        if (lineChannelToken && lineGroupId) {
            // 組合推播訊息，列出本次新建的所有船練日期
            const dateList = toCreate
                .map((t) => `  📅 ${formatDateChinese(t.date)} ${t.startTime}-${t.endTime}`)
                .join("\n");

            const messageText =
                "大家晚安，下週船練報名開放囉，趕緊手刀報名起來！\n" +
                "Good evening guys! Sign-ups for next week's boat practice are open — hurry and grab your spot!\n\n" +
                dateList + "\n\n" +
                "👉 https://uat.rumadragonboat.com/";

            try {
                // ⚠️ 雙軌期：在 GAS 端已經有發送 LINE 推播了，這裡暫時關閉避免連發兩次
                // await pushLineMessage(lineChannelToken, lineGroupId, messageText);
                console.log("雙軌期：跳過 Edge Function 端 LINE 推播，交給舊版 GAS 發送");
            } catch (lineError) {
                console.error("LINE 推播失敗:", (lineError as Error).message);
                // LINE 失敗不影響活動建立結果
            }
        } else {
            console.warn("LINE_CHANNEL_TOKEN 或 LINE_GROUP_ID 未設定，跳過推播");
        }

        // ── 7. 回傳結果 ─────────────────────────────────────────────────
        return new Response(
            JSON.stringify({
                success: true,
                message: `成功建立 ${created?.length ?? 0} 場船練活動`,
                created: created || [],
                skipped: [...existingDates],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (e) {
        console.error("schedule-practices error:", (e as Error).message);
        return new Response(
            JSON.stringify({ success: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
