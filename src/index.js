require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const webhookRoute = require("./routes/webhook");


const app = express();

app.use(bodyParser.urlencoded({extended:false}));

app.use("/webhook", webhookRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
