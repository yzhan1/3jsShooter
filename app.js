const express = require('express');
const path = require('path');
const ejs = require('ejs');
const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.static(path.join(__dirname, '/')));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.get('*', (req, res) => {
  res.render('index.html');
});

app.listen(PORT, () => {
  console.log(`app is live at ${ PORT }`);
});