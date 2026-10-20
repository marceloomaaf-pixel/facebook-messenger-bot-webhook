const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
app.use(bodyParser.json());
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
app.get('/webhook', (req,res)=>{
 if(req.query['hub.verify_token']===VERIFY_TOKEN) res.send(req.query['hub.challenge']);
 else res.send('Error');
});
app.post('/webhook', async (req,res)=>{
 console.log('MESSAGE RECEIVED:', JSON.stringify(req.body));
 const body=req.body;
 if(body.object==='page'){
  for(const entry of body.entry){
   for(const event of entry.messaging){
    if(event.message && event.message.text){
     const senderId=event.sender.id;
     const userMessage=event.message.text;
     console.log('User says:', userMessage);
     try{
      const groqRes=await fetch('https://api.groq.com/openai/v1/chat/completions',{
       method:'POST',
       headers:{'Authorization':`Bearer ${GROQ_KEY}`,'Content-Type':'application/json'},
       body:JSON.stringify({
        model:'llama-3.3-70b-versatile',
        messages:[{role:'system',content:'انت مساعد ذكي جزائري، تجاوب بالدارجة الجزائرية باحترام ومرح، انت اسمك Moha AI.'},{role:'user',content:userMessage}],
        max_tokens:500
       })
      });
      const data=await groqRes.json();
      console.log('GROQ DATA:', JSON.stringify(data).substring(0,500));
      let aiText=data.choices?.[0]?.message?.content || 'سمحلي، ما قدرتش نجاوب ضرك، عاود جرب';
      request({url:'https://graph.facebook.com/v18.0/me/messages',qs:{access_token:PAGE_TOKEN},method:'POST',json:{recipient:{id:senderId},message:{text:aiText}}});
     }catch(e){console.log('ERROR',e);}
    }
   }
  }
  res.status(200).send('EVENT_RECEIVED');
 } else res.sendStatus(404);
});
app.listen(process.env.PORT||10000,()=>console.log('Live'));