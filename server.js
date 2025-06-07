// server.js
const express = require('express');
const path    = require('path');
const { Client } = require('@notionhq/client');

const app = express();

// ——————————————————————————————
// 1) Serve your static stroke files
// ——————————————————————————————
app.use(
  '/files',
  express.static(path.join(__dirname, 'files'))
);

// ——————————————————————————————
// 2) Health check
// ——————————————————————————————
app.get('/', (req, res) => {
  res.send('Stroke Files API is live');
});

// ——————————————————————————————
// 3) Notion integration setup
// ——————————————————————————————
// (Make sure you've set NOTION_TOKEN in Render’s Environment!)
const notion = new Client({ auth: process.env.NOTION_TOKEN });

app.get('/notion/page/:pageId', async (req, res) => {
  const pageId = req.params.pageId;
  try {
    // List child blocks of the page
    const response = await notion.blocks.children.list({ block_id: pageId });
    // Pull out paragraph text
    const content = response.results
      .filter(b => b.type === 'paragraph')
      .map(b => b.paragraph.text.map(t => t.plain_text).join(''))
      .filter(txt => txt.length > 0);

    return res.json({ pageId, content });
  } catch (err) {
    console.error('⛔ Notion fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch from Notion.' });
  }
});

// ——————————————————————————————
// 4) Start the server
// ——————————————————————————————
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
