const express = require('express');
const bodyParser = require('body-parser');
const Groq = require('groq-sdk');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "test123";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

console.log("CHECK KEYS:", { hasPage: !!PAGE_ACCESS_TOKEN, hasGroq: !!GROQ_API_KEY, verify: VERIFY_TOKEN });

const groq = new Groq({ apiKey: GROQ_API_KEY });

app.get('/', (req, res) => res.send('Bot is running!'));

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  console.log("WEBHOOK RECEIVED:", JSON.stringify(req.body, null, 2));
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhook_event = entry.messaging[0];
      console.log("EVENT:", JSON.stringify(webhook_event, null, 2));
      if (webhook_event.sender && webhook_event.message && webhook_event.message.text) {
        const sender_psid = webhook_event.sender.id;
        const userMessage = webhook_event.message.text;
        console.log(`USER SAID: ${userMessage}`);
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: "You are helpful assistant replying in Algerian Arabic dialect." },
              { role: "user", content: userMessage }
            ],
            model: "llama-3.1-8b-instant",
          });
          const aiReply = completion.choices[0]?.message?.content || "Sorry!";
          console.log(`AI REPLY: ${aiReply}`);
          await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: sender_psid },
            message: { text: aiReply }
          });
          console.log("MESSAGE SENT OK");
        } catch (error) {
          console.error("ERROR FULL:", error.response ? JSON.stringify(error.response.data) : error.message);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));