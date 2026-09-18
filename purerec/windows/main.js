const { app, BrowserWindow, ipcMain, dialog, desktopCapturer, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

let win;
const state = { currentSegment: null };

function draftDir(){ return path.join(app.getPath('userData'),'draft'); }
function metaPath(){ return path.join(draftDir(),'draft.json'); }
function ensureDraftDir(){ fs.mkdirSync(draftDir(),{recursive:true}); }
function defaultOutputDir(){ return path.join(app.getPath('downloads'),'PureRec'); }
function readMeta(){
  ensureDraftDir();
  try {
    const m=JSON.parse(fs.readFileSync(metaPath(),'utf8'));
    if(!Array.isArray(m.segments))m.segments=[];
    if(!m.outputDir)m.outputDir=defaultOutputDir();
    return m;
  } catch { return {segments:[], outputDir:defaultOutputDir(), createdAt:Date.now()}; }
}
function writeMeta(m){ ensureDraftDir(); fs.writeFileSync(metaPath(),JSON.stringify(m,null,2)); }
function safeBase(name){ return String(name||'PureRec_Recording').replace(/[\\/:*?"<>|]+/g,'_').trim() || 'PureRec_Recording'; }
function draftState(){
  const m=readMeta();
  m.segments=m.segments.filter(s=>{ try{return fs.statSync(s.path).size>0}catch{return false} });
  writeMeta(m);
  return {exists:m.segments.length>0,durationMs:m.segments.reduce((n,s)=>n+(s.durationMs||0),0),bytes:m.segments.reduce((n,s)=>{try{return n+fs.statSync(s.path).size}catch{return n}},0),outputDir:m.outputDir};
}
function clearDraft(){
  try{fs.rmSync(draftDir(),{recursive:true,force:true});}catch{}
  ensureDraftDir();
  state.currentSegment=null;
}
function ffmpegBinary(){
  let p=require('ffmpeg-static');
  if(app.isPackaged && p.includes('app.asar')) p=p.replace('app.asar','app.asar.unpacked');
  return p;
}
function quoteConcat(p){ return p.replace(/\\/g,'/').replace(/'/g,"'\\''"); }
function makeConcatFile(segments){
  ensureDraftDir();
  const list=path.join(draftDir(),'concat.txt');
  fs.writeFileSync(list,segments.map(s=>`file '${quoteConcat(s.path)}'`).join('\n'));
  return list;
}
function runFfmpeg(args){
  return new Promise((resolve,reject)=>{
    const child=spawn(ffmpegBinary(),args,{windowsHide:true});
    let stderr='';
    child.stderr.on('data',d=>stderr+=d.toString());
    child.on('error',reject);
    child.on('close',code=> code===0?resolve():reject(new Error(stderr.split('\n').slice(-12).join('\n')||`ffmpeg exited ${code}`)));
  });
}
async function renderOutput(dest,format){
  const m=readMeta();
  const segments=m.segments.filter(s=>fs.existsSync(s.path)&&fs.statSync(s.path).size>0);
  if(!segments.length) throw new Error('Không có audio để xuất.');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const list=makeConcatFile(segments);
  const common=['-y','-f','concat','-safe','0','-i',list,'-vn'];
  const args=format==='mp3' ? [...common,'-c:a','libmp3lame','-q:a','2',dest] : [...common,'-c:a','pcm_s16le',dest];
  await runFfmpeg(args);
}
async function renderPreview(){
  const m=readMeta();
  const segments=m.segments.filter(s=>fs.existsSync(s.path)&&fs.statSync(s.path).size>0);
  if(!segments.length) throw new Error('Chưa có audio để nghe lại.');
  const out=path.join(app.getPath('temp'),'PureRec-preview.m4a');
  const list=makeConcatFile(segments);
  await runFfmpeg(['-y','-f','concat','-safe','0','-i',list,'-vn','-c:a','aac','-b:a','192k',out]);
  return out;
}
async function composeEmailWithAttachment(file){
  const escaped=file.replace(/'/g,"''");
  const ps=`$ErrorActionPreference='Stop'; $o=New-Object -ComObject Outlook.Application; $m=$o.CreateItem(0); $m.Subject='PureRec Recording'; $m.Body='Bản ghi âm từ PureRec'; [void]$m.Attachments.Add('${escaped}'); $m.Display()`;
  const ok=await new Promise(resolve=>{
    const c=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{windowsHide:true});
    c.on('error',()=>resolve(false)); c.on('close',code=>resolve(code===0));
  });
  if(ok) return {mode:'outlook'};
  await shell.showItemInFolder(file);
  await shell.openExternal('mailto:?subject='+encodeURIComponent('PureRec Recording')+'&body='+encodeURIComponent('PureRec đã xuất file. File đang được hiển thị trong File Explorer để bạn đính kèm vào email.'));
  return {mode:'mailto'};
}

function sendEvent(type,payload={}){ if(win && !win.isDestroyed()) win.webContents.send('purerec-event',{type,payload}); }

function createWindow(){
  win=new BrowserWindow({
    width:1500,height:930,minWidth:960,minHeight:700,
    backgroundColor:'#07101d',
    title:'PureRec',
    autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  win.loadFile(path.join(__dirname,'web','index.html'));
}

app.whenReady().then(async()=>{
  session.defaultSession.setDisplayMediaRequestHandler(async(request,callback)=>{
    try{
      const sources=await desktopCapturer.getSources({types:['screen']});
      callback({video:sources[0],audio:'loopback'});
    }catch{callback({});}
  },{useSystemPicker:false});
  createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

ipcMain.handle('draft:prepare',async(_e,{append})=>{
  if(!append) clearDraft();
  const m=readMeta(); if(!m.outputDir)m.outputDir=defaultOutputDir(); writeMeta(m); return draftState();
});
ipcMain.handle('draft:begin',async()=>{
  ensureDraftDir();
  const m=readMeta();
  const p=path.join(draftDir(),`segment-${Date.now()}-${Math.random().toString(16).slice(2)}.webm`);
  fs.writeFileSync(p,Buffer.alloc(0));
  const id=path.basename(p);
  m.segments.push({id,path:p,durationMs:0,createdAt:Date.now()}); writeMeta(m); state.currentSegment=id; return {id};
});
ipcMain.handle('draft:chunk',async(_e,{id,data})=>{
  const m=readMeta(); const s=m.segments.find(x=>x.id===id); if(!s) return false;
  fs.appendFileSync(s.path,Buffer.from(data)); return true;
});
ipcMain.handle('draft:updateDuration',async(_e,{id,durationMs})=>{
  const m=readMeta(); const s=m.segments.find(x=>x.id===id); if(s){s.durationMs=Math.max(s.durationMs||0,Math.round(durationMs||0));writeMeta(m);} return draftState();
});
ipcMain.handle('draft:end',async(_e,{id,durationMs})=>{
  const m=readMeta(); const s=m.segments.find(x=>x.id===id); if(s){s.durationMs=Math.max(s.durationMs||0,Math.round(durationMs||0));writeMeta(m);} state.currentSegment=null; return draftState();
});
ipcMain.handle('draft:state',async()=>draftState());
ipcMain.handle('draft:delete',async()=>{clearDraft();return draftState();});
ipcMain.handle('draft:chooseDir',async()=>{
  const r=await dialog.showOpenDialog(win,{title:'Chọn thư mục lưu PureRec',properties:['openDirectory','createDirectory']});
  if(r.canceled||!r.filePaths[0])return {canceled:true};
  const m=readMeta();m.outputDir=r.filePaths[0];writeMeta(m);return {canceled:false,path:m.outputDir};
});
ipcMain.handle('draft:preview',async()=>{
  const p=await renderPreview(); return {url:pathToFileURL(p).href,path:p};
});
ipcMain.handle('draft:finalize',async(_e,{fileName,format,shareMode})=>{
  const m=readMeta(); const fmt=format==='mp3'?'mp3':'wav'; const dir=m.outputDir||defaultOutputDir(); fs.mkdirSync(dir,{recursive:true});
  let dest=path.join(dir,`${safeBase(fileName)}.${fmt}`);
  if(fs.existsSync(dest)){
    const stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19); dest=path.join(dir,`${safeBase(fileName)}-${stamp}.${fmt}`);
  }
  await renderOutput(dest,fmt);
  clearDraft();
  if(shareMode==='email') await composeEmailWithAttachment(dest);
  else shell.showItemInFolder(dest);
  return {path:dest,actualFormat:fmt,shareMode};
});