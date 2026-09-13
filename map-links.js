// Public, key-free map links. The itinerary stores WGS84 coordinates.
// https://lbs.amap.com/api/uri-api/guide/mobile-web/point
// https://lbsyun.baidu.com/docs/webapi?title=mapadjustment/uri/web

function validatePoint(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
    throw new TypeError('Map coordinates must be finite numbers.');
  }
  if (point.lat < -90 || point.lat > 90 || point.lon < -180 || point.lon > 180) {
    throw new RangeError('Map coordinates are outside the WGS84 range.');
  }
}

/** Open a WGS84 point in AMap's mobile web map, without requiring an app or key. */
export function amapMarkerUrl(point, name = point?.name) {
  validatePoint(point);
  const params = new URLSearchParams({
    position: `${point.lon},${point.lat}`,
    name: String(name ?? '所选地点'),
    coordinate: 'wgs84',
    src: 'beijiang-suixing',
    callnative: '0'
  });
  return `https://uri.amap.com/marker?${params}`;
}

function baiduEndpoint(point) {
  // A pipe separates fields in Baidu's endpoint grammar, even after URL decoding.
  const name = String(point.name ?? '所选地点').replaceAll('|', '｜');
  return `latlng:${point.lat},${point.lon}|name:${name}`;
}

/** Open a driving route in Baidu Maps; both endpoints remain in WGS84. */
export function baiduDirectionUrl(from, to) {
  validatePoint(from);
  validatePoint(to);
  const params = new URLSearchParams({
    origin: baiduEndpoint(from),
    destination: baiduEndpoint(to),
    mode: 'driving',
    coord_type: 'wgs84',
    output: 'html',
    src: 'webapp.signatures1984.beijiangsuixing'
  });
  return `https://api.map.baidu.com/direction?${params}`;
}

/** Let Baidu resolve named places, useful when an itinerary anchor is a lake center. */
export function baiduNamedDirectionUrl(fromName, toName) {
  if (typeof fromName !== 'string' || !fromName.trim() ||
      typeof toName !== 'string' || !toName.trim()) {
    throw new TypeError('Both route place names must be non-empty strings.');
  }
  const params = new URLSearchParams({
    origin: fromName.trim(),
    destination: toName.trim(),
    mode: 'driving',
    coord_type: 'wgs84',
    output: 'html',
    src: 'webapp.signatures1984.beijiangsuixing'
  });
  return `https://api.map.baidu.com/direction?${params}`;
}
