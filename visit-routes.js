const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function routeForPoint(catalog,pointId){
  return catalog?.routes?.find(route=>route.pointIds.includes(pointId))||null;
}

export function preferredOption(route,day){
  return route.options.find(option=>option.days.includes(day)&&option.recommended)
    ||route.options.find(option=>option.days.includes(day))
    ||route.options.find(option=>option.recommended)
    ||route.options[0];
}

export function optionMinutes(option){
  return option.steps.reduce((total,step)=>[total[0]+step.minutes[0],total[1]+step.minutes[1]],[0,0]);
}

export function durationText(minutes){
  return minutes[0]===minutes[1]?`${minutes[0]} 分钟`:`${minutes[0]}–${minutes[1]} 分钟`;
}

function totalDurationText(minutes){
  if(minutes[0]<120)return durationText(minutes);
  const clock=number=>`${Math.floor(number/60)}小时${number%60?`${number%60}分`:''}`;
  return minutes[0]===minutes[1]?clock(minutes[0]):`${clock(minutes[0])}–${clock(minutes[1])}`;
}

export function renderRouteOption(option){
  const total=optionMinutes(option);
  return `<div class="visit-route-plan"><p class="visit-route-path">${esc(option.path)}</p><p class="visit-route-time"><strong>预留 ${totalDurationText(total)}</strong><span>${esc(option.scope)}</span></p><p class="visit-route-fit">${esc(option.when)}</p><p class="visit-route-breakdown">分段预算（标有“累计／往返”的交通只计一次）</p><ol class="visit-route-steps">${option.steps.map(step=>`<li><div class="visit-step-heading"><h4>${esc(step.name)}</h4><span>${durationText(step.minutes)}</span></div><p>${esc(step.detail)}</p></li>`).join('')}</ol><div class="visit-route-cut"><strong>时间不够时</strong><p>${esc(option.shorten)}</p></div></div>`;
}

export function renderVisitRoute(catalog,pointId,day){
  const route=routeForPoint(catalog,pointId);
  if(!route)return '';
  const selected=preferredOption(route,day);
  const pointGuide=route.pointGuides?.[pointId];
  const pointMarkup=pointGuide?`<aside class="visit-route-point"><h4>${esc(pointGuide.title)}</h4><p>${esc(pointGuide.text)}</p></aside>`:'';
  return `<section class="visit-route" aria-labelledby="visit-route-title" data-visit-route="${esc(route.id)}"><div class="visit-route-heading"><span class="visit-route-kicker">游玩路线 · D${route.days.join(' / D')}</span><h3 id="visit-route-title">${esc(route.title)}</h3><p>${esc(route.context)}</p></div>${pointMarkup}<p class="visit-route-estimate">${esc(catalog.timingNote)}</p><div class="visit-route-options" role="group" aria-label="选择游玩路线">${route.options.map(option=>`<button type="button" data-visit-option="${esc(option.id)}" aria-pressed="${option.id===selected.id}">${esc(option.label)}</button>`).join('')}</div><div data-visit-plan>${renderRouteOption(selected)}</div><details class="visit-route-notes"><summary>出发前确认与资料依据</summary><ul>${route.checks.map(check=>`<li>${esc(check)}</li>`).join('')}</ul><p class="visit-route-date">路线资料核对：${esc(catalog.reviewed)}。历史资料仅用于景点位置和游览顺序，开放状态以当天公告为准。</p><ul class="visit-route-sources">${route.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.title)}</a><span>${esc(source.note)}</span></li>`).join('')}</ul></details></section>`;
}

export function bindVisitRoute(container,catalog,pointId){
  const route=routeForPoint(catalog,pointId);
  const section=container.querySelector('[data-visit-route]');
  if(!route||!section)return;
  section.querySelectorAll('[data-visit-option]').forEach(button=>{
    button.addEventListener('click',()=>{
      const option=route.options.find(item=>item.id===button.dataset.visitOption);
      if(!option)return;
      section.querySelectorAll('[data-visit-option]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      section.querySelector('[data-visit-plan]').innerHTML=renderRouteOption(option);
    });
  });
}
