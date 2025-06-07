const express = require('express');
 const path = require('path');
+const { Client } = require('@notionhq/client');        // ← 1. Import Notion client
 const app = express();

+// 2. Initialize Notion client with your Integration Token
+const notion = new Client({ auth: process.env.NOTION_TOKEN });

 // Serve static files under /files
 app.use('/files', express.static(path.join(__dirname)));

 // Your health-check route
 app.get('/', (req, res) => {
   res.send('Stroke Files API is live');
 });

+// 3. Add Notion page endpoint
+app.get('/notion/page/:pageId', async (req, res) => {
+  const pageId = req.params.pageId;
+  try {
+    // Fetch the children blocks of the Notion page
+    const response = await notion.blocks.children.list({ block_id: pageId });
+    // Extract plain text from paragraph blocks
+    const content = response.results
+      .filter(block => block.type === 'paragraph')
+      .map(block => block.paragraph.text.map(t => t.plain_text).join(''))
+      .filter(text => text.length > 0);
+
+    res.json({ pageId, content });
+  } catch (err) {
+    console.error('Notion fetch error:', err);
+    res.status(500).json({ error: 'Failed to fetch from Notion.' });
+  }
+});

 const port = process.env.PORT || 3000;
 app.listen(port, () => {
   console.log(`Server running on port ${port}`);
 });
