import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

// Load .env file only in local development
// In Cloud Run, environment variables are set directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
}

const app = express();

// Enable CORS for allowed origins
const whitelist = ['http://localhost:8000', 'https://fooldrum0814.github.io'];
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (whitelist.indexOf(origin || '') !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));
app.use(express.json()); // Middleware to parse JSON bodies

const port = process.env.PORT || 3000;

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

// Function to send notification email using Gmail API
async function sendNotificationEmail(to: string, subject: string, body: string, eventLink: string) {
  console.log('📧 [Gmail API] 開始發送郵件...');
  console.log('📧 [Gmail API] 收件人:', to);
  
  // 檢查 OAuth2 客戶端是否正確初始化
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google OAuth2 憑證未完整設定');
  }
  
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
  // Encode subject line to prevent garbled text (RFC 2047)
  const subjectText = `🔔 新預約通知：${subject}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subjectText).toString('base64')}?=`;
  
  // Build email content
  const emailLines = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    '<html>',
    '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">',
    '<div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">',
    '<h2 style="color: #4F46E5; margin-bottom: 20px;">🎉 您有新的預約！</h2>',
    '<div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">',
    '<h3 style="color: #1f2937; margin-top: 0;">預約資訊：</h3>',
    `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word; background-color: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #4F46E5;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
    '<div style="margin-top: 30px; text-align: center;">',
    `<a href="${eventLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">📅 查看 Google Calendar 事件</a>`,
    '</div>',
    '</div>',
    '<p style="margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">此郵件由個人履歷網站預約系統自動發送</p>',
    '</div>',
    '</body>',
    '</html>'
  ];
  
  const email = emailLines.join('\n');
  const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  console.log('📧 [Gmail API] 郵件內容已編碼，準備發送...');
  
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });
  
  console.log('📧 [Gmail API] 郵件發送回應:', result.data);
  return result.data;
}

app.get('/', (req, res) => {
  res.send('Booking server is running!');
});

app.get('/calendars', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const result = await calendar.calendarList.list();
    res.json(result.data.items);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).send('Error fetching calendars');
  }
});

app.get('/freebusy', async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).send('Missing start or end query parameter');
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const result = await calendar.freebusy.query({
      requestBody: {
        timeMin: start as string,
        timeMax: end as string,
        items: [{ id: 'primary' }],
      },
    });
    res.json(result.data.calendars?.primary.busy);
  } catch (error) {
    console.error('Error fetching free/busy times:', error);
    res.status(500).send('Error fetching free/busy times' + error);
  }
});

app.post('/create-event', async (req, res) => {
  const { start, end, summary, description, attendees } = req.body;

  if (!start || !end || !summary) {
    return res.status(400).send('Missing required fields: start, end, or summary');
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Prepare attendees list
    const attendeesList = [];
    
    // Add the website owner's email (you) to receive notifications
    const ownerEmail = process.env.OWNER_EMAIL;
    console.log('📧 OWNER_EMAIL from env:', ownerEmail ? `已設置 (${ownerEmail})` : '❌ 未設置！');
    
    if (ownerEmail) {
      attendeesList.push({ 
        email: ownerEmail,
        responseStatus: 'accepted' // Auto-accept for owner
      });
      console.log('✅ 已將網站擁有者加入參與者列表');
    } else {
      console.warn('⚠️  警告：OWNER_EMAIL 未設置，您將不會收到通知！');
    }
    
    // Add the booking user's email
    if (attendees && Array.isArray(attendees)) {
      attendees.forEach((email: string) => {
        attendeesList.push({ 
          email: email,
          responseStatus: 'needsAction' // User needs to confirm
        });
      });
      console.log('✅ 已加入預約者 Email:', attendees);
    }
    
    console.log('📋 最終參與者列表:', attendeesList.map(a => a.email));
    
    const event = {
      summary: summary,
      description: description || '由個人履歷網站預約',
      start: {
        dateTime: start,
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: end,
        timeZone: 'Asia/Taipei',
      },
      attendees: attendeesList,
      // Enable email reminders and notifications
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 },      // 30 minutes before
          { method: 'email', minutes: 10 },      // 10 minutes before (immediate notification for new bookings)
        ],
      },
      // Send notifications to attendees
      sendUpdates: 'all', // Send email notifications to all attendees
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Ensure email notifications are sent
    });

    console.log('🎉 事件建立成功！');
    console.log('📅 事件連結:', result.data.htmlLink);
    
    // Send custom notification email to owner using Gmail API
    if (ownerEmail && result.data.htmlLink) {
      console.log('📧 準備發送通知郵件給:', ownerEmail);
      try {
        await sendNotificationEmail(ownerEmail, summary, description, result.data.htmlLink);
        console.log('✅ 已透過 Gmail API 成功發送通知郵件給網站擁有者');
      } catch (emailError: any) {
        console.error('❌ 發送通知郵件失敗（但事件已建立）');
        console.error('錯誤詳情:', emailError);
        if (emailError.response) {
          console.error('HTTP 狀態碼:', emailError.response.status);
          console.error('錯誤訊息:', JSON.stringify(emailError.response.data, null, 2));
        }
        if (emailError.message) {
          console.error('錯誤訊息:', emailError.message);
        }
        // 不中斷請求，只記錄錯誤
      }
    } else {
      if (!ownerEmail) {
        console.warn('⚠️  OWNER_EMAIL 未設定，無法發送通知郵件');
      }
      if (!result.data.htmlLink) {
        console.warn('⚠️  事件連結不存在，無法發送通知郵件');
      }
    }
    
    res.status(201).json(result.data);
  } catch (error) {
    console.error('❌ 建立事件時發生錯誤:', error);
    res.status(500).send('Error creating event');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
