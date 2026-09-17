// Mobile production polish for the expanded navigation.
(function(){
  const s=document.createElement('style');
  s.id='mobile-production-polish';
  s.textContent=`
    @media(max-width:650px){
      .side{height:68px!important;overflow:hidden!important;padding:7px 5px!important}
      .side .nav{display:flex!important;grid-template-columns:none!important;gap:2px!important;margin:0!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      .side .nav::-webkit-scrollbar{display:none}
      .side .nav button{flex:1 0 42px!important;min-width:42px!important;height:54px!important;padding:8px 4px!important;text-align:center!important;white-space:nowrap!important}
      .side .nav button.on,.side .nav button:hover{transform:none!important}
      .top{gap:8px}.top h1{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .top>.btn{flex:0 0 auto;padding:9px 10px;font-size:12px}
      #installTheologyApp{bottom:82px!important;right:12px!important}
    }
  `;
  document.head.appendChild(s);
})();
