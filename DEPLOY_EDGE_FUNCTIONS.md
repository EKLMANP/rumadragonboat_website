# RUMA Edge Functions 部署指南

部署兩個新的 Supabase Edge Functions：`preview-article` 和 `telegram-webhook`

---

## 前置需求

由於您的環境沒有 `brew`，請使用 `npx` 執行 Supabase CLI：

```bash
# 登入 Supabase
npx supabase login

# 連結到專案（在 01-Tech/website 目錄下）
cd "/Users/ericpan/RUMA Dragon Boat/01-Tech/website"
npx supabase link --project-ref tmhlxhkzmssqnptmqzhy
```

---

## Step 1：設定 Edge Function Secrets

這些 secrets 必須設定在 Supabase 專案中，Edge Functions 才能讀取：

```bash
# 草稿預覽 HMAC 金鑰（與 02-Content/.env 中的 PREVIEW_SECRET 相同）
npx supabase secrets set PREVIEW_SECRET=1a666c7baf7b354f2fc514f536fb5017

# Telegram Webhook 驗證金鑰
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET=bc2992e96d2dd9289e8cd8926a5f5db8

# Telegram Bot Token
npx supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

# Telegram Chat ID（Eric 的 Chat ID）
npx supabase secrets set TELEGRAM_CHAT_ID=882308403
```

> ⚠️ `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 在 Edge Functions 中是自動注入的，不需要手動設定。

---

## Step 2：部署 Edge Functions

```bash
cd "/Users/ericpan/RUMA Dragon Boat/01-Tech/website"

# 部署草稿預覽 Function
npx supabase functions deploy preview-article --no-verify-jwt

# 部署 Telegram Webhook Function
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

> `--no-verify-jwt`：允許未登入的請求（preview-article 需要無需登入存取；telegram-webhook 用自己的 secret 驗證）

---

## Step 3：設定 Telegram Webhook

部署完成後，執行一次以下指令，告訴 Telegram 把訊息送到我們的 Edge Function：

```bash
curl "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://tmhlxhkzmssqnptmqzhy.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=bc2992e96d2dd9289e8cd8926a5f5db8"
```

**確認 Webhook 設定成功：**
```bash
curl "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

應看到 `"url": "https://tmhlxhkzmssqnptmqzhy.supabase.co/functions/v1/telegram-webhook"`

---

## Step 4：部署前端（Vercel）

`NewsDetailPage.jsx` 和 `supabaseApi.js` 已更新，需要重新部署前端：

```bash
cd "/Users/ericpan/RUMA Dragon Boat/01-Tech/website"
git add -A
git commit -m "feat: add draft preview mode and Telegram webhook support"
git push origin main
```

Vercel 會自動觸發部署。

---

## 驗證測試

### 測試草稿預覽
```bash
# 1. 上傳一篇測試草稿
cd "/Users/ericpan/RUMA Dragon Boat/02-Content"
python3 ruma-creative-master/resources/upload_draft.py --article articles/dragon-boat-beginner-guide

# 2. Telegram 會收到含預覽連結的通知
# 3. 點擊預覽連結，確認頁面顯示「草稿預覽模式」黃色橫幅
```

### 測試 Telegram Webhook
```bash
# 在 Telegram 傳送：狀態
# 應收到最近草稿列表

# 在 Telegram 傳送：發布 {news_id}
# 應收到發布成功確認，文章應出現在 https://rumadragonboat.com/news/
```

---

## 函式端點

| Function | URL |
|----------|-----|
| preview-article | `https://tmhlxhkzmssqnptmqzhy.supabase.co/functions/v1/preview-article?slug=xxx&token=yyy` |
| telegram-webhook | `https://tmhlxhkzmssqnptmqzhy.supabase.co/functions/v1/telegram-webhook` |
