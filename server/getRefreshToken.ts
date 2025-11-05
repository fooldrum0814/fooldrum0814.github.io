
import { google } from 'googleapis';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("--- 偵錯模式 ---");
console.log("程式讀取到的 Client ID: ", process.env.GOOGLE_CLIENT_ID);
console.log("程式讀取到的 Redirect URI: ", process.env.GOOGLE_REDIRECT_URI);
console.log("-----------------");


const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send'  // 用於發送預約通知郵件
];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('請在瀏覽器中打開以下網址進行授權:');
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\n將瀏覽器跳轉後的網址中的 "code=" 後面的值貼到這裡: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('\n授權成功！');
    console.log('這是您的 Refresh Token，請將它完整複製到 .env 檔案的 GOOGLE_REFRESH_TOKEN 變數中:');
    console.log(tokens.refresh_token);
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n獲取 Token 時發生錯誤:', error.message);
    } else {
      console.error('\n獲取 Token 時發生錯誤:', error);
    }
  } finally {
    rl.close();
  }
});
