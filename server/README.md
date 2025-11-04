
# Google Calendar API 預約後端伺服器

這是一個使用 Node.js、Express 和 TypeScript 建立的後端伺服器，用於串接 Google Calendar API，實現一個簡易的預約系統所需的核心功能。

## 功能 (Features)

- 讀取使用者的 Google 日曆清單。
- 查詢指定時間範圍內的忙碌時段。
- 提供基於 OAuth 2.0 的身份驗證流程，使用 Refresh Token 進行長期授權。

## 技術棧 (Tech Stack)

- Node.js
- Express.js
- TypeScript
- googleapis (Google API Node.js 客戶端)
- dotenv

---

## 設定步驟 (Setup Guide)

請依照以下步驟完成專案的設定與啟動。

### 1. Google Cloud Platform 設定

1.  **建立新專案**：前往 [Google Cloud Platform Console](https://console.cloud.google.com/) 建立一個新的專案。
2.  **啟用 API**：在側邊選單選擇 **API 和服務 > 程式庫**，搜尋並**啟用** "Google Calendar API"。
3.  **設定同意畫面**：在 **API 和服務 > OAuth 同意畫面** 中：
    -   選擇 **外部 (External)**。
    -   填寫必要的應用程式資訊（名稱、使用者支援電子郵件等）。
    -   在“測試使用者”步驟，點擊 **+ ADD USERS** 將您自己的 Google 電子郵件加入，否則在測試階段會無法登入。
4.  **建立憑證**：在 **API 和服務 > 憑證** 中：
    -   點擊 **+ 建立憑證 > OAuth 用戶端 ID**。
    -   應用程式類型選擇 **網頁應用程式 (Web application)**。
    -   在“已授權的重新導向 URI”中，點擊 **+ 新增 URI**，並輸入 `http://localhost:3000/oauth2callback`。
    -   建立後，您會得到一組**用戶端 ID (Client ID)** 和**用戶端密碼 (Client Secret)**。請將它們複製下來。

### 2. 本地環境設定

1.  **安裝依賴**：在 `server` 資料夾中，執行 `npm install`。
2.  **建立 .env 檔案**：在 `server` 資料夾中，手動建立一個名為 `.env` 的檔案。
3.  **填寫 .env 檔案**：將您從 GCP 取得的資訊填入 `.env` 檔案，格式如下：
    ```
    GOOGLE_CLIENT_ID=從GCP複製的用戶端ID
    GOOGLE_CLIENT_SECRET=從GCP複製的用戶端密碼
    GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
    ```

### 3. 獲取 REFRESH_TOKEN

Refresh Token 是允許伺服器長期存取您日曆的關鍵，需要透過一次性的手動授權來獲取。

1.  在專案**根目錄**的終端機中，執行以下指令：
    ```bash
    npx ts-node server/getRefreshToken.ts
    ```
2.  終端機會產生一個**授權網址**，將它複製到瀏覽器中打開。
3.  登入您的 Google 帳號並同意授權。
4.  頁面會跳轉到一個無法連線的頁面，這是正常的。請從瀏覽器的**網址列**複製 `code=` 後面的那串**授權碼**。
5.  將授權碼貼回終端機並按下 Enter。
6.  終端機將會印出您的 **Refresh Token**。
7.  將這個 Refresh Token 加到您的 `.env` 檔案中：
    ```
    GOOGLE_REFRESH_TOKEN=剛剛取得的Refresh_Token
    ```

### 4. 啟動伺服器

在終端機中執行：

```bash
npm run dev --prefix server
```

伺服器將會啟動並運行在 `http://localhost:3000`。

---

## 後端運作流程

1.  **讀取設定**：伺服器啟動時，會透過 `dotenv` 套件讀取 `.env` 檔案中的所有 Google API 憑證。
2.  **初始化客戶端**：使用 `googleapis` 套件和讀取到的憑證，建立一個 OAuth2 客戶端 (`oAuth2Client`)。
3.  **長期授權**：將 `GOOGLE_REFRESH_TOKEN` 設定到 `oAuth2Client` 中。這個 Refresh Token 如同一把長期有效的鑰匙。
4.  **自動換發通行證**：當有 API 請求（例如：查詢忙碌時段）進來時，`oAuth2Client` 會自動在背景使用 Refresh Token 向 Google 換取一個短時效的 Access Token (通行證)，並用它來完成對 Google Calendar API 的請求。這個過程是自動的，確保了伺服器可以持續地在背景運作。

---

## API 端點 (API Endpoints)

### `GET /`

-   **功能**：伺服器健康檢查，確認伺服器是否正常運行。
-   **回應**：`Booking server is running!`

### `GET /calendars`

-   **功能**：取得使用者 Google 帳號中的所有日曆清單。
-   **回應範例**：
    ```json
    [
      { "id": "user@gmail.com", "summary": "user@gmail.com" },
      { "id": "...", "summary": "Birthdays" }
    ]
    ```

### `GET /freebusy`

-   **功能**：查詢主要日曆在指定時間範圍內的忙碌時段。
-   **參數**：
    -   `start`: 查詢的開始時間 (必須是 ISO 8601 格式，例如：`2025-11-01T00:00:00Z`)
    -   `end`: 查詢的結束時間 (ISO 8601 格式)
-   **請求範例**： `http://localhost:3000/freebusy?start=2025-11-01T00:00:00Z&end=2025-11-30T23:59:59Z`
-   **回應範例**：
    ```json
    [ 
      { 
        "start": "2025-11-11T07:00:00Z", 
        "end": "2025-11-11T09:00:00Z" 
      } 
    ]
    ```

---

## 開發與除錯紀錄

在這次的開發過程中，我們遇到並解決了以下問題：

1.  **問題**：`zsh: command not found: ts-node`
    -   **原因**：`ts-node` 是作為專案的開發依賴安裝在 `node_modules` 中，其路徑沒有被加到系統的環境變數裡。
    -   **解決方案**：使用 `npx` (Node.js 的套件執行器) 來執行指令，`npx` 會自動找到並使用專案內部的套件。例如：`npx ts-node server/getRefreshToken.ts`。

2.  **問題**：授權時發生 `Error 400: invalid_request` 錯誤。
    -   **原因**：經過偵錯，發現程式讀取到的 Client ID 等環境變數顯示為 `undefined`。這是因為 `dotenv` 預設從“執行指令的當前目錄”（專案根目錄）讀取 `.env`，但我們的檔案在 `server/` 子目錄中。
    -   **解決方案**：修改程式碼，明確告訴 `dotenv` 要讀取的 `.env` 檔案路徑：`dotenv.config({ path: path.resolve(__dirname, '.env') })`。

3.  **問題**：伺服器啟動後，API 測試回傳 `Error: invalid_grant`。
    -   **原因**：這個錯誤代表 Google 拒絕了我們提供的 Refresh Token。這幾乎總是因為從終端機複製 Refresh Token 到 `.env` 檔案時發生了複製錯誤（如多了空格或少了字元）。
    -   **解決方案**：重新執行一次 `getRefreshToken.ts` 流程，產生一個全新的 Refresh Token，並在複製貼上時格外小心，確保其完整性。
