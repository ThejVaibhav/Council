// A small built-in gazetteer so a route can show rough distance and direction without a maps service.
// [name, lat, lon, aliases]
const PLACES = [
  ['Bengaluru', 12.97, 77.59, ['bangalore', 'blr']], ['Mysuru', 12.3, 76.64, ['mysore']], ['Coorg', 12.42, 75.74, ['madikeri', 'kodagu']],
  ['Chikmagalur', 13.32, 75.77, ['chikkamagaluru']], ['Sakleshpur', 12.94, 75.78, []], ['Nandi Hills', 13.37, 77.68, []],
  ['Kabini', 11.93, 76.35, []], ['Bandipur', 11.67, 76.63, []], ['Hampi', 15.34, 76.46, []], ['Dandeli', 15.25, 74.62, []],
  ['Gokarna', 14.55, 74.32, ['kudle', 'om beach']], ['Murudeshwar', 14.09, 74.48, []], ['Udupi', 13.34, 74.75, ['manipal']],
  ['Mangaluru', 12.91, 74.86, ['mangalore']], ['Agumbe', 13.5, 75.09, []], ['Goa', 15.49, 73.83, ['panaji', 'panjim']],
  ['Ooty', 11.41, 76.7, ['udhagamandalam']], ['Kodaikanal', 10.24, 77.49, []], ['Yercaud', 11.78, 78.21, []],
  ['Munnar', 10.09, 77.06, []], ['Wayanad', 11.69, 76.13, []], ['Kochi', 9.93, 76.27, ['cochin']], ['Alleppey', 9.49, 76.33, ['alappuzha']],
  ['Varkala', 8.73, 76.72, []], ['Pondicherry', 11.94, 79.81, ['puducherry', 'pondy']], ['Mahabalipuram', 12.62, 80.19, ['mamallapuram']],
  ['Chennai', 13.08, 80.27, ['madras']], ['Tirupati', 13.63, 79.42, []], ['Hyderabad', 17.39, 78.49, []], ['Mumbai', 19.08, 72.88, ['bombay']],
  ['Pune', 18.52, 73.86, []], ['Lonavala', 18.75, 73.41, []], ['Delhi', 28.61, 77.21, ['new delhi']], ['Jaipur', 26.91, 75.79, []],
  ['Udaipur', 24.59, 73.71, []], ['Rishikesh', 30.09, 78.27, []], ['Manali', 32.24, 77.19, []], ['Shimla', 31.1, 77.17, []],
  ['Leh', 34.15, 77.58, ['ladakh']], ['Srinagar', 34.08, 74.8, []], ['Gulmarg', 34.05, 74.38, []], ['Kolkata', 22.57, 88.36, ['calcutta']],
  ['Darjeeling', 27.04, 88.26, []],
  ['Visakhapatnam', 17.69, 83.22, ['vizag', 'vishakapatnam', 'visakapatnam', 'vskp']], ['Araku Valley', 18.33, 82.88, ['araku']],
  ['Lambasingi', 17.81, 82.5, []], ['Vijayawada', 16.51, 80.65, ['bezawada']], ['Guntur', 16.31, 80.44, []],
  ['Rajahmundry', 17.0, 81.8, ['rajamahendravaram']], ['Srisailam', 16.07, 78.87, []], ['Kurnool', 15.83, 78.04, []],
  ['Gandikota', 14.81, 78.29, []], ['Nellore', 14.44, 79.99, []], ['Warangal', 17.97, 79.59, []], ['Srikakulam', 18.3, 83.9, []],
  ['Bhubaneswar', 20.3, 85.82, []], ['Puri', 19.81, 85.83, []], ['Coimbatore', 11.02, 76.96, []], ['Madurai', 9.93, 78.12, []],
  ['Rameswaram', 9.29, 79.31, []], ['Kanyakumari', 8.09, 77.54, []], ['Thanjavur', 10.79, 79.14, ['tanjore']],
  ['Thiruvananthapuram', 8.52, 76.94, ['trivandrum']], ['Kozhikode', 11.26, 75.78, ['calicut']], ['Thekkady', 9.6, 77.16, []],
  ['Belagavi', 15.85, 74.5, ['belgaum']], ['Hubballi', 15.36, 75.12, ['hubli']], ['Shivamogga', 13.93, 75.57, ['shimoga']],
  ['Mahabaleshwar', 17.92, 73.66, []], ['Nashik', 20.0, 73.79, []], ['Aurangabad', 19.88, 75.34, ['ajanta', 'ellora']],
  ['Ahmedabad', 23.02, 72.57, []], ['Agra', 27.18, 78.01, []], ['Varanasi', 25.32, 82.97, ['banaras', 'benares', 'kashi']],
  ['Amritsar', 31.63, 74.87, []], ['Chandigarh', 30.73, 76.78, []], ['Dharamshala', 32.22, 76.32, ['mcleodganj', 'mcleod ganj']],
  ['Kasol', 32.01, 77.31, []], ['Mussoorie', 30.46, 78.07, []], ['Nainital', 29.39, 79.45, []], ['Jodhpur', 26.24, 73.02, []],
  ['Jaisalmer', 26.92, 70.91, []], ['Shillong', 25.58, 91.89, []], ['Gangtok', 27.33, 88.61, []], ['Guwahati', 26.14, 91.74, []], ['Port Blair', 11.62, 92.73, ['andaman', 'havelock']], ['Kempegowda Airport', 13.2, 77.71, ['kempegowda']],
]

export const INDEX = PLACES.map(([name, lat, lon, aliases]) => ({ name, lat, lon, keys: [name.toLowerCase(), ...aliases] }))

export function findPlace(text) {
  if (!text) return null
  const t = text.toLowerCase().trim()
  return INDEX.find((p) => p.keys.some((k) => t === k || t.startsWith(k) || t.includes(k))) ?? null
}

// First known place mentioned in free text, skipping the starting point.
export function placeInText(text, except) {
  if (!text) return null
  const t = text.toLowerCase()
  let best = null
  for (const p of INDEX) {
    if (except && p.name === except.name) continue
    for (const k of p.keys) {
      const i = t.search(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`))
      if (i >= 0 && (!best || i < best.i)) best = { p, i }
    }
  }
  return best?.p ?? null
}

export function distanceKm(a, b) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
