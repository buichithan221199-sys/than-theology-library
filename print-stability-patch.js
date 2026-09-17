// Print/PDF stability: wait for images before opening the browser print dialog.
(function(){
  window.openPrintablePdf=function(title,body){
    try{
      const old=document.getElementById('theologyPrintFrame');if(old)old.remove();
      const frame=document.createElement('iframe');
      frame.id='theologyPrintFrame';
      frame.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
      frame.setAttribute('aria-hidden','true');
      document.body.appendChild(frame);
      const win=frame.contentWindow,doc=win.document;
      doc.open();doc.write(pdfHtmlShell(title,body));doc.close();

      let printed=false;
      const cleanup=()=>setTimeout(()=>{try{frame.remove()}catch{}},1200);
      const printNow=()=>{
        if(printed||!frame.isConnected)return;printed=true;
        try{win.focus();win.print()}catch(e){console.error(e);alert('Không mở được cửa sổ in. Hãy thử lại trên Chrome/Edge.');cleanup()}
      };
      try{win.addEventListener('afterprint',cleanup,{once:true})}catch{}
      const images=[...doc.images];
      if(!images.length){setTimeout(printNow,180);return}
      const waits=images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{
        const done=()=>resolve();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
      }));
      Promise.race([
        Promise.all(waits),
        new Promise(resolve=>setTimeout(resolve,8000))
      ]).then(()=>setTimeout(printNow,180));
    }catch(e){console.error('PDF export error',e);alert('Không thể tạo bản in PDF. Vui lòng tải lại trang rồi thử lại.');}
  };
})();
