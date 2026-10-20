const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
app.use(bodyParser.json());
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
app.get('/webhook',(req,res)=>{if(req.query['hub.verify_token']===VERIFY_TOKEN)res.send(req.query['hub.challenge']);else res.send('Error');});
app.post('/webhook',async(req,res)=>{
 console.log('MESSAGE RECEIVED');
 const body=req.body;
 if(body.object==='page'){
  for(const entry of body.entry){
   for(const event of entry.messaging){
    if(event.message && event.message.text){
     const sid=event.sender.id; const txt=event.message.text;
     try{
      const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+GROQ_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'system',content:'انت مساعد ذكي جزائري بالدارجة'},{role:'user',content:txt}],max_tokens:500})});
      const d=await r.json(); let a=d.choices?.[0]?.message?.content||'سمحلي';
      request({url:'https://graph.facebook.com/v18.0/me/messages',qs:{access_token:PAGE_TOKEN},method:'POST',json:{recipient:{id:sid},message:{text:a}}});
     }catch(e){console.log(e);}
    }
   }
  }
  res.status(200).send('EVENT_RECEIVED');
 }else res.sendStatus(404);
});
app.listen(process.env.PORT||10000,()=>console.log('Live'));