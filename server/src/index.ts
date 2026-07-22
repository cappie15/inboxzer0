import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { mailboxesRouter } from './routes/mailboxes';
import { settingsRouter, contactsRouter } from './routes/settings';
import { messagesRouter } from './routes/messages';
import { aiRouter } from './routes/ai';

const PORT = Number(process.env.PORT) || 4000;
// Same-origin by default (frontend served from this process); only needed
// cross-origin during local frontend dev (`expo start --web` on another port).
const CORS_ORIGIN = process.env.INBOXZER0_CORS_ORIGIN;

const app = express();
app.use(express.json({ limit: '2mb' }));
if (CORS_ORIGIN) {
  app.use(cors({ origin: CORS_ORIGIN }));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/mailboxes', mailboxesRouter);
app.use('/api/mailboxes', messagesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/ai', aiRouter);

// Serve the Expo web export (built separately with `expo export --platform
// web` into ../web-build) as static files, with an SPA fallback so client-
// side navigation refreshes still resolve to index.html.
const webBuildDir = process.env.INBOXZER0_WEB_BUILD_DIR || path.join(__dirname, '../../web-build');
if (fs.existsSync(webBuildDir)) {
  app.use(express.static(webBuildDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(webBuildDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(200).send(
      'InboxZer0-backend draait, maar de web-build is nog niet gevonden. Draai `npm run build:web` in de projectroot.'
    );
  });
}

app.listen(PORT, () => {
  console.log(`InboxZer0-server luistert op poort ${PORT}`);
});
