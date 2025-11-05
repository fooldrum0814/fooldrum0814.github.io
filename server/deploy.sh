#!/bin/bash

# 部署腳本 - 將後端部署到 Google Cloud Run
# 使用方法: ./deploy.sh [YOUR_PROJECT_ID]
# 如果未提供 PROJECT_ID，會從 gcloud config 讀取

set -e  # 遇到錯誤立即停止

PROJECT_ID=$1

# 如果命令行未提供，從 gcloud config 讀取
if [ -z "$PROJECT_ID" ]; then
  GCLOUD_PROJECT=$(gcloud config get-value project 2>/dev/null)
  if [ -n "$GCLOUD_PROJECT" ] && [ "$GCLOUD_PROJECT" != "(unset)" ]; then
    PROJECT_ID=$GCLOUD_PROJECT
    echo "ℹ️  從 gcloud config 讀取專案 ID: $PROJECT_ID"
  else
    echo "❌ 錯誤：未找到專案 ID"
    echo ""
    echo "請使用以下方式之一設定專案 ID："
    echo ""
    echo "【推薦】方式 1：使用 gcloud config（一次性設定）"
    echo "  gcloud config set project YOUR_PROJECT_ID"
    echo ""
    echo "方式 2：在命令行提供"
    echo "  ./deploy.sh YOUR_PROJECT_ID"
    echo ""
    exit 1
  fi
fi

echo "🚀 開始部署到 Google Cloud Run..."
echo "📦 專案 ID: $PROJECT_ID"
echo ""

# 步驟 1: 建置並推送映像
echo "📦 步驟 1/2: 建置 Docker 映像並推送到 Artifact Registry..."
gcloud builds submit \
  --tag us-docker.pkg.dev/$PROJECT_ID/gcr.io/booking-server \
  --project=$PROJECT_ID

echo ""
echo "✅ 映像建置完成！"
echo ""

# 步驟 2: 部署到 Cloud Run
echo "🚀 步驟 2/2: 部署到 Cloud Run..."
gcloud run deploy booking-server \
  --image us-docker.pkg.dev/$PROJECT_ID/gcr.io/booking-server \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --project=$PROJECT_ID

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 重要提醒："
echo "1. 請記得在 Cloud Run 控制台設定環境變數（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_REDIRECT_URI, OWNER_EMAIL）"
echo "2. 更新前端程式碼中的 API URL"
echo ""
echo "查看服務詳情："
echo "https://console.cloud.google.com/run/detail/asia-east1/booking-server?project=$PROJECT_ID"

