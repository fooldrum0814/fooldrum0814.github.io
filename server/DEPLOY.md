# 🚀 部署到 Google Cloud Run 指南

本指南將幫助您將後端伺服器部署到 Google Cloud Run。

## 📋 前置需求

1. **安裝 Google Cloud CLI**
   - 下載並安裝：[Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
   - 驗證安裝：`gcloud --version`

2. **登入 Google Cloud**
   ```bash
   gcloud auth login
   ```

3. **設定預設專案（推薦，一次性設定）**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
   > 💡 **建議**：設定後，部署腳本會自動讀取，不需要每次輸入或放在 .env 中

## 🔧 步驟 1：啟用必要的 API

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  containerregistry.googleapis.com \
  --project=YOUR_PROJECT_ID
```

## 📦 步驟 2：建立 Artifact Registry 儲存庫

```bash
gcloud artifacts repositories create gcr.io \
  --repository-format=docker \
  --location=us \
  --project=YOUR_PROJECT_ID \
  --description="Docker repository for container images"
```

## 🔐 步驟 3：設定 Cloud Build 權限

```bash
# 取得專案編號
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# 授予 Cloud Build 權限
gcloud artifacts repositories add-iam-policy-binding gcr.io \
  --location=us \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=YOUR_PROJECT_ID
```

## 🏗️ 步驟 4：建置並推送 Docker 映像

### 方法 A：使用部署腳本（推薦）

**方式 1：在命令行提供專案 ID**
```bash
cd server
./deploy.sh YOUR_PROJECT_ID
```

**方式 2：使用 gcloud config（最推薦，一次性設定）**

```bash
# 設定預設專案（只需設定一次）
gcloud config set project YOUR_PROJECT_ID

# 之後直接執行即可
cd server
./deploy.sh
```

> **注意**：
> - 執行腳本時必須使用 `./deploy.sh`（加上 `./` 前綴），而不是直接 `deploy.sh`
> - 如果未在命令行提供專案 ID，腳本會自動從 `gcloud config` 讀取
> - 這是 Google Cloud 官方推薦的方式，一次設定後即可重複使用

### 方法 B：手動部署

```bash
cd server
gcloud builds submit \
  --tag us-docker.pkg.dev/YOUR_PROJECT_ID/gcr.io/booking-server \
  --project=YOUR_PROJECT_ID
```

## 🚀 步驟 5：部署到 Cloud Run

### 方法 A：使用部署腳本

腳本會自動執行此步驟（見步驟 4）

### 方法 B：手動部署

```bash
gcloud run deploy booking-server \
  --image us-docker.pkg.dev/YOUR_PROJECT_ID/gcr.io/booking-server \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --project=YOUR_PROJECT_ID
```

部署成功後，您會收到一個服務 URL，例如：`https://booking-server-xxxxx.asia-east1.run.app`

## 🔑 步驟 6：設定環境變數

### 在 Cloud Run 控制台設定：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇 **Cloud Run** → 點擊您的服務 `booking-server`
3. 點擊 **「編輯與部署新版本」**
4. 展開 **「變數與密鑰」** 區段
5. 新增以下環境變數：

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456789-xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxx` |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth Refresh Token | `1//xxxxx` |
| `GOOGLE_REDIRECT_URI` | OAuth 重導向 URI | `http://localhost:3000/oauth2callback` |
| `OWNER_EMAIL` | 接收預約通知的 Gmail | `your.email@gmail.com` |
| `PORT` | 伺服器端口（選填，預設 3000） | `8080` |

### 使用命令行設定環境變數：

```bash
gcloud run services update booking-server \
  --update-env-vars GOOGLE_CLIENT_ID="your-client-id",GOOGLE_CLIENT_SECRET="your-secret",GOOGLE_REFRESH_TOKEN="your-token",GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback",OWNER_EMAIL="your.email@gmail.com" \
  --region asia-east1 \
  --project=YOUR_PROJECT_ID
```

## 🌐 步驟 7：更新前端 API 地址

部署完成後，請更新前端的 API 地址：

1. 編輯 `src/main.ts`，將第 286 行的 URL 替換為您的 Cloud Run URL：
   ```typescript
   const API_BASE_URL = window.location.hostname.includes('github.io') 
     ? 'https://YOUR-SERVICE-URL.asia-east1.run.app' 
     : 'http://localhost:3000';
   ```

2. 編輯 `index.html`，更新 CSP（Content Security Policy）第 6 行：
   ```html
   connect-src 'self' http://localhost:3000 https://YOUR-SERVICE-URL.asia-east1.run.app;
   ```

3. 重新建置並推送前端到 GitHub Pages：
   ```bash
   npm run build
   git add .
   git commit -m "Update API URL for production"
   git push
   ```

## 🔄 更新部署

當您修改程式碼後，需要重新部署：

```bash
cd server
gcloud builds submit \
  --tag us-docker.pkg.dev/YOUR_PROJECT_ID/gcr.io/booking-server \
  --project=YOUR_PROJECT_ID

gcloud run deploy booking-server \
  --image us-docker.pkg.dev/YOUR_PROJECT_ID/gcr.io/booking-server \
  --platform managed \
  --region asia-east1 \
  --project=YOUR_PROJECT_ID
```

## ✅ 驗證部署

1. **測試健康檢查端點**：
   ```bash
   curl https://YOUR-SERVICE-URL.asia-east1.run.app/
   ```
   應該回應：`Booking server is running!`

2. **測試 API 端點**（需要適當的參數）：
   ```bash
   curl "https://YOUR-SERVICE-URL.asia-east1.run.app/freebusy?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z"
   ```

## 🐛 常見問題

### 問題 1：權限被拒
```
denied: Permission "artifactregistry.repositories.uploadArtifacts" denied
```
**解決**：重新執行步驟 3 設定 Cloud Build 權限

### 問題 2：環境變數未生效
**解決**：確認環境變數已正確設定在 Cloud Run 服務中，且變數名稱完全一致（大小寫敏感）

### 問題 3：CORS 錯誤
**解決**：確認 `server/index.ts` 中的 CORS whitelist 包含您的前端網址

### 問題 4：Google API 認證失敗
**解決**：
- 確認所有環境變數都已正確設定
- 檢查 Refresh Token 是否有效（可能需要重新取得）
- 確認 Gmail API 和 Calendar API 都已啟用

## 📝 注意事項

- ⚠️ **絕對不要**將 `.env` 文件或任何敏感資訊提交到 Git
- 🔒 所有機密資訊都應該透過 Cloud Run 的環境變數設定
- 💰 Cloud Run 有免費額度，但超出後會產生費用
- 🔄 建議設定 Cloud Run 的最小實例數為 0（按需啟動），以節省成本

