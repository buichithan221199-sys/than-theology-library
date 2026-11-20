// Final production login persistence: run after security-patch.js and all UI patches.
(function(){
  'use strict';
  const KEY='theology_remember_admin_v1';
  const FIFTEEN_DAYS=15*24*60*60*1000;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const clear=()=>{try{localStorage.removeItem(KEY)}catch(e){}};
  const valid=x=>x&&typeof x.session==='string'&&x.session.length>10&&
    Number.isFinite(x.savedAt)&&Date.now()>=x.savedAt&&Date.now()-x.savedAt<FIFTEEN_DAYS;
  const oldAdm=adm;
  adm=async function(action,payload={},pin=S.pin){
    // Capture the user's choice BEFORE the asynchronous login call and DOM removal.
    const wantsRemember=action==='admin_login'&&!!document.querySelector('#rememberAdmin:checked');
    const result=await oldAdm(action,payload,pin);
    if(action==='admin_login'){
      if(wantsRemember&&result.session){
        try{localStorage.setItem(KEY,JSON.stringify({
          session:result.session,name:result.admin_name||'',primary:!!result.is_primary,
          savedAt:Date.now()
        }))}catch(e){console.warn('Cannot remember admin session',e)}
      }else clear();
    }
    if(action==='admin_logout')clear();
    return result;
  };
  const oldLock=window.lockAdmin||lockAdmin;
  window.lockAdmin=async function(){
    clear();
    try{if(S.pin)await oldAdm('admin_logout',{},S.pin)}catch(e){}
    return oldLock.apply(this,arguments);
  };
  function addCheckbox(){
    const pin=document.getElementById('adminPin');
    if(!pin||document.getElementById('oldPin')||document.getElementById('rememberAdmin'))return;
    const field=pin.closest('.field');if(!field)return;
    const label=document.createElement('label');
    label.style.cssText='display:flex;align-items:center;gap:9px;margin:10px 0 15px;cursor:pointer';
    const box=document.createElement('input');
    box.id='rememberAdmin';box.type='checkbox';
    box.style.cssText='width:auto;min-width:17px;height:17px;margin:0';
    label.append(box,document.createTextNode('Ghi nhớ đăng nhập trong 15 ngày'));
    field.after(label);
  }
  const observe=()=>{new MutationObserver(addCheckbox).observe(document.body,{subtree:true,childList:true});addCheckbox()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  // The base HTML launches load() before patches execute. Explicitly reload the
  // validated Admin snapshot after the full patch bundle is installed.
  const saved=read();
  if(!valid(saved)){if(saved)clear();return}
  S.pin=saved.session;
  S.adminName=saved.name||'';
  S.isPrimary=!!saved.primary;
  Promise.resolve().then(async()=>{
    try{
      await oldAdm('load_admin_snapshot',{},saved.session);
      if(S.pin===saved.session)await load();
    }catch(e){
      clear();
      if(S.pin===saved.session){
        S.pin='';S.adminName='';S.isPrimary=false;S.revealed={};
        try{await load()}catch(err){console.error('Public load failed',err)}
      }
    }
  });
})();
