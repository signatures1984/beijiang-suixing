// Official JS API 2.0. A proxy keeps securityJsCode private; explicit direct
// configuration exposes it to visitors and must be approved by the key owner.
// https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode
let sequence=0;
export function createAMapLoader({win=window,doc=document,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let pending=null,identity=null;
 return function load({amapKey,serviceHost,securityJsCode}){
  const key=amapKey?.trim(),host=serviceHost?.trim(),code=securityJsCode?.trim();
  if(!/^[a-fA-F0-9]{32}$/.test(key||''))return Promise.reject(new Error('Missing AMap browser Key'));
  if(host&&code)return Promise.reject(new Error('Choose one map security mode'));
  if(host){
   try{
    const url=new URL(host);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/_AMapService'))throw Error();
   }catch{return Promise.reject(new Error('Invalid HTTPS map service proxy'));}
  }else if(!/^[a-fA-F0-9]{32}$/.test(code||''))return Promise.reject(new Error('Missing map security configuration'));
  const requested=key+'|'+(host||code);
  if(identity&&identity!==requested)return Promise.reject(new Error('Reload page after changing map configuration'));
  if(pending)return pending;
  identity=requested;
  win._AMapSecurityConfig=host?{serviceHost:host}:{securityJsCode:code};
  if(win.AMap?.Map&&win.AMap?.convertFrom&&win.AMap?.ToolBar)return Promise.resolve(win.AMap);
  pending=new Promise((resolve,reject)=>{
   const callback='__beijiangAMapReady'+(++sequence),script=doc.createElement('script');let done=false,timer;
   const finish=error=>{
    if(done)return;done=true;clearTimer(timer);script.onerror=null;
    // Ignore a script callback that arrives after the timeout.
    win[callback]=()=>{};
    if(error){script.remove();reject(error);}else resolve(win.AMap);
   };
   win[callback]=()=>finish(win.AMap?.Map&&win.AMap?.convertFrom&&win.AMap?.ToolBar?null:new Error('Map SDK unavailable'));
   script.async=true;
   script.src='https://webapi.amap.com/maps?'+new URLSearchParams({v:'2.0',key,callback,plugin:'AMap.ToolBar'});
   script.onerror=()=>finish(new Error('Map SDK failed to load'));
   timer=setTimer(()=>finish(new Error('Map SDK timed out')),15000);
   doc.head.appendChild(script);
  }).catch(error=>{pending=null;throw error;});
  return pending;
 };
}
