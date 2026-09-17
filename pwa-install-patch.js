// Install button for the GitHub Pages PWA.
(function(){
  let deferredPrompt=null;
  let installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
  function ensureButton(){
    const existing=document.getElementById('installTheologyApp');
    if(installed){existing?.remove();return}
    if(existing)return;
    const btn=document.createElement('button');
    btn.id='installTheologyApp';btn.className='btn gold';btn.type='button';btn.innerHTML='⬇ Tải app';
    btn.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;box-shadow:0 10px 28px #0003;padding:12px 16px;border-radius:14px;font-weight:800';
    btn.onclick=async()=>{
      if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch{}deferredPrompt=null;return}
      if(isIOS())alert('Trên iPhone/iPad: mở menu Chia sẻ của Safari → chọn “Thêm vào Màn hình chính”.');
      else alert('Nếu trình duyệt chưa hiện hộp cài đặt, mở menu ⋮ của Chrome/Edge → chọn “Cài đặt Thư Viện Thần Học” hoặc “Install app”.');
    };
    document.body.appendChild(btn);
  }
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;ensureButton()});
  window.addEventListener('appinstalled',()=>{installed=true;document.getElementById('installTheologyApp')?.remove()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureButton);else ensureButton();
  const mo=new MutationObserver(ensureButton);mo.observe(document.documentElement,{childList:true,subtree:true});
})();
