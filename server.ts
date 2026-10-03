import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const uploadsDir = path.resolve(__dirname, 'uploads');

  // Ensure uploads directory exists on the platform server
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Parse large JSON bodies for uploaded files & videos (up to 250MB)
  app.use(express.json({ limit: '250mb' }));
  app.use(express.urlencoded({ extended: true, limit: '250mb' }));

  // API 1: Direct File & Video Upload to the Platform Server
  app.post('/api/upload', (req, res) => {
    try {
      const { filename, fileData } = req.body;
      if (!filename || !fileData) {
        return res.status(400).json({ error: 'Missing filename or fileData' });
      }

      let base64 = fileData;
      if (typeof fileData === 'string' && fileData.includes(';base64,')) {
        base64 = fileData.split(';base64,')[1];
      }

      const buffer = Buffer.from(base64, 'base64');
      const ext = path.extname(filename) || '';
      const cleanBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
      const safeName = `${Date.now()}_${cleanBase}${ext}`;
      const filePath = path.join(uploadsDir, safeName);

      fs.writeFileSync(filePath, buffer);

      const serverUrl = `/api/media/${encodeURIComponent(safeName)}`;
      console.log(`[Upload Success] Saved ${safeName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB) to server.`);

      return res.json({
        success: true,
        url: serverUrl,
        filename: safeName,
        size: buffer.length,
      });
    } catch (err: any) {
      console.error('Server upload error:', err);
      return res.status(500).json({ error: err.message || 'Upload to server failed' });
    }
  });

  // API 2: High-Performance Video & File Streaming with HTTP 206 Partial Content (Range Support)
  // This completely eliminates "freezing" (تعليق) and enables instant video playback and seeking!
  app.get('/api/media/:filename', (req, res) => {
    try {
      const rawParam = decodeURIComponent(req.params.filename);
      const filename = path.basename(rawParam);
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Media file not found on server' });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';
      else if (ext === '.ogg') contentType = 'video/ogg';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      else if (ext === '.wav') contentType = 'audio/wav';
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      if (range) {
        // Fast HTTP Range handling for smooth streaming
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
          return;
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        };

        res.writeHead(206, headers);
        fileStream.pipe(res);
      } else {
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        };
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err: any) {
      console.error('Streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      }
    }
  });

  // API 3: Server Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Mount Vite middleware in development or static dist in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ALPHA Platform Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
