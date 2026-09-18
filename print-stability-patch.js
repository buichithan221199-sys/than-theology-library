// Print/PDF stability: use a visible preview page instead of delayed printing from a hidden iframe.
(function(){
  window.openPrintablePdf=function(title,body){
    try{
      // Prune stale print payloads.
      try{
        for(let i=localStorage.length-1;i>=0;i--){
          const k=localStorage.key(i);
          if(!k||!k.startsWith('theology_print_'))continue;
          try{
            const v=JSON.parse(localStorage.getItem(k)||'{}');
            if(v.ts&&Date.now()-Number(v.ts)>60*60*1000)localStorage.removeItem(k);
          }catch{}
        }
      }catch{}

      const key=Date.now().toString(36)+Math.random().toString(36).slice(2,9);
      localStorage.setItem('theology_print_'+key,JSON.stringify({
        title:String(title||'Bản in'),
        body:String(body||''),
        ts:Date.now()
      }));

      // Same-tab navigation is deliberate: it is reliable in iPhone Safari/PWA
      // and avoids popup-blocking or hidden-iframe print failures.
      location.href='./print-preview.html?k='+encodeURIComponent(key);
    }catch(e){
      console.error('PDF export error',e);
      alert('Không thể mở bản xem trước PDF/In. Vui lòng tải lại trang rồi thử lại.');
    }
  };
})();
