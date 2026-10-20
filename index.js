const express = require('express');
const bodyParser = require('body-parser');
const Groq = require('groq-sdk');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "test123";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groq = new Groq({ apiKey: GROQ_API_KEY });

app.get('/', (req, res) => {
  res.send('Bot is running with Groq AI!');
});

// Verify webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;
      if (webhook_event.message && webhook_event.message.text) {
        const userMessage = webhook_event.message.text;
        console.log(`Message from ${sender_psid}: ${userMessage}`);
        
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: "You are a helpful, friendly AI assistant answering in Algerian Darija (mix of Arabic and French if needed). Be short and helpful." },
              { role: "user", content: userMessage }
            ],
            model: "llama-3.1-8b-instant",
          });
          const aiReply = completion.choices[0]?.message?.content || "Sorry, ma qdertch nred!";
          await sendMessage(sender_psid, aiReply);
        } catch