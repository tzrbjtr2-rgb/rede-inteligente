const express=require("express");
const path=require("path");
const {Pool}=require("pg");
const app=express();
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"troque-esta-senha";

const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?{rejectUnauthorized:false}:false});

app.use(express.json({limit:"20kb"}));
app.use(express.static(path.join(__dirname,"public")));

async function init(){
 if(!process.env.DATABASE_URL){console.warn("DATABASE_URL não configurada. Configure um PostgreSQL para armazenamento.");return;}
 await pool.query(`CREATE TABLE IF NOT EXISTS records(
 id SERIAL PRIMARY KEY,
 ip TEXT, timezone TEXT, resolution TEXT, os TEXT, user_agent TEXT,
 language TEXT, screen TEXT, timestamp TIMESTAMPTZ NOT NULL
 )`);
}
function auth(req,res,next){
 const h=req.headers.authorization||"";
 if(!h.startsWith("Basic ")){res.set("WWW-Authenticate",'Basic realm="Painel"');return res.status(401).send("Autenticação necessária.");}
 const decoded=Buffer.from(h.slice(6),"base64").toString();
 const pass=decoded.split(":").slice(1).join(":");
 if(pass!==ADMIN_PASSWORD)return res.status(401).send("Senha incorreta.");
 next();
}
app.get("/api/ip",(req,res)=>{
 const forwarded=req.headers["x-forwarded-for"];
 const ip=(forwarded?forwarded.split(",")[0]:req.socket.remoteAddress)||"Indisponível";
 res.json({ip});
});
app.post("/api/records",async(req,res)=>{
 try{
  const {ip,timezone,resolution,os,userAgent,language,screen,timestamp}=req.body||{};
  if(!timestamp)return res.status(400).json({error:"timestamp obrigatório"});
  await pool.query(`INSERT INTO records(ip,timezone,resolution,os,user_agent,language,screen,timestamp) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
   [ip,timezone,resolution,os,userAgent,language,screen,timestamp]);
  res.status(201).json({ok:true});
 }catch(e){console.error(e);res.status(500).json({error:"Erro ao salvar"});}
});
app.get("/api/records",auth,async(req,res)=>{
 try{const r=await pool.query("SELECT * FROM records ORDER BY timestamp DESC LIMIT 1000");res.json(r.rows);}
 catch(e){res.status(500).json({error:"Erro ao consultar"});}
});
app.delete("/api/records",auth,async(req,res)=>{
 try{await pool.query("DELETE FROM records");res.json({ok:true});}
 catch(e){res.status(500).json({error:"Erro ao apagar"});}
});
app.get("/admin",auth,(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("/health",(req,res)=>res.json({status:"ok"}));

init().then(()=>app.listen(PORT,()=>console.log(`Servidor na porta ${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
