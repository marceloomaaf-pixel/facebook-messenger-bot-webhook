const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

app.use(bodyParser.json());

const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong token');
  }
});

app.post('/webhook', async (req, res) => {
  console.log('MESSAGE RECEIVED:', JSON.stringify(req.body));
  const body = req.body;
  
  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        if (event.message && event.message.text) {
          const senderId = event.sender.id;
          const userMessage = event.message.text;
          
          console.log('User says:', userMessage);
          
          try {
            // استدعاء Groq AI
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: 'انت مساعد ذكي جزائري، تجاوب بالدارجة الجزائرية بطريقة ودية ومرحة. اسمك مساعد ذكي.' },
                  { role: 'user', content: userMessage }
                ],
                max_tokens: 500
              })
            });
            
            const data = await groqResponse.json();
            console.log('GROQ DATA:', JSON.stringify(data));
            
            let aiText = 'سمحلي، ما قدرتش نجاوب ضرك 😅';
            if (data.choices && data.choices[0]) {
              aiText = data.choices[0].message.content;
            }
            
            // ارسال الجواب
            request({
              url: 'https://graph.facebook.com/v18.0/me/messages',
              qs: { access_token: PAGE_TOKEN },
              method: 'POST',
              json: {
                recipient: { id: senderId },
                message: { text: aiText }
              }
            }, (err, resp, body) => {
              if (err) console.log('FB Error:', err);
              else console.log('FB Sent:', body);
            });
            
          } catch (e) {
            console.log('GROQ ERROR:', e);
          }
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT || 10000, () => console.log('Node app is running on port 10000'));