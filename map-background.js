// The default route view is drawn locally. Online tiles are strictly opt-in.
export function mountMapBackground(map, onChange, {L=window.L,document:doc=document,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const select=doc.getElementById('map-mode'),status=doc.getElementById('map-status'),notice=doc.getElementById('map-error'),container=doc.getElementById('map');
 let mode='schematic',tiles=null,timer=null;
 const cancel=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 function schematic(message=''){
  mode='schematic';cancel();select.value=mode;
  if(tiles&&map.hasLayer(tiles))map.removeLayer(tiles);
  container.classList.add('route-schematic');container.setAttribute('aria-label','可缩放的行程路线示意图');
  status.textContent='路线示意图 · 不加载在线底图';
  notice.textContent=message;notice.hidden=!message;onChange(mode);
 }
 function failed(){if(mode==='online')schematic('在线底图未能加载，已恢复路线示意图。可用高德查看真实地图。');}
 function online(){
  cancel();mode='online';select.value=mode;notice.hidden=true;
  status.textContent='正在加载在线底图…';container.classList.remove('route-schematic');container.setAttribute('aria-label','可缩放的在线行程地图');onChange(mode);
  if(!tiles){
   tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
   tiles.on('loading',()=>{if(mode==='online'){cancel();timer=setTimer(failed,8000);}});
   tiles.on('tileerror',failed);
   tiles.on('load',()=>{if(mode==='online'){cancel();status.textContent='在线底图 · OpenStreetMap';}});
  }
  timer=setTimer(failed,8000);tiles.addTo(map);
 }
 select.onchange=()=>select.value==='online'?online():schematic();
 schematic();
 return {get mode(){return mode;},destroy(){cancel();select.onchange=null;tiles?.off();if(tiles&&map.hasLayer(tiles))map.removeLayer(tiles);}};
}
