import {amapMarkerUrl,baiduNamedDirectionUrl} from './map-links.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routeName=a=>'新疆'+(a.name==='喀纳斯湖'?'喀纳斯景区':a.name==='赛里木湖'?'赛里木湖景区':a.name);
export function renderRoutePanel(data,day){
 const panel=document.getElementById('route-places');
 if(panel.dataset.day===String(day))return;
 panel.dataset.day=String(day);
 const days=day?data.days.filter(d=>d.day===day):data.days;
 panel.innerHTML='<summary>'+(day?'当天地点':'每日地点')+'与路段查询</summary><p class="route-help">点击地点打开高德；“百度查路段”按名称查询道路，请在地图中确认景区入口。区间车、步行和实际行车以导游安排为准。</p>'+days.map(d=>'<section class="route-day"><h3>D'+d.day+' · '+esc(d.name)+'</h3><ol>'+d.route.map((id,i)=>{
  const a=data.anchors[id],previous=i?data.anchors[d.route[d.day===6?0:i-1]]:null;
  return '<li><div><span class="route-stop-name">'+esc(a.name)+(d.day===6&&i?' <small>住宿二选一</small>':'')+'</span><a href="'+esc(amapMarkerUrl(a))+'" target="_blank" rel="noopener" aria-label="用高德查看'+esc(a.name)+'">高德查看</a></div>'+(previous?'<a class="route-segment" href="'+esc(baiduNamedDirectionUrl(routeName(previous),routeName(a)))+'" target="_blank" rel="noopener">百度查路段：'+esc(previous.name)+' → '+esc(a.name)+'</a>':'')+'</li>';
 }).join('')+'</ol><p class="route-help">'+esc(d.note)+'</p></section>').join('');
 panel.open=!!day;
}
