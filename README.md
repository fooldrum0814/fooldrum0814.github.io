# Jason (Hsi-Chuan) Wang - 個人履歷網站

歡迎來到我的個人履歷網站！

## 🌟 網站介紹

- 📱 **響應式設計**：適配手機、平板和電腦
- 🌓 **深色/淺色模式**：自動適應系統主題
- 🌐 **多語系支援**：支援英文和繁體中文切換

## 📋 內容包含

- **關於我**：個人簡介與核心理念
- **專業服務**：提供的服務項目與技術專長
- **技能與專長**：程式語言、框架與工具
- **專案作品**：過往的專案經驗
- **工作經歷**：職涯發展歷程

## 🔗 連結

- **網站**：[https://fooldrum0814.github.io](https://fooldrum0814.github.io)
- **GitHub**：[@fooldrum0814](https://github.com/fooldrum0814)

---

## 🚀 部署與環境設定 (Deployment & Environments)

本專案包含一個靜態前端網站和一個 Node.js 後端伺服器，並整合了 Google Calendar API。以下是在開發與正式環境中部署的關鍵設定與學習紀錄。

### 核心概念：開發 vs. 正式環境

- **開發環境 (Development)**：前端 (`localhost:8000`) 和後端 (`localhost:3000`) 都在本地運行，方便快速開發與除錯。
- **正式環境 (Production)**：前端部署在 GitHub Pages (`https://fooldrum0814.github.io`)，後端則需要部署到一個公開的雲端服務（如 Google Cloud Run），才能被公開的前端網站存取。

### 後端部署 (Google Cloud Run)

為了讓後端伺服器能公開存取，我們選擇了 Google Cloud Run 進行部署。

#### 前置需求

1. **安裝 Google Cloud CLI**：從 [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) 下載並安裝
2. **建立 Google Cloud 專案**：在 [Google Cloud Console](https://console.cloud.google.com/) 建立新專案
3. **設定 gcloud 預設專案**：
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

#### Google Cloud 專案設定

在開始部署前，需要啟用必要的 API 服務：

```bash
# 啟用必要的 API
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  containerregistry.googleapis.com \
  --project=YOUR_PROJECT_ID
```

#### 建立 Artifact Registry 儲存庫

Google Cloud 使用 Artifact Registry 來儲存 Docker 映像：

```bash
gcloud artifacts repositories create gcr.io \
  --repository-format=docker \
  --location=us \
  --project=YOUR_PROJECT_ID \
  --description="Docker repository for container images"
```

#### 安裝後端依賴項

確保 `server/package.json` 包含所有必要的類型定義：

```json
{
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.5",
    "@types/node": "^24.10.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

然後安裝依賴：
```bash
cd server
npm install
cd ..
```

#### 部署流程

1.  **Dockerfile**：在 `server/` 資料夾中，我們建立了一個 `Dockerfile`。它如同一個食譜，定義了如何將 Node.js/TypeScript 應用程式打包成一個標準化的容器，讓 Cloud Run 能夠理解並運行它。

2.  **建置並推送映像到 Artifact Registry**：
    ```bash
    gcloud builds submit \
      --tag us-docker.pkg.dev/YOUR_PROJECT_ID/gcr.io/booking-server \
      --project=YOUR_PROJECT_ID \
      ./server
    ```
    
    **注意**：使用 Artifact Registry 的完整 URL 格式：
    - ✅ 正確：`us-docker.pkg.dev/PROJECT_ID/REPO_NAME/IMAGE_NAME`
    - ❌ 錯誤：`gcr.io/PROJECT_ID/IMAGE_NAME`（舊格式）

3.  **部署到 Cloud Run**：
    ```bash
    gcloud run deploy booking-server \
      --image us-docker.pkg.dev/YOUR_PROJECT_ID/gcr.io/booking-server \
      --platform managed \
      --region asia-east1 \
      --allow-unauthenticated \
      --project=YOUR_PROJECT_ID
    ```
    
    部署成功後，您會收到一個服務 URL，例如：`https://booking-server-xxxxx.asia-east1.run.app`

4.  **環境變數安全性**：所有機密資訊（如 Google API 的金鑰和 Token）**絕對不能**寫死在程式碼或 `Dockerfile` 中。我們是在部署完成後，進入 Cloud Run 服務的「變數與密鑰」頁面，將這些機密資訊安全地設定為環境變數。

#### 常見問題與解決方案

**問題 1：TypeScript 編譯錯誤 - 找不到 'cors' 模組**
```
error TS7016: Could not find a declaration file for module 'cors'
```
**解決**：安裝 `@types/cors` 套件
```bash
npm install --save-dev @types/cors
```

**問題 2：權限被拒 - artifactregistry.repositories.uploadArtifacts**
```
denied: Permission "artifactregistry.repositories.uploadArtifacts" denied
```
**解決**：授予 Cloud Build 服務帳戶必要權限
```bash
# 取得專案編號
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# 授予權限
gcloud artifacts repositories add-iam-policy-binding gcr.io \
  --location=us \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=YOUR_PROJECT_ID
```

**問題 3：跨專案部署權限問題**

如果您在不同的專案之間部署（例如：在專案 A 建置映像，在專案 B 部署 Cloud Run），記得：
- 始終使用 `--project` 參數明確指定專案
- 確保目標專案的服務帳戶有權限存取來源專案的映像

### 前後端連線與安全性設定

在將網站從開發環境移至正式環境時，我們解決了兩個主要的跨來源安全性問題：

1.  **CORS (跨來源資源共用)**
    -   **問題**：後端伺服器預設會拒絕來自不同來源（例如 `github.io`）的 API 請求。
    -   **解決方案**：在後端 `server/index.ts` 中，我們設定了 `cors` 中介軟體，並建立一個“白名單”，明確授權來自開發環境 (`http://localhost:8000`) 和正式環境 (`https://fooldrum0814.github.io`) 的請求。

2.  **CSP (內容安全政策)**
    -   **問題**：前端網站的 `index.html` 中有一項安全政策，限制了它只能向哪些網址發起連線。
    -   **解決方案**：在根目錄的 `index.html` 中，我們修改了 `Content-Security-Policy` 的 `connect-src` 指令，將後端的本地位址 (`http://localhost:3000`) 和正式環境的公開網址 (`https://...run.app`) 都加入許可名單。

3.  **動態 API 位址**
    -   **問題**：前端程式碼中的 API 位址不能寫死為 `localhost:3000`，否則在正式環境會出錯。
    -   **解決方案**：在 `src/main.ts` 中，我們加入了一段邏輯，透過 `window.location.hostname` 判斷當前環境。如果是正式環境 (`github.io`)，就使用後端的公開網址；反之，則使用本地的 `localhost:3000`。這讓一套程式碼能同時適用於兩種環境。

---

感謝您的參觀！如有任何問題或合作機會，歡迎透過網站上的聯絡方式與我聯繫。
