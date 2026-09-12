export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function photoMarkup(item,{detail=false}={}) {
  const photo=item.photo;
  if(!photo)return '';
  const image='<img src="'+escapeHTML(photo.src)+'" alt="'+escapeHTML(photo.alt)+'" loading="lazy" decoding="async" width="900" height="600">';
  if(!detail)return '<span class="card-photo">'+image+(photo.illustrative?'<span class="photo-label">配图示意</span>':'')+'</span>';
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
