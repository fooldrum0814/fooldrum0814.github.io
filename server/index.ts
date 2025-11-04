import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
