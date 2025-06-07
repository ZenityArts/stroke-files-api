const express = require('express');
const path = require('path');
const app = express();

app.use('/files', express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.send('Stroke Files API is live');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
