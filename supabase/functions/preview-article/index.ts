// supabase/functions/preview-article/index.ts
// 草稿預覽 Edge Function
// 驗證 HMAC-SHA256 token 後，回傳未發布的草稿文章內容
// 呼叫方式：GET /functions/v1/preview-article?slug=xxx&token=yyy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
    "https://rumadragonboat.com",
    "https://www.rumadragonboat.com",
    "https://uat.rumadragonboat.com",
    "http://localhost:5173",
    "http://localhost:3000",
];

function corsHeaders(origin: string) {
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
    };
}

function jsonResponse(data: unknown, status = 200, origin = "") {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
}

/**
 * 計算 HMAC-SHA256 並回傳前 32 個 hex 字元
 * Token = HMAC-SHA256(PREVIEW_SECRET, slug).hex[:32]
 */
async function computeToken(secret: string, slug: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(slug);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex.slice(0, 32);
}

serve(async (req) => {
    const origin = req.headers.get("origin") ?? "";

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders(origin) });
    }

    if (req.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, 405, origin);
    }

    try {
        const url = new URL(req.url);
        const slug = url.searchParams.get("slug");
        const token = url.searchParams.get("token");

        // Validate required params
        if (!slug || !token) {
            return jsonResponse({ error: "Missing slug or token" }, 400, origin);
        }

        // Get preview secret from environment
        const previewSecret = Deno.env.get("PREVIEW_SECRET");
        if (!previewSecret) {
            console.error("PREVIEW_SECRET not configured");
            return jsonResponse({ error: "Preview not configured" }, 500, origin);
        }

        // Validate HMAC token
        const expectedToken = await computeToken(previewSecret, slug);
        if (token !== expectedToken) {
            console.warn(`Invalid preview token for slug: ${slug}`);
            return jsonResponse({ error: "Invalid or expired preview token" }, 403, origin);
        }

        // Token valid — fetch draft article using service role (bypasses RLS)
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { data, error } = await supabaseAdmin
            .from("news")
            .select("*")
            .eq("slug", slug)
            .single();

        if (error || !data) {
            console.error("Article not found:", slug, error);
            return jsonResponse({ error: "Article not found" }, 404, origin);
        }

        // Return article data (including drafts)
        return jsonResponse({ data }, 200, origin);

    } catch (e) {
        console.error("preview-article error:", e.message);
        return jsonResponse({ error: e.message }, 500, origin);
    }
});
