// server.js
const express       = require('express');
const path          = require('path');
const session       = require('express-session');
const { Client }    = require('@notionhq/client');
const fs            = require('fs');

const app = express();

// ───────────────────────────────────────────────────────────────────────────────
// Session middleware (for personalized progress tracking)
// ───────────────────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-with-secure-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// ───────────────────────────────────────────────────────────────────────────────
// Body parser (for JSON in POST /session and /media)
// ───────────────────────────────────────────────────────────────────────────────
app.use(express.json());

// ───────────────────────────────────────────────────────────────────────────────
// 1) Serve your static stroke files
// ───────────────────────────────────────────────────────────────────────────────
app.use(
  '/files',
  express.static(path.join(__dirname, 'files'))
);

// ───────────────────────────────────────────────────────────────────────────────
// 2) Health check
// ───────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Stroke Files API is live');
});

// ───────────────────────────────────────────────────────────────────────────────
// 3) Session endpoints for progress tracking
// ───────────────────────────────────────────────────────────────────────────────
app.get('/session', (req, res) => {
  res.json({
    lastStroke: req.session.lastStroke || null,
    context:    req.session.context    || null
  });
});

app.post('/session', (req, res) => {
  const { lastStroke, context } = req.body;
  req.session.lastStroke = lastStroke;
  req.session.context    = context;
  res.sendStatus(204);
});

// ───────────────────────────────────────────────────────────────────────────────
// 4) Notion integration setup
// ───────────────────────────────────────────────────────────────────────────────
const notion = new Client({ auth: process.env.NOTION_TOKEN });

app.get('/notion/page/:pageId', async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const response = await notion.blocks.children.list({ block_id: pageId });
    const content = response.results
      .filter(block => block.type === 'paragraph' && Array.isArray(block.paragraph.rich_text))
      .map(block =>
        block.paragraph.rich_text
          .map(textPart => textPart.plain_text)
          .join('')
      )
      .filter(txt => txt.length > 0);

    return res.json({ pageId, content });
  } catch (err) {
    console.error('⛔ Notion fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch from Notion.' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 5) Media search endpoint for external guides/videos
// ───────────────────────────────────────────────────────────────────────────────
app.get('/media', (req, res) => {
  const topic = (req.query.topic || '').toLowerCase();
  try {
    const mediaPath = path.join(__dirname, 'files', 'media.json');
    const rawData = fs.readFileSync(mediaPath, 'utf-8');
    const media = JSON.parse(rawData);

    const matches = media.filter(item =>
      item.topics.some(t => t.toLowerCase().includes(topic))
    );

    return res.json(matches);
  } catch (err) {
    console.error('⛔ Media fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch media suggestions.' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 6) Start the server
// ───────────────────────────────────────────────────────────────────────────────
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
