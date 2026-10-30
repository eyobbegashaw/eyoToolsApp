const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const ort = require('onnxruntime-web');
const { Ytdl } = require('@distube/ytdl-core');

const ytdl = new Ytdl();
const PORT = 3001;

// 1. Tesseract OCR Workers
const workers = {};

async function getOrInitWorker(lang) {
  const tesseractLang = lang === 'amh' ? 'amh' : 'eng';
  if (!workers[tesseractLang]) {
    const rootDir = path.resolve(__dirname, '..');
    workers[tesseractLang] = await createWorker(tesseractLang, 1, {
      langPath: rootDir,
      cachePath: rootDir,
    });
  }
  return workers[tesseractLang];
}

// 2. ONNX Runtime U2Net AI Background Removal Session
let u2netSession = null;

async function getU2NetSession() {
  if (!u2netSession) {
    const modelPath = path.resolve(__dirname, '..', 'u2netp.onnx');
    if (fs.existsSync(modelPath)) {
      u2netSession = await ort.InferenceSession.create(modelPath);
      console.log('[ONNX] U2Net model loaded successfully!');
    } else {
      console.warn('[ONNX] u2netp.onnx not found at', modelPath);
    }
  }
  return u2netSession;
}

// Preload session on startup
getU2NetSession().catch((err) => console.warn('[ONNX Preload]', err.message));

