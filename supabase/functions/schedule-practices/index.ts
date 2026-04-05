// supabase/functions/schedule-practices/index.ts
// 每週自動建立船練活動 + LINE 推播通知
//
// 觸發方式：由 GAS Time-driven Trigger (每週日 21:30) 呼叫
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
    dayName: string;
    startTime: string;
    endTime: string;
    location: string;
}

const WEEKLY_SCHEDULES: PracticeSchedule[] = [
    { dayOffset: 3, dayName: "三", startTime: "05:45:00", endTime: "07:00:00", location: "碧潭 Bitan" },
    { dayOffset: 4, dayName: "四", startTime: "05:45:00", endTime: "07:00:00", location: "碧潭 Bitan" },
    { dayOffset: 6, dayName: "六", startTime: "09:00:00", endTime: "11:00:00", location: "碧潭 Bitan" },
    { dayOffset: 7, dayName: "日", startTime: "07:30:00", endTime: "10:00:00", location: "碧潭 Bitan" },
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
        const insertPayload = toCreate.map((t) => {
            const dateParts = t.date.split("-");
            const mm = dateParts[1];
            const dd = dateParts[2];
            const activityName = `${mm}/${dd} (${t.dayName})船練`;
            const shortStart = t.startTime.substring(0, 5);
            const shortEnd = t.endTime.substring(0, 5);

            return {
                name: activityName,
                type: "boat_practice",
                date: t.date,
                start_time: t.startTime,
                end_time: t.endTime,
                location: t.location,
                description: `${mm}/${dd}(${t.dayName}) ${shortStart}-${shortEnd} @${t.location}`,
            };
        });

        const { data: created, error: insertError } = await supabaseAdmin
            .from("activities")
            .insert(insertPayload)
            .select();

        if (insertError) {
            throw new Error(`建立活動失敗: ${insertError.message}`);
        }

        console.log(`成功建立 ${created?.length ?? 0} 場船練活動`);

        // ── 6. LINE 推播通知 (正式啟用) ─────────────────────────────
        if (lineChannelToken && lineGroupId) {
            const messageText =
                "大家晚安，下週船練報名開放囉，趕緊手刀報名起來！\n" +
                "Good evening guys! Sign-ups for next week’s boat practice are open — hurry and grab your spot!\n" +
                "👉 https://rumadragonboat.com/app/practice";

            try {
                await pushLineMessage(lineChannelToken, lineGroupId, messageText);
                console.log("Edge Function 發送 LINE 推播成功");
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
