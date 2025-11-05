import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// Enable CORS for the frontend origin
app.use(cors({ origin: 'http://localhost:8000' }));

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
