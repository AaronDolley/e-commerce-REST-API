const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//Routes
app.use('/', cors(), async (req, res) => {
    res.send('Welcome to the E-commerce API');
});

app.listen(port, () => {
  console.log(`E-commerce API listening at http://localhost:${port}`);
});