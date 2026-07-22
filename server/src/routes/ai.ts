import { Router } from 'express';
import * as dataStore from '../store/dataStore';
import { generateForwardNote, generateReplyDraft } from '../services/aiProxy';

export const aiRouter = Router();

aiRouter.post('/forward-note', async (req, res) => {
  const { message, recipientName } = req.body ?? {};
  if (!message || !recipientName) {
    res.status(400).json({ error: 'message en recipientName zijn verplicht.' });
    return;
  }
  try {
    const note = await generateForwardNote(
      dataStore.getAISettings(),
      dataStore.getWritingStyle(),
      message,
      recipientName
    );
    res.json({ note });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

aiRouter.post('/reply-draft', async (req, res) => {
  const { message, mode, feedback } = req.body ?? {};
  if (!message || (mode !== 'reply' && mode !== 'replyAll')) {
    res.status(400).json({ error: 'message en mode ("reply"/"replyAll") zijn verplicht.' });
    return;
  }
  try {
    const draft = await generateReplyDraft(
      dataStore.getAISettings(),
      dataStore.getWritingStyle(),
      message,
      mode,
      feedback
    );
    res.json({ draft });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
