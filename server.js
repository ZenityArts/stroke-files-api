// server.js
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { Client } = require('@notionhq/client');

const app = express();

// ——————————————————————————————
// Debug: Check where we’re looking for files
// ——————————————————————————————
const filesDir = path.join(__dirname, 'files');
console.log('Static files directory:', filesDir, 'Exists:', fs.existsSync(filesDir));

// ——————————————————————————————
// 1) Serve your static stroke files
// ——————————————————————————————
app.use('/files', express.static(filesDir));

// ——————————————————————————————
// 2) Health check
// ——————————————————————————————
app.get('/', (req, res) => {
  res.send('Stroke Files API is live');
});

// ——————————————————————————————
// 3) Notion integration setup
// ——————————————————————————————
const notion = new Client({ auth: process.env.NOTION_TOKEN });

app.get('/notion/page/:pageId', async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const response = await notion.blocks.children.list({ block_id: pageId });
    const content = response.results
      .filter(b => b.type === 'paragraph' && Array.isArray(b.paragraph.rich_text))
      .map(b => b.paragraph.rich_text.map(t => t.plain_text).join(''))
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
