# 預約系統 500 錯誤問題紀錄

## 問題描述

預約諮詢按鈕打開後顯示「讀取預約服務失敗」，無法載入可預約時段。

## 錯誤訊息

```
GET https://booking-server-110187416117.asia-east1.run.app/freebusy?start=2026...
→ 500 (Internal Server Error)

Error fetching available slots: Error: API request failed
at initBookingSystem (main.js:344:23)
```

## 問題位置

錯誤發生在後端 `server/index.ts` 的 `/freebusy` 端點（第 110-131 行），呼叫 Google Calendar API 時失敗：

```typescript
const result = await calendar.freebusy.query({
  requestBody: {
    timeMin: start as string,
    timeMax: end as string,
    items: [{ id: 'primary' }],
  },
});
```

## 需要的環境變數

Cloud Run 需要設置以下 5 個環境變數：

| 環境變數 | 用途 |
|---------|------|
| `GOOGLE_CLIENT_ID` | OAuth2 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | OAuth2 用戶端密鑰 |
| `GOOGLE_REFRESH_TOKEN` | 長期刷新令牌 |
| `GOOGLE_REDIRECT_URI` | OAuth2 重定向 URI |
| `OWNER_EMAIL` | 網站擁有者 Email（接收預約通知） |

## 可能原因

### 1. Refresh Token 過期（最可能）

如果 Google Cloud 專案 OAuth 同意畫面處於「**測試**」模式（Testing），refresh token 只有 **7 天有效期**。

**解決方法**：
- 將 OAuth 同意畫面發布為「正式版」（Production），或
- 重新執行 `getRefreshToken.ts` 取得新的 refresh token，然後更新 Cloud Run 環境變數

### 2. Cloud Run 環境變數未設置

確認 Cloud Run 服務有正確設置所有 5 個環境變數。

### 3. Google Calendar API 權限問題

- API 可能未在 Google Cloud Console 啟用
- OAuth 範圍可能不包含 Calendar API

## 診斷步驟

1. **查看 Cloud Run logs**
   ```
   https://console.cloud.google.com/run/detail/asia-east1/booking-server/logs
   ```

2. **檢查 OAuth 同意畫面狀態**
   - Google Cloud Console → APIs & Services → OAuth consent screen
   - 確認是「Testing」還是「In production」

3. **驗證環境變數**
   - Cloud Run → booking-server → Edit & Deploy New Revision → Variables
   - 確認 5 個環境變數都有設置

4. **重新取得 Refresh Token**（如果需要）
   ```bash
   cd server
   npx ts-node getRefreshToken.ts
   ```

## 暫時處理

前端預約按鈕已暫時隱藏，待問題修復後再啟用。

隱藏的元素：
- `docs/index.html` 第 39 行：`#booking-button`
- `docs/index.html` 第 424 行：`#booking-button-footer`

## 記錄日期

2026-01-20
