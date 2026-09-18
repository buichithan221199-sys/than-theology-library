const { contextBridge, ipcRenderer } = require('electron');

let recorder=null, displayStream=null, audioStream=null, segmentId=null, segmentStarted=0, segmentAccumulated=0, tickTimer=null;
let writeChain=Promise.resolve();
const listeners=new Set();
function emit(type,payload={}){ for(const cb of listeners){ try{cb({type,payload});}catch{} } }
ipcRenderer.on('purerec-event',(_e,event)=>emit(event.type,event.payload||{}));

async function beginCapture(append){
  await ipcRenderer.invoke('draft:prepare',{append});
  const display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
  const tracks=display.getAudioTracks();
  if(!tracks.length){ display.getTracks().forEach(t=>t.stop()); throw new Error('Không nhận được system audio.'); }
  displayStream=display; audioStream=new MediaStream(tracks);
  const mime=['audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
  const begin=await ipcRenderer.invoke('draft:begin'); segmentId=begin.id; segmentStarted=Date.now(); segmentAccumulated=0; writeChain=Promise.resolve();
  recorder=new MediaRecorder(audioStream,mime?{mimeType:mime,audioBitsPerSecond:192000}:{audioBitsPerSecond:192000});
  recorder.ondataavailable=e=>{
    if(!e.data||!e.data.size||!segmentId)return;
    const id=segmentId;
    writeChain=writeChain.then(async()=>{ const ab=await e.data.arrayBuffer(); return ipcRenderer.invoke('draft:chunk',{id,data:new Uint8Array(ab)}); });
  };
  recorder.start(1000);
  clearInterval(tickTimer);
  tickTimer=setInterval(()=>{
    if(segmentId && recorder && recorder.state==='recording'){
      const d=segmentAccumulated+(Date.now()-segmentStarted);
      ipcRenderer.invoke('draft:updateDuration',{id:segmentId,durationMs:d}).catch(()=>{});
    }
  },1000);
  emit('recording',{});
}
async function endCapture(){
  if(!recorder||!segmentId) return await ipcRenderer.invoke('draft:state');
  clearInterval(tickTimer); tickTimer=null;
  const id=segmentId; const dur=segmentAccumulated+(Date.now()-segmentStarted);
  await new Promise(resolve=>{
    const r=recorder;
    r.addEventListener('stop',resolve,{once:true});
    try{r.requestData();}catch{}
    try{r.stop();}catch{resolve();}
  });
  await writeChain;
  displayStream?.getTracks().forEach(t=>t.stop());
  displayStream=null;audioStream=null;recorder=null;segmentId=null;
  return await ipcRenderer.invoke('draft:end',{id,durationMs:dur});
}
async function start(json){ try{await beginCapture(false);}catch(e){emit('error',{message:e.message||String(e)});} }
async function continueDraft(json){ try{await beginCapture(true);}catch(e){emit('error',{message:e.message||String(e)});} }
async function pause(json){ try{const s=await endCapture();emit('paused',{durationMs:s.durationMs||0});}catch(e){emit('error',{message:e.message||String(e)});} }
async function resume(json){ try{await beginCapture(true);}catch(e){emit('error',{message:e.message||String(e)});} }
async function saveDraft(json){ try{const s=await endCapture();emit('saved',{durationMs:s.durationMs||0});}catch(e){emit('error',{message:e.message||String(e)});} }
async function preview(json){
  try{const s=await endCapture();emit('paused',{durationMs:s.durationMs||0});const p=await ipcRenderer.invoke('draft:preview');emit('previewReady',p);}catch(e){emit('error',{message:e.message||String(e)});} }
async function playDraft(json){ try{const p=await ipcRenderer.invoke('draft:preview');emit('previewReady',p);}catch(e){emit('error',{message:e.message||String(e)});} }
async function getDraftState(json){ try{const s=await ipcRenderer.invoke('draft:state');emit('draftState',s);}catch(e){emit('error',{message:e.message||String(e)});} }
async function deleteDraft(json){ try{await endCapture().catch(()=>{});const s=await ipcRenderer.invoke('draft:delete');emit('draftState',s);}catch(e){emit('error',{message:e.message||String(e)});} }
async function finalize(json){
  try{
    const opts=typeof json==='string'?JSON.parse(json||'{}'):(json||{});
    const s=await endCapture(); emit('paused',{durationMs:s.durationMs||0});
    const out=await ipcRenderer.invoke('draft:finalize',opts); emit('exported',out);
  }catch(e){emit('error',{message:e.message||String(e)});}
}
async function chooseSaveDir(){ const r=await ipcRenderer.invoke('draft:chooseDir'); return JSON.stringify(r); }

contextBridge.exposeInMainWorld('PureRecNative',{start,continueDraft,pause,resume,saveDraft,preview,playDraft,getDraftState,deleteDraft,finalize,chooseSaveDir});
contextBridge.exposeInMainWorld('PureRecEvents',{subscribe:(cb)=>{if(typeof cb==='function')listeners.add(cb);}});