function fetchTtsChunk(chunk, lang) {
  return new Promise((resolve, reject) => {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    };
    https
      .get(ttsUrl, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https
            .get(res.headers.location, options, (res2) => {
              const data = [];
              res2.on('data', (c) => data.push(c));
              res2.on('end', () => resolve(Buffer.concat(data)));
            })
            .on('error', reject);
          return;
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Google TTS error: HTTP ${res.statusCode}`));
        }
        const data = [];
        res.on('data', (c) => data.push(c));
        res.on('end', () => resolve(Buffer.concat(data)));
      })
      .on('error', reject);
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

/**
 * Universal video/audio extraction for YouTube, TikTok (No Watermark), and direct media
 */
async function extractMediaInfo(targetUrl) {
  const cleanUrl = targetUrl.trim();
  const lower = cleanUrl.toLowerCase();

  // 1. TikTok Extraction (No Watermark)
  if (lower.includes('tiktok.com')) {
    const res = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'url=' + encodeURIComponent(cleanUrl),
    });
    const json = await res.json();
    if (json.code === 0 && json.data) {
      const d = json.data;
      const qualities = [];

      if (d.hdplay) {
        qualities.push({
          label: 'No Watermark (HD MP4)',
          format: 'mp4',
          resolution: '1080p HD',
          type: 'video',
          isWatermarkFree: true,
          size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : 'Direct HD',
          url: d.hdplay,
        });
      }

      if (d.play) {
        qualities.push({
          label: 'No Watermark (Clean MP4)',
          format: 'mp4',
          resolution: '720p Clean',
          type: 'video',
          isWatermarkFree: true,
          size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : 'Original MP4',
          url: d.play,
        });
      }

      if (d.music) {
        qualities.push({
          label: 'Original Soundtrack (MP3)',
          format: 'mp3',
          resolution: 'Audio 320 kbps',
          type: 'audio',
          isWatermarkFree: true,
          size: 'Soundtrack MP3',
          url: d.music,
        });
      }

      if (d.wmplay) {
        qualities.push({
          label: 'Original Video with Watermark (MP4)',
          format: 'mp4',
          resolution: '720p Standard',
          type: 'video',
          isWatermarkFree: false,
          size: d.wm_size ? `${(d.wm_size / (1024 * 1024)).toFixed(1)} MB` : 'Standard MP4',
          url: d.wmplay,
        });
      }

      return {
        title: d.title || 'TikTok Video',
        thumbnail: d.cover || d.origin_cover || '',
        duration: d.duration ? `${d.duration}s` : 'TikTok Short',
        author: `@${d.author?.unique_id || d.author?.nickname || 'TikTok Creator'}`,
        views: `${d.play_count ? d.play_count.toLocaleString() : 'Trending'} views`,
        platform: 'tiktok',
        qualities,
      };
    }
  }

  // 2. YouTube Extraction
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const info = await ytdl.getInfo(cleanUrl);
    const details = info.videoDetails;
    const qualities = [];

    const desiredResolutions = ['1080p', '720p', '480p', '360p', '240p'];
    const seen = new Set();

    for (const res of desiredResolutions) {
      const match =
        info.formats.find(
          (f) => f.qualityLabel && f.qualityLabel.includes(res) && f.url && f.container === 'mp4'
        ) || info.formats.find((f) => f.qualityLabel && f.qualityLabel.includes(res) && f.url);

      if (match && !seen.has(res)) {
        seen.add(res);
        const estMB = match.contentLength
          ? `${(parseInt(match.contentLength, 10) / (1024 * 1024)).toFixed(1)} MB`
          : `${res} MP4`;

        qualities.push({
          label: `${res} ${res === '1080p' ? 'Full HD' : res === '720p' ? 'HD' : 'Standard'} (MP4)`,
          format: 'mp4',
          resolution: res,
          type: 'video',
          size: estMB,
          url: match.url,
        });
      }
    }

    // Audio formats
    const audioFormats = info.formats.filter((f) => !f.hasVideo && f.hasAudio && f.url);
    if (audioFormats.length > 0) {
      const bestAudio = audioFormats.reduce((prev, curr) =>
        (curr.audioBitrate || 0) > (prev.audioBitrate || 0) ? curr : prev
      );

      qualities.push({
        label: `Audio High Quality (${bestAudio.audioBitrate || 192} kbps MP3)`,
        format: 'mp3',
        resolution: `${bestAudio.audioBitrate || 192} kbps`,
        type: 'audio',
        size: bestAudio.contentLength
          ? `${(parseInt(bestAudio.contentLength, 10) / (1024 * 1024)).toFixed(1)} MB`
          : 'High Quality MP3',
        url: bestAudio.url,
      });

      qualities.push({
        label: 'Audio Standard (128 kbps MP3)',
        format: 'mp3',
        resolution: '128 kbps',
        type: 'audio',
        size: 'Standard Audio',
        url: audioFormats[0].url,
      });
    }

    const totalSecs = parseInt(details.lengthSeconds || '0', 10);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;

    return {
      title: details.title,
      thumbnail: details.thumbnails?.pop()?.url || '',
      duration: `${mins}:${String(secs).padStart(2, '0')}`,
      author: details.author?.name || 'YouTube Creator',
      views: `${parseInt(details.viewCount || '0', 10).toLocaleString()} views`,
      platform: 'youtube',
      qualities,
    };
  }

  // 3. Direct Media Stream Fallback
  let contentLength = 0;
  let contentType = '';
  try {
    const headRes = await fetch(cleanUrl, { method: 'HEAD' });
    if (headRes.ok) {
      contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
      contentType = headRes.headers.get('content-type') || '';
    }
  } catch {}

  const urlPath = cleanUrl.split('?')[0];
  const rawFileName = urlPath.split('/').pop() || 'media_file.mp4';
  const ext = rawFileName.split('.').pop()?.toLowerCase() || 'mp4';
  const isAudio = ext === 'mp3' || ext === 'm4a' || ext === 'aac' || contentType.includes('audio');

  return {
    title: decodeURIComponent(rawFileName),
    thumbnail: isAudio
      ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
    duration: 'Direct Stream',
    author: new URL(cleanUrl).hostname,
    views: 'Direct Public Stream',
    platform: 'direct',
    qualities: [
      {
        label: isAudio ? `Audio Stream (${ext.toUpperCase()})` : `Media Stream (${ext.toUpperCase()})`,
        format: isAudio ? 'mp3' : 'mp4',
        resolution: isAudio ? 'Audio Only' : 'Source Quality',
        type: isAudio ? 'audio' : 'video',
        size: contentLength > 0 ? `${(contentLength / (1024 * 1024)).toFixed(1)} MB` : 'Direct Source',
        url: cleanUrl,
      },
    ],
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Serve ONNX Model File
  if (parsedUrl.pathname === '/models/u2netp.onnx') {
    const modelPath = path.resolve(__dirname, '..', 'u2netp.onnx');
    if (fs.existsSync(modelPath)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      fs.createReadStream(modelPath).pipe(res);
      return;
    }
  }

  // 1. TTS Proxy Endpoint
  if (parsedUrl.pathname === '/api/tts') {
    const text = parsedUrl.query.text || '';
    const lang = parsedUrl.query.lang || 'en';

    if (!text) {
      res.statusCode = 400;
      res.end('Missing "text" query parameter');
      return;
    }

    try {
      const chunks = splitText(text, 160);
      const audioBuffers = [];
      for (const chunk of chunks) {
        const buf = await fetchTtsChunk(chunk, lang);
        audioBuffers.push(buf);
      }
      const fullMp3 = Buffer.concat(audioBuffers);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', fullMp3.length);
      res.statusCode = 200;
      res.end(fullMp3);
    } catch (err) {
      console.error('[TTS Proxy Error]', err);
      res.statusCode = 500;
      res.end(`TTS Proxy Error: ${err.message}`);
    }
    return;
  }

  // 2. OCR Endpoint
  if (parsedUrl.pathname === '/api/ocr') {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    const bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const bodyStr = Buffer.concat(bodyChunks).toString('utf8');
        const json = JSON.parse(bodyStr);
        const { image, language } = json;

        if (!image) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing image data' }));
          return;
        }

        const workerLang = language === 'amh' ? 'amh' : 'eng';
        const worker = await getOrInitWorker(workerLang);
        const ret = await worker.recognize(image);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            text: ret.data.text || '',
            confidence: Math.round(ret.data.confidence || 90),
            engine: `Local Tesseract OCR Engine (${workerLang.toUpperCase()})`,
          })
        );
      } catch (err) {
        console.error('[OCR Error]', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'OCR recognition failed' }));
      }
    });
    return;
  }

  // 3. ONNX Runtime AI Background Removal Endpoint
  if (parsedUrl.pathname === '/api/remove-bg') {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    const bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const bodyStr = Buffer.concat(bodyChunks).toString('utf8');
        const json = JSON.parse(bodyStr);
        const { rgb320 } = json;

        if (!rgb320 || !Array.isArray(rgb320) || rgb320.length !== 1 * 3 * 320 * 320) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'rgb320 float array of length 307200 is required' }));
          return;
        }

        const session = await getU2NetSession();
        if (!session) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'ONNX U2Net session unavailable' }));
          return;
        }

        const floatData = new Float32Array(rgb320);
        const inputTensor = new ort.Tensor('float32', floatData, [1, 3, 320, 320]);
        const results = await session.run({ 'input.1': inputTensor });
        const maskData = results['1959'] ? results['1959'].data : results[session.outputNames[0]].data;

        let min = 999999;
        let max = -999999;
        for (let i = 0; i < maskData.length; i++) {
          if (maskData[i] < min) min = maskData[i];
          if (maskData[i] > max) max = maskData[i];
        }

        const range = max - min || 1;
        const normalized = new Float32Array(maskData.length);
        for (let i = 0; i < maskData.length; i++) {
          normalized[i] = (maskData[i] - min) / range;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            mask: Array.from(normalized),
            engine: 'ONNX Runtime (U2Net Neural AI Model)',
          })
        );
      } catch (err) {
        console.error('[ONNX BG Removal Error]', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'AI Background removal failed' }));
      }
    });
    return;
  }

  // 4. Video & Audio Extraction Endpoint (YouTube, TikTok No Watermark, Direct)
  if (parsedUrl.pathname === '/api/extract-video') {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    const bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const bodyStr = Buffer.concat(bodyChunks).toString('utf8');
        const json = JSON.parse(bodyStr);
        const targetUrl = json.url;

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }

        const info = await extractMediaInfo(targetUrl);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, info }));
      } catch (err) {
        console.error('[Extract Video Error]', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to extract video information' }));
      }
    });
    return;
  }

  // 5. Proxy Download Stream (Avoid CORS on web downloads)
  if (parsedUrl.pathname === '/api/proxy-download') {
    const targetUrl = parsedUrl.query.url;
    const fileName = parsedUrl.query.name || 'downloaded_media.mp4';

    if (!targetUrl) {
      res.statusCode = 400;
      res.end('Missing url query parameter');
      return;
    }

    try {
      const client = targetUrl.startsWith('https') ? https : http;
      client.get(
        targetUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (remoteRes) => {
          if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
            // Follow redirect
            const redirClient = remoteRes.headers.location.startsWith('https') ? https : http;
            redirClient.get(remoteRes.headers.location, (redirRes) => {
              res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
              res.setHeader('Content-Type', redirRes.headers['content-type'] || 'application/octet-stream');
              if (redirRes.headers['content-length']) {
                res.setHeader('Content-Length', redirRes.headers['content-length']);
              }
              redirRes.pipe(res);
            });
            return;
          }

          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          res.setHeader('Content-Type', remoteRes.headers['content-type'] || 'application/octet-stream');
          if (remoteRes.headers['content-length']) {
            res.setHeader('Content-Length', remoteRes.headers['content-length']);
          }
          remoteRes.pipe(res);
        }
      ).on('error', (err) => {
        console.error('[Proxy Download Error]', err);
        res.statusCode = 500;
        res.end(`Download error: ${err.message}`);
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(`Proxy error: ${err.message}`);
    }
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Local Assistant Server (TTS + Local Tesseract OCR + ONNX Runtime AI + Video Extractor) running at http://localhost:${PORT}`);
});
