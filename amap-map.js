import {mapConfig} from './map-config.js';
import {createAMapLoader} from './amap-loader.js?v=20260915-amap';
import {createAMapConverter} from './amap-coordinates.js';
const keyOf=p=>p.lat+','+p.lon;
const pointOf=(data,p)=>p.location||data.anchors[p.anchor];

export function mountAMap(data,onDetail,{doc=document,config=mapConfig,loadSDK=createAMapLoader(),makeConverter=createAMapConverter,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const container=doc.getElementById('map'),status=doc.getElementById('map-status'),notice=doc.getElementById('map-error'),retry=doc.getElementById('retry-map');
 let A,map,converter,generation=0,positionVersion=0,viewVersion=0,disposed=false,routeReady=false,baseReady=false,loadTimer=null,onComplete;
 let scene={items:[],day:0},view={type:'route',day:0,range:'route',position:null},position=null,overlays=[],routeMarkers=[],userOverlays=[],fixed=new Map(),issues={};
 const configured=()=>Boolean(config.amapKey?.trim()&&(config.serviceHost?.trim()||config.securityJsCode?.trim()));
 const cancelTimer=()=>{if(loadTimer!==null)clearTimer(loadTimer);loadTimer=null;};
 function syncStatus(){
  if(!configured()){
   status.textContent='在线地图待配置';notice.textContent='网站的高德地图服务尚未配置完成。';notice.hidden=false;retry.hidden=true;return;
  }
  status.textContent=baseReady?(routeReady?'在线地图 · 高德地图':'在线地图 · 正在准备行程标记'):'正在加载在线地图…';
  const messages=Object.values(issues);notice.textContent=messages.join(' ');notice.hidden=!messages.length;retry.hidden=!messages.length;retry.disabled=false;
  if(issues.base)status.textContent='在线地图暂未加载完成';
  else if(issues.route&&baseReady)status.textContent='在线地图 · 行程标记暂未完成';
 }
 function clear(list){if(map&&list.length)map.remove(list);list.length=0;}
 function marker(point,name,color,size,text,action,z=0){
  const content=doc.createElement(action?'button':'span');
  content.className='amap-trip-marker';content.textContent=text;content.title=name;
  content.style.cssText='background:'+color+';width:'+size+'px;height:'+size+'px';
  if(action){content.type='button';content.setAttribute('aria-label',name);content.onclick=event=>{event.stopPropagation();action();};}
  const item=new A.Marker({position:point,content,title:name,anchor:'center',offset:new A.Pixel(0,0),zIndex:z});map.add(item);return item;
 }
 function showArea(name,point){
  const content=doc.createElement('div'),title=doc.createElement('strong'),description=doc.createElement('p');
  title.textContent=name;description.textContent='行程停留区域，以出团通知为准。';content.append(title,description);
  new A.InfoWindow({content}).open(map,point);
 }
 function draw(){
  if(!routeReady||disposed)return;
  clear(overlays);routeMarkers=[];
  const days=scene.day?data.days.filter(d=>d.day===scene.day):data.days;
  for(const day of days){
   const segments=day.day===6?[[day.route[0],day.route[1]],[day.route[0],day.route[2]]]:[day.route];
   for(const ids of segments){
    if(ids.length<2)continue;
    const line=new A.Polyline({path:ids.map(id=>fixed.get(keyOf(data.anchors[id]))),strokeColor:'#167d9e',strokeWeight:3,strokeOpacity:.8,strokeStyle:'dashed'});
    map.add(line);overlays.push(line);
   }
  }
  [...new Set(days.flatMap(d=>d.route))].forEach((id,i)=>{
   const a=data.anchors[id],p=fixed.get(keyOf(a)),detail=data.points.find(item=>item.anchor===id&&!['dish','regional','restaurant'].includes(item.kind));
   const item=marker(p,a.name,'#123e50',30,String(i+1),()=>detail?onDetail(detail.id):showArea(a.name,p),1000);
   overlays.push(item);routeMarkers.push(item);
  });
  scene.items.filter(p=>!['dish','regional'].includes(p.kind)).forEach(p=>{
   overlays.push(marker(fixed.get(keyOf(pointOf(data,p))),p.name,{scenery:'#167d9e',culture:'#ae833b',food:'#c46440'}[p.category],20,'',()=>onDetail(p.id),100));
  });
 }
 async function applyView(){
  if(!map||disposed)return;
  const run=generation,ticket=viewVersion,requested=view;
  try{
   if(requested.type==='route'&&(requested.range==='route'||!requested.position)){
    if(!routeReady||!routeMarkers.length)return;
    if(routeMarkers.length===1)map.setZoomAndCenter(11,routeMarkers[0].getPosition(),true);
    else map.setFitView(routeMarkers,true,[45,80,30,30],12);
    delete issues.view;syncStatus();return;
   }
   const point=requested.point||requested.position;
   const [converted]=await converter.convert([point],{remember:requested.type==='point'});
   if(disposed||run!==generation||ticket!==viewVersion)return;
   const zoom=requested.zoom||(requested.range==='3'?13:requested.range==='10'?11:9);
   map.setZoomAndCenter(zoom,converted,true);delete issues.view;syncStatus();
  }catch{
   if(run===generation&&ticket===viewVersion){issues.view='所选位置暂未能显示在地图上，请重试。';syncStatus();}
  }
 }
 async function drawPosition(){
  if(!map||!position||disposed)return;
  const run=generation,ticket=++positionVersion,current={...position};
  try{
   const [p]=await converter.convert([current],{remember:false});
   if(disposed||run!==generation||ticket!==positionVersion)return;
   clear(userOverlays);
   if(Number.isFinite(current.accuracy)&&current.accuracy>0&&current.accuracy<=50000){
    const circle=new A.Circle({center:p,radius:current.accuracy,strokeColor:'#2868cc',strokeWeight:1,fillColor:'#2868cc',fillOpacity:.08});map.add(circle);userOverlays.push(circle);
   }
   userOverlays.push(marker(p,'我的位置','#2868cc',20,'',null,2000));delete issues.position;syncStatus();
  }catch{
   if(run===generation&&ticket===positionVersion){clear(userOverlays);issues.position='已获取位置，但地图上的位置暂未更新。附近距离和播报仍按手机定位计算。';syncStatus();}
  }
 }
 function disposeMap(){
  clear(overlays);clear(userOverlays);routeMarkers=[];
  if(map&&onComplete)map.off('complete',onComplete);
  map?.destroy();map=null;container.textContent='';
 }
 async function boot(){
  if(disposed)return;
  const run=++generation;routeReady=false;baseReady=false;positionVersion++;issues={};cancelTimer();disposeMap();
  if(!configured()){
   status.textContent='在线地图待配置';notice.textContent='网站的高德地图服务尚未配置完成。';notice.hidden=false;retry.hidden=true;return;
  }
  syncStatus();
  try{
   A=await loadSDK(config);if(disposed||run!==generation)return;
   converter=makeConverter(A);
   map=new A.Map(container,{viewMode:'2D',center:[85.5,46.2],zoom:6,zooms:[3,18],scrollWheel:false});
   map.addControl(new A.ToolBar({position:{top:'12px',right:'12px'}}));
   onComplete=()=>{if(run===generation&&!disposed){baseReady=true;cancelTimer();delete issues.base;syncStatus();}};
   map.on('complete',onComplete);
   loadTimer=setTimer(()=>{if(run===generation&&!disposed&&!baseReady){issues.base='在线地图加载超时，请检查网络后重试。';syncStatus();}},15000);
   // Tile loading is independent of coordinate conversion: a service error
   // must not hide a usable online basemap.
   void applyView();
   if(position)void drawPosition();
   const coordinates=[...Object.values(data.anchors),...data.points.map(p=>pointOf(data,p))];
   try{
    const converted=await converter.convert(coordinates);if(disposed||run!==generation)return;
    fixed=new Map(coordinates.map((p,i)=>[keyOf(p),converted[i]]));routeReady=true;draw();await applyView();if(run===generation&&!disposed)syncStatus();
   }catch{
    if(run===generation&&!disposed){issues.route='行程地点暂未能标到地图上，请点击“重新加载地图”重试。';syncStatus();}
   }
  }catch{
   if(run===generation&&!disposed){cancelTimer();issues.base='在线地图未能加载，请稍后点击“重新加载地图”重试。';syncStatus();}
  }
 }
 retry.onclick=()=>void boot();void boot();
 return {
  render(items,day){scene={items,day};draw();},
  fit(state){view={type:'route',day:state.day,range:state.range,position:state.position?{...state.position}:null};viewVersion++;delete issues.view;syncStatus();void applyView();},
  show(point,name,zoom){view={type:'point',point:{...point},name,zoom};viewVersion++;delete issues.view;syncStatus();void applyView();},
  setPosition(p,focus=false){position={...p};if(focus){view={type:'position',point:{...p},zoom:13};viewVersion++;void applyView();}void drawPosition();},
  reload:boot,
  destroy(){if(disposed)return;disposed=true;generation++;positionVersion++;cancelTimer();disposeMap();retry.onclick=null;}
 };
}
