const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');
const url = require('url');
const path = require('path');
const { createWorker } = require('tesseract.js');

const config = getDefaultConfig(__dirname);

const workers = {};

async function getOrInitWorker(lang) {
  const tesseractLang = lang === 'amh' ? 'amh' : 'eng';
  if (!workers[tesseractLang]) {
    const rootDir = __dirname;
    workers[tesseractLang] = await createWorker(tesseractLang, 1, {
      langPath: rootDir,
      cachePath: rootDir,
    });
  }
  return workers[tesseractLang];
}

function fetchTtsChunk(chunk, lang) {
  return new Promise((resolve, reject) => {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    };
    https.get(ttsUrl, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, options, (res2) => {
          const data = [];
          res2.on('data', (c) => data.push(c));
          res2.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Google TTS error: ${res.statusCode}`));
      }
      const data = [];
      res.on('data', (c) => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function splitText(text, maxLen = 180) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const chunks = [];
  let current = '';
  for (const word of words) {
    if ((current ? `${current} ${word}` : word).length <= maxLen) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const prevEnhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const customMiddleware = (req, res, next) => {
    const parsedUrl = url.parse(req.url, true);

    // 1. Text-to-Speech Endpoint
    if (parsedUrl.pathname === '/api/tts') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const text = (parsedUrl.query.text || '').toString().trim();
      const lang = (parsedUrl.query.lang || 'en').toString().toLowerCase();

      if (!text) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Text is required' }));
        return;
      }

      const chunks = splitText(text.slice(0, 4500), 180).slice(0, 25);

      Promise.all(chunks.map((chunk) => fetchTtsChunk(chunk, lang)))
        .then((buffers) => {
          const combined = Buffer.concat(buffers);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', combined.length);
          res.end(combined);
        })
        .catch((err) => {
          console.error('[TTS Proxy Error]', err);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        });
      return;
    }

    // 2. Local Tesseract OCR Endpoint
    if (parsedUrl.pathname === '/api/ocr') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const bodyChunks = [];
      req.on('data', (chunk) => bodyChunks.push(chunk));
      req.on('end', async () => {
        try {
          const bodyStr = Buffer.concat(bodyChunks).toString('utf8');
          const json = JSON.parse(bodyStr);
          const { imageBase64, lang = 'eng' } = json;

          if (!imageBase64) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'imageBase64 parameter is required' }));
            return;
          }

          const tesseractLang = lang === 'amh' ? 'amh' : 'eng';
          const worker = await getOrInitWorker(tesseractLang);
          const ocrResult = await worker.recognize(imageBase64);

          const text = (ocrResult.data.text || '').trim();
          const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              text,
              confidence: Math.round(ocrResult.data.confidence || 0),
              lines,
              language: tesseractLang,
              engine: 'Tesseract (Local Official Traineddata)',
            })
          );
        } catch (err) {
          console.error('[OCR Local Error]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Local OCR failed' }));
        }
      });
      return;
    }

    if (prevEnhanceMiddleware) {
      return prevEnhanceMiddleware(metroMiddleware, server)(req, res, next);
    }
    return metroMiddleware(req, res, next);
  };

  return customMiddleware;
};

module.exports = config;
