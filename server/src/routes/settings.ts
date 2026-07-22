import { Router } from 'express';
import * as dataStore from '../store/dataStore';

export const settingsRouter = Router();

settingsRouter.get('/ai', (_req, res) => {
  res.json(dataStore.getAISettings());
});

settingsRouter.put('/ai', (req, res) => {
  const { provider, apiKey } = req.body ?? {};
  if (provider !== 'anthropic' && provider !== 'openai') {
    res.status(400).json({ error: 'provider moet "anthropic" of "openai" zijn.' });
    return;
  }
  dataStore.setAISettings({ provider, apiKey: apiKey ?? '' });
  res.json(dataStore.getAISettings());
});

settingsRouter.get('/writing-style', (_req, res) => {
  res.json(dataStore.getWritingStyle());
});

settingsRouter.put('/writing-style', (req, res) => {
  const { mode, pastedText, url } = req.body ?? {};
  if (mode !== 'paste' && mode !== 'url') {
    res.status(400).json({ error: 'mode moet "paste" of "url" zijn.' });
    return;
  }
  dataStore.setWritingStyle({ mode, pastedText: pastedText ?? '', url: url ?? '' });
  res.json(dataStore.getWritingStyle());
});

export const contactsRouter = Router();

contactsRouter.get('/', (_req, res) => {
  res.json(dataStore.getContacts());
});
