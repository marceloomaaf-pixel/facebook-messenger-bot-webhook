const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'moha123';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
app.get('/', (req,res) => res.send('Bot AI is running'));
app.get('/webhook', (req,res) => {
 if(req.query['hub.verify_token'] === VERIFY_TOKEN){
   res.send(req.query['hub.challenge']);
 } else res.sendStatus(403);
});
app.post('/webhook', async (req,res) => {
 const body = req.body;
 if(body.object === 'page'){
   for(const entry of body.entry){
     for(const messaging of entry.messaging){
       if(messaging.message && messaging.message.text){
         const senderId = messaging.sender.id;
         const userText = messaging.message.text;
         let aiReply = "مرحبا! كيفاش نقدر نعاونك؟";
         try {
           const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
             model: "llama-3.1-8b-instant",
             messages: [
               {role: "system", content: "You are Moha, helpful Algerian assistant. Reply in Darija Algerian, friendly and short."},
               {role: "user", content: userText}
             ]
           }, { headers: { 'Authorization': 'Bearer '+GROQ_API_KEY, 'Content-Type': 'application/json' } });
           aiReply = groqRes.data.choices[0].message.content;
         } catch(e){ console.log("GROQ Error:", e.response?.data || e.message); aiReply = "ثانية برك، كاين مشكل صغير.. عاود ابعتلي!"; }
         await axios.post('https://graph.facebook.com/v18.0/me/messages?access_token='+PAGE_ACCESS_TOKEN, {
           recipient: {id: senderId},
           message: {text: aiReply}
         });
       }
     }
   }
   res.sendStatus(200);
 } else res.sendStatus(404);
});
app.listen(process.env.PORT || 10000, () => console.log('running'));