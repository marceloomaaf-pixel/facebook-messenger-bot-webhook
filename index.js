const express = require('express');
const bodyParser = require('body-parser');
const Groq = require('groq-sdk');

const app = express();
app.use(bodyParser.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        if (event.message && event.message.text) {
          const sender = event.sender.id;
          const text = event.message.text;
          
          try {
            const chatCompletion = await groq.chat.completions.create({
              messages: [{ role: 'user', content: text }],
              model: 'llama-3.3-70b-versatile',
            });
            const reply = chatCompletion.choices[0]?.message?.content || "ما فهمتش، عاود!";
            
            await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: sender },
                message: { text: reply }
              })
            });
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/', (req, res) => res.send('Bot is running!'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));