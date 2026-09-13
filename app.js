import {distanceKm,activeDay,selectPoints} from './model.js';
import {mountWeather} from './weather-panel.js';
import {mountVoice} from './voice-guide.js';
import {photoMarkup} from './media.js';
import {amapMarkerUrl} from './map-links.js';
import {mountMapBackground} from './map-background.js';
import {renderRoutePanel} from './route-panel.js';
const $=id=>document.getElementById(id),labels={scenery:'风景',culture:'文化',food:'美食'};
const state={day:activeDay(),category:'all',range:'route',position:null};
let data,map,placesLayer,routeLayer,userLayer,mapBackground,lastMapItems=[],watchId,weatherPanel,voiceGuide,locating=false,lastPositionAt=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const distance=p=>p.distance==null?'':p.distance<.1?'不足 100 米':p.distance<1?Math.round(p.distance*20)*50+' 米':p.distance.toFixed(1)+' 公里';
const anchorOf=p=>p.location||data.anchors[p.anchor];
const categoryText=p=>p.kind==='dish'?'地方风味':p.kind==='restaurant'?'餐饮地点':p.kind==='regional'?'地区文化':labels[p.category];
function mapSetup(){
 if(!window.L){$('map-error').textContent='路线图暂未加载，可使用下方的每日地点和高德地图入口。';$('map-error').hidden=false;$('map-mode').disabled=true;return;}
 map=L.map('map',{scrollWheelZoom:false}).setView([46,85.5],5);
 map.createPane('user-location').style.zIndex='650';
 routeLayer=L.layerGroup().addTo(map);placesLayer=L.layerGroup().addTo(map);userLayer=L.layerGroup().addTo(map);
 mapBackground=mountMapBackground(map,()=>renderMap(lastMapItems));
 map.on('zoomend',()=>{if(mapBackground?.mode==='schematic')renderMap(lastMapItems);});
}
function routeCoords(){
 const selected=state.day?data.days.filter(d=>d.day===state.day):data.days;
 return selected.flatMap(d=>d.route.map(id=>{const a=data.anchors[id];return [a.lat,a.lon];}));
}
function fit(){
 if(!map)return;
 if(state.range!=='route'&&state.position){map.setView([state.position.lat,state.position.lon],state.range==='3'?13:state.range==='10'?11:9);return;}
 const coords=routeCoords();if(coords.length===1)map.setView(coords[0],11);else map.fitBounds(coords,{padding:[28,36],maxZoom:12});
}
function renderMap(items){
 lastMapItems=items;
 if(!map)return;
 routeLayer.clearLayers();placesLayer.clearLayers();
 const selected=state.day?data.days.filter(d=>d.day===state.day):data.days;
 selected.forEach(d=>{
  const segments=d.day===6?[[d.route[0],d.route[1]],[d.route[0],d.route[2]]]:[d.route];
  segments.forEach(ids=>{const coords=ids.map(id=>{const a=data.anchors[id];return [a.lat,a.lon];});if(coords.length>1)L.polyline(coords,{color:'#167d9e',weight:3,opacity:.7,dashArray:'7 8'}).addTo(routeLayer);});
 });
 const anchors=state.day?data.days[state.day-1].route:[...new Set(data.days.flatMap(d=>d.route))];
 const labeled=[];
 anchors.forEach((id,i)=>{const a=data.anchors[id],pixel=map.latLngToContainerPoint([a.lat,a.lon]);const permanent=mapBackground?.mode!=='online'&&!labeled.some(p=>Math.abs(p.x-pixel.x)<90&&Math.abs(p.y-pixel.y)<50);if(permanent)labeled.push(pixel);L.marker([a.lat,a.lon],{icon:L.divIcon({className:'route-pin',html:String(i+1),iconSize:[30,30],iconAnchor:[15,15]}),title:a.name,zIndexOffset:1000}).bindTooltip(esc(a.name),{permanent,direction:'top',className:'route-label',offset:[0,-13]}).bindPopup('<strong>'+esc(a.name)+'</strong><br><a href="'+esc(amapMarkerUrl(a))+'" target="_blank" rel="noopener">用高德查看地点</a>').addTo(routeLayer);});
 items.filter(p=>p.kind!=='dish'&&p.kind!=='regional').forEach(p=>{const a=anchorOf(p);L.marker([a.lat,a.lon],{icon:L.divIcon({className:'point-pin '+p.category,iconSize:[14,14],iconAnchor:[7,7]}),title:p.name}).bindTooltip(esc(p.name)).on('click',()=>showDetail(p.id)).addTo(placesLayer);});
}
function renderItinerary(){
 renderRoutePanel(data,state.day);
 const d=data.days.find(d=>d.day===state.day);
 $('itinerary').innerHTML=d?'<h2 id="itinerary-title">D'+d.day+' · '+esc(d.name)+'</h2><p>'+esc(d.text)+'</p><p class="note">'+esc(d.note)+'</p>':'<h2 id="itinerary-title">9 月 19 — 26 日 · 北疆 8 日</h2><p>乌鲁木齐 → 天池 → 阿勒泰 → 禾木 → 喀纳斯 → 乌尔禾 → 赛里木湖 → 独山子 → 乌鲁木齐</p><p class="note">D1 为自由活动；D6 住宿为独山子 / 奎屯二选一，具体以出团通知为准。</p>';
 renderJourney();
}
function renderJourney(){
 const stories=(data.journeyStories||[]).filter(s=>!state.day||s.day===state.day),panel=$('journey');
 if(panel.dataset.day===String(state.day))return;
 panel.dataset.day=String(state.day);
 if(!stories.length){panel.hidden=true;return;}panel.hidden=false;
 panel.innerHTML='<summary>路上也值得看 · '+stories.length+' 段</summary><div class="journey-stories">'+stories.map(s=>'<article class="journey-story">'+photoMarkup(s)+'<div><p class="journey-day">D'+s.day+' · 沿途背景</p><h3>'+esc(s.title)+'</h3><p>'+esc(s.summary)+'</p><button type="button" data-story="'+esc(s.id)+'">在车上听这段</button><details><summary>配图与资料来源</summary>'+photoMarkup(s,{detail:true})+'<p class="source">'+s.sources.map(link=>'<a href="'+esc(link.url)+'" target="_blank" rel="noopener">'+esc(link.title)+'</a>').join('')+'</p></details></div></article>').join('')+'</div><p class="journey-note">沿途风景以实际道路、天气和车窗视野为准；这些介绍不增加行程停靠点。</p>';
 panel.open=!!state.day;
 panel.querySelectorAll('[data-story]').forEach(button=>button.onclick=()=>{const s=stories.find(s=>s.id===button.dataset.story);voiceGuide?.read({...s,name:s.title},true);});
}
function card(p){
 const area=p.location?.area||data.anchors[p.anchor]?.name||'',dayText=p.days.map(d=>'D'+d).join(' / ');
 return '<button class="place-card" type="button" data-id="'+esc(p.id)+'" aria-label="查看'+esc(p.name)+'详情">'+photoMarkup(p)+'<div class="card-inner"><div class="card-top"><span class="badge '+p.category+'">'+categoryText(p)+'</span><span class="distance">'+(p.distance==null?'':(p.kind==='dish'||p.kind==='regional'?'区域约 ':'')+distance(p))+'</span></div><h4>'+esc(p.name)+'</h4><p>'+esc(p.summary)+'</p><p class="card-meta">'+esc(area)+' · '+dayText+(p.kind==='restaurant'?' · 已收录地点':'')+'</p></div></button>';
}
function render(){
 if(!data)return;renderItinerary();weatherPanel?.render(state.day);
 const items=selectPoints(data,state);
 $('content-title').textContent=state.category==='all'?(state.range==='route'?'沿途汇总':'附近汇总'):(state.range==='route'?'沿途':'附近')+labels[state.category];
 $('content-note').textContent=state.position?items.length+' 条已收录内容 · 距离为直线距离':'未使用你的当前位置；当前显示所选行程内容。';
 if(state.range!=='route'&&!state.position){
 $('results').innerHTML='<div class="empty"><h3>先定位，再看附近</h3><p>允许定位后，按当前位置筛选已收录的看点。</p><button type="button" id="empty-locate" class="primary">定位到我</button></div>';$('empty-locate').onclick=locate;
 }else if(!items.length){
 $('results').innerHTML='<div class="empty"><h3>这个范围暂未收录内容</h3><p>可扩大范围，或回到行程查看沿途介绍。</p><button type="button" id="reset-range">查看所选行程</button></div>';
 $('reset-range').onclick=()=>{state.range='route';$('range').value='route';render();fit();};
 }else{
 const cats=state.category==='all'?Object.keys(labels):[state.category];
 $('results').innerHTML=cats.map(c=>{const list=items.filter(p=>p.category===c),shown=state.category==='all'?list.slice(0,3):list;return list.length?'<section class="group" aria-label="'+labels[c]+'"><div class="group-heading"><h3>'+labels[c]+'</h3>'+(state.category==='all'&&list.length>3?'<button type="button" class="more" data-more="'+c+'">查看全部 '+list.length+' 条</button>':'<span>'+list.length+' 条</span>')+'</div><div class="cards">'+shown.map(card).join('')+'</div></section>':'';}).join('');
 $('results').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>showDetail(b.dataset.id));
 $('results').querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>document.querySelector('[data-category="'+b.dataset.more+'"]').click());
 }
 renderMap(items);
}
function showDetail(id){
 const p=data.points.find(p=>p.id===id);if(!p)return;
 const a=anchorOf(p),d=state.position?distanceKm(state.position,a):null;
 const osm=a.osm?'https://www.openstreetmap.org/'+a.osm:'https://www.openstreetmap.org/?mlat='+a.lat+'&mlon='+a.lon+'#map=16/'+a.lat+'/'+a.lon;
 const regional=p.kind==='dish'||p.kind==='regional';
 const external=amapMarkerUrl(a,p.name+(regional?' · 相关地区':''));
 $('detail-content').innerHTML='<span class="badge '+p.category+'">'+categoryText(p)+'</span><h2>'+esc(p.name)+'</h2><p class="detail-meta">'+esc(a.area||a.name||'沿途地点')+' · '+p.days.map(n=>'D'+n).join(' / ')+(d==null?'':' · 直线约 '+d.toFixed(1)+' 公里')+'</p>'+photoMarkup(p,{detail:true})+'<section class="detail-summary"><h3>简介</h3><p>'+esc(p.summary)+'</p><p>'+esc(p.body)+'</p></section><div class="listen-actions"><button type="button" id="listen-summary">听简介</button><button type="button" id="listen-details">听详细介绍</button></div><section class="expanded-details"><h3>详细介绍</h3>'+(p.details||[]).map(s=>'<h4>'+esc(s.title)+'</h4><p>'+esc(s.text)+'</p>').join('')+'</section><p class="detail-tip">'+esc(p.tip)+'</p>'+(regional?'<p class="detail-meta">位置表示相关地区，不是餐馆或文化场馆的准确地址。</p>':'')+(p.kind==='restaurant'?'<p class="detail-meta">依据公开地图收录。未核实当前营业状态、价格或评分，出发前请再次查看。</p>':'')+'<div class="detail-actions"><button type="button" id="show-on-map">'+(regional?'查看相关区域':'地图上查看')+'</button><a href="'+esc(external)+'" target="_blank" rel="noopener">用高德查看'+(regional?'区域':'地点')+'</a></div><p class="source">'+(p.sources||[]).map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a>').join('')+'<a href="'+esc(osm)+'" target="_blank" rel="noopener">地图位置来源</a><br>资料整理：'+data.verified+'。'+'</p>';
 $('show-on-map').onclick=()=>{$('detail').close();if(map){map.setView([a.lat,a.lon],regional?11:14);L.popup().setLatLng([a.lat,a.lon]).setContent(esc(p.name)+(regional?' · 地区参考':'')).openOn(map);$('map').scrollIntoView({behavior:'smooth',block:'center'});}else $('map-error').hidden=false;};
 $('listen-summary').onclick=()=>voiceGuide?.read(p,false);
 $('listen-details').onclick=()=>voiceGuide?.read(p,true);
 $('detail').showModal();
}
function stopWatch(){if(watchId!==undefined){navigator.geolocation.clearWatch(watchId);watchId=undefined;}}
function acceptPosition(pos,focus=false){
 const c=pos.coords;if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))return;
 if(document.hidden){locating=false;$('locate').disabled=false;$('locate').textContent='刷新位置';return;}
 state.position={lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,timestamp:pos.timestamp};lastPositionAt=Date.now();
 $('location-status').textContent='已定位 · 精度约 '+Math.round(c.accuracy)+' 米';$('locate').textContent='刷新位置';$('locate').disabled=false;locating=false;
 if(map){userLayer.clearLayers();L.circle([c.latitude,c.longitude],{radius:c.accuracy,color:'#2868cc',fillOpacity:.08,weight:1}).addTo(userLayer);L.circleMarker([c.latitude,c.longitude],{pane:'user-location',radius:7,color:'#fff',weight:3,fillColor:'#2868cc',fillOpacity:1}).bindTooltip('我的位置').addTo(userLayer);if(focus)map.setView([c.latitude,c.longitude],13);}
 render();voiceGuide?.onPosition(state.position);
}
function beginWatch(){
 stopWatch();if(document.visibilityState!=='visible')return;
 watchId=navigator.geolocation.watchPosition(pos=>{if(Date.now()-lastPositionAt>5000)acceptPosition(pos);},()=>{stopWatch();voiceGuide?.locationError();$('location-status').textContent='位置暂未更新，可点刷新位置';},{enableHighAccuracy:true,maximumAge:10000,timeout:25000});
}
function locate(){
 if(locating)return;if(!navigator.geolocation||!window.isSecureContext){$('location-status').textContent='请在安全的网页链接中打开定位功能';return;}
 locating=true;$('locate').disabled=true;$('locate').textContent='定位中…';$('location-status').textContent='请在浏览器中允许位置访问';
 navigator.geolocation.getCurrentPosition(pos=>{acceptPosition(pos,true);beginWatch();},error=>{voiceGuide?.locationError();locating=false;$('locate').disabled=false;$('locate').textContent='重新定位';$('location-status').textContent=error.code===1?'未获定位权限；可在浏览器设置中允许后重试':error.code===3?'定位超时，请到信号较好的位置重试':'暂时无法定位，请检查手机定位开关';},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
$('day').value=String(state.day);
$('day').onchange=e=>{state.day=Number(e.target.value);render();fit();};
$('range').onchange=e=>{state.range=e.target.value;render();fit();};
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));render();});
$('locate').onclick=locate;$('fit').onclick=()=>{state.range='route';$('range').value='route';render();fit();};
$('close-detail').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWatch();else if(state.position){$('location-status').textContent='正在更新位置';beginWatch();}});
window.addEventListener('pagehide',stopWatch);
function registerTools(){
 const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();
 try{Promise.resolve(context.registerTool({name:'select_trip_view',title:'查看北疆行程',description:'切换本页行程天数和内容分类，不访问或返回用户位置。',inputSchema:{type:'object',properties:{day:{type:'integer',minimum:0,maximum:8},category:{type:'string',enum:['all','scenery','culture','food']}},required:['day','category'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||!Number.isInteger(input.day)||input.day<0||input.day>8||!['all','scenery','culture','food'].includes(input.category)||Object.keys(input).some(k=>!['day','category'].includes(k)))throw Error('请选择 0—8 的行程天数及有效分类。');state.day=input.day;state.category=input.category;state.range='route';$('day').value=String(state.day);$('range').value='route';document.querySelectorAll('[data-category]').forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.category===state.category)));render();fit();return {day:state.day,category:state.category,places:selectPoints(data,{...state,position:null}).map(p=>({id:p.id,name:p.name}))};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
try{const res=await fetch('data/trip.json');if(!res.ok)throw Error('data');data=await res.json();mapSetup();weatherPanel=mountWeather(data);render();fit();registerTools();let areas=null;try{const res=await fetch('data/voice-areas.json');if(res.ok)areas=await res.json();}catch{}voiceGuide=mountVoice(data,areas,locate);}
catch{$('results').innerHTML='<div class="empty"><h3>行程暂时未能加载</h3><p>请检查网络后刷新页面重试。</p><button type="button" id="reload">重新加载</button></div>';$('reload').onclick=()=>window.location.reload();}

