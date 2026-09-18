const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={startedAt:null,elapsedBefore:0,timer:null,recording:false,paused:false,draftDuration:0,waveTimer:null};
const bridge={
  kind:window.PureRecNative&&window.PureRecEvents?'windows':window.PureRecNative?'android':window.webkit?.messageHandlers?.purerec?'ios':'web',
  send(type,payload={}){
    if(this.kind==='windows'||this.kind==='android'){const fn=window.PureRecNative?.[type]; if(typeof fn==='function')return fn.call(window.PureRecNative,JSON.stringify(payload));}
    if(this.kind==='ios')window.webkit.messageHandlers.purerec.postMessage({type,payload});
  }
};
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2800)}
function fmt(ms){const s=Math.max(0,Math.floor(ms/1000));return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':')}
function elapsed(){return state.elapsedBefore+(state.recording&&!state.paused&&state.startedAt?Date.now()-state.startedAt:0)}
function updateTimer(){$('#timer').textContent=fmt(elapsed())}
function setUI(mode){state.recording=mode!=='idle';state.paused=mode==='paused';$('#startBtn').classList.toggle('hidden',mode!=='idle');$('#stopBtn').classList.toggle('hidden',mode==='idle');$('#pauseBtn').classList.toggle('hidden',mode!=='recording');$('#resumeBtn').classList.toggle('hidden',mode!=='paused');$('#recordingSubActions').classList.toggle('hidden',mode==='idle');$('#statusDot').classList.toggle('live',mode==='recording');$('#statusText').textContent=mode==='idle'?'SẴN SÀNG':mode==='paused'?'TẠM DỪNG':'ĐANG GHI';$('#signalLabel').textContent=mode==='idle'?'Âm thanh sẵn sàng':mode==='paused'?'Bản ghi đang tạm dừng':'Âm thanh đang được ghi';animate(mode==='recording')}
function initWave(){const w=$('#wave');for(let i=0;i<88;i++){const b=document.createElement('i');b.style.height=(8+Math.random()*16)+'px';w.appendChild(b)}const m=$('#miniBars');for(let i=0;i<24;i++){const b=document.createElement('i');b.style.height=(5+Math.random()*12)+'px';m.appendChild(b)}}
function animate(on){clearInterval(state.waveTimer);const draw=()=>{$$('#wave i').forEach((b,i)=>{const center=1-Math.min(1,Math.abs(i-44)/44),n=on?Math.abs(Math.sin(Date.now()/180+i*.37)):0;b.style.height=(8+n*(20+44*center))+'px';b.style.opacity=on?(.25+n*.72):.25});$$('#miniBars i').forEach((b,i)=>b.style.height=(5+(on?28*Math.abs(Math.sin(Date.now()/220+i*.5)):2))+'px');$('#meterFill').style.width=on?(20+65*Math.abs(Math.sin(Date.now()/800)))+'%':'0%'};draw();if(on)state.waveTimer=setInterval(draw,110)}
function nav(v){$$('.navItem').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$$('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v))}
$$('.navItem').forEach(x=>x.onclick=()=>nav(x.dataset.view));$('#headerSettingsBtn').onclick=()=>nav('settings');
$$('input[name=source]').forEach(r=>r.onchange=()=>{$$('.radioCard').forEach(c=>c.classList.toggle('selected',c.querySelector('input').checked));if(r.value==='app')toast('Bản 1.0 ưu tiên ghi toàn bộ system audio để ổn định nhất.')});
function draftUI(exists,duration=0){state.draftDuration=duration;$('#draftRailCard').classList.toggle('hidden',!exists);$('#draftRailDuration').textContent=fmt(duration)}
function reset(){clearInterval(state.timer);state.startedAt=null;state.elapsedBefore=0;state.recording=false;state.paused=false;$('#timer').textContent='00:00:00';setUI('idle');$('#tempSize').textContent='0 MB'}
window.PureRecNativeEvent=function(event){try{if(typeof event==='string')event=JSON.parse(event)}catch{}const type=event?.type,data=event?.payload||{};
  if(type==='recording'){state.startedAt=Date.now();state.paused=false;setUI('recording');clearInterval(state.timer);state.timer=setInterval(updateTimer,250)}
  else if(type==='paused'){state.elapsedBefore=data.durationMs??elapsed();state.startedAt=null;setUI('paused');updateTimer()}
  else if(type==='saved'){reset();draftUI(true,data.durationMs||0);toast('Đã lưu để tiếp tục sau')}
  else if(type==='draftState'){draftUI(!!data.exists,data.durationMs||0);if(data.outputDir&&$('#savePath'))$('#savePath').textContent=data.outputDir}
  else if(type==='duration'){state.elapsedBefore=data.durationMs||state.elapsedBefore;if(data.bytes!=null)$('#tempSize').textContent=(data.bytes/1024/1024).toFixed(1)+' MB'}
  else if(type==='previewReady'){const a=$('#previewAudio');a.src=data.url;$('#previewModal').classList.remove('hidden');a.play().catch(()=>{})}
  else if(type==='exported'){$('#finishModal').classList.add('hidden');reset();draftUI(false,0);toast(data.shareMode==='email'?'Đã xuất file và mở Email':'Đã xuất file thành công')}
  else if(type==='error')toast(data.message||'Có lỗi xảy ra');
};
if(window.PureRecEvents?.subscribe)window.PureRecEvents.subscribe(e=>window.PureRecNativeEvent(e));
async function start(fromDraft=false){if(bridge.kind==='web')return toast('Hãy dùng bản PureRec cài trên thiết bị để thu system audio ổn định.');if(fromDraft)state.elapsedBefore=state.draftDuration;else state.elapsedBefore=0;bridge.send(fromDraft?'continueDraft':'start');}
async function pause(){state.elapsedBefore=elapsed();state.startedAt=null;setUI('paused');bridge.send('pause')}
async function resume(){state.startedAt=Date.now();setUI('recording');bridge.send('resume')}
function saveDraft(){bridge.send('saveDraft')}
function preview(){bridge.send('preview')}
function finish(){if(state.recording&&!state.paused)pause();$('#finishModal').classList.remove('hidden')}
function exportFinal(mode){bridge.send('finalize',{format:$('#formatSelect').value,fileName:$('#fileName').value||'PureRec_Recording',shareMode:mode})}
$('#startBtn').onclick=()=>start(false);$('#pauseBtn').onclick=pause;$('#resumeBtn').onclick=resume;$('#stopBtn').onclick=finish;$('#saveDraftBtn').onclick=saveDraft;$('#previewBtn').onclick=preview;
$('#closePreview').onclick=()=>$('#previewModal').classList.add('hidden');$('#previewModal').onclick=e=>{if(e.target.id==='previewModal')$('#previewModal').classList.add('hidden')};
$('#closeFinish').onclick=$('#cancelFinish').onclick=()=>$('#finishModal').classList.add('hidden');$('#finishModal').onclick=e=>{if(e.target.id==='finishModal')$('#finishModal').classList.add('hidden')};
$('#saveDeviceBtn').onclick=()=>exportFinal('device');$('#sendEmailBtn').onclick=()=>exportFinal('email');
$('#continueDraftRailBtn').onclick=()=>start(true);$('#playDraftRailBtn').onclick=()=>bridge.send('playDraft');$('#deleteDraftRailBtn').onclick=()=>bridge.send('deleteDraft');
$('#chooseFolderBtn').onclick=async()=>{if(!window.PureRecNative?.chooseSaveDir)return toast('Thiết bị này dùng thư mục âm thanh mặc định.');try{const r=await window.PureRecNative.chooseSaveDir('{}'),d=typeof r==='string'?JSON.parse(r):r;if(d?.path)$('#savePath').textContent=d.path}catch{}};
function detect(){const ua=navigator.userAgent;let p=/Windows/i.test(ua)?'Windows':/Android/i.test(ua)?'Android':/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':'Thiết bị';$('#platformPill').textContent=p+' · Native system audio';if(p==='Android'){ $('#savePath').textContent='Music / PureRec'; $('#formatSelect').value='wav'; const mp3=$('#formatSelect option[value=mp3]'); if(mp3)mp3.disabled=true; } if(p==='iPhone'||p==='iPad'){ $('#savePath').textContent='On My Device / PureRec'; $('#formatSelect').value='wav'; const mp3=$('#formatSelect option[value=mp3]'); if(mp3)mp3.disabled=true; }}
initWave();setUI('idle');detect();bridge.send('getDraftState');