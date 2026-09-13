export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function photoMarkup(item,{detail=false}={}) {
  const photo=item.photo;
  if(!photo)return '';
  if(photo.status==='unavailable'){
    const placeholder='<span class="photo-placeholder"><svg viewBox="0 0 64 64" aria-hidden="true" width="48" height="48"><path d="M32 57S12 38 12 24a20 20 0 0 1 40 0c0 14-20 33-20 33Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="3"/></svg><span>店铺照片待补充</span><small>已收录位置，可查看地图</small></span>';
    return detail?'<figure class="detail-photo">'+placeholder+'<figcaption>'+escapeHTML(photo.caption)+'</figcaption></figure>':'<span class="card-photo">'+placeholder+'</span>';
  }
  const image='<img src="'+escapeHTML(photo.src)+'" alt="'+escapeHTML(photo.alt)+'" loading="lazy" decoding="async" width="900" height="600">';
  if(!detail)return '<span class="card-photo">'+image+(photo.label||photo.illustrative?'<span class="photo-label">'+escapeHTML(photo.label||'配图示意')+'</span>':'')+'</span>';
  const license=photo.licenseUrl?'<a href="'+escapeHTML(photo.licenseUrl)+'" target="_blank" rel="noopener">'+escapeHTML(photo.license)+'</a>':escapeHTML(photo.license||'版权归原作者');
  return '<figure class="detail-photo">'+image+'<figcaption>'+escapeHTML(photo.caption)+'<br><a href="'+escapeHTML(photo.sourceUrl)+'" target="_blank" rel="noopener">'+escapeHTML(photo.author)+'</a> · '+license+'</figcaption></figure>';
}
export function narrationText(point,full=true) {
  if(full&&point.narration)return point.narration;
  if(!full&&point.narrationShort)return point.narrationShort;
  const pieces=[point.name,point.summary];
  if(full)pieces.push(point.body,...(point.details||[]).map(s=>s.text));
  return pieces.filter(Boolean).map(t=>t.trim().replace(/[。！？；]+$/,'')).join('。')+'。';
}
