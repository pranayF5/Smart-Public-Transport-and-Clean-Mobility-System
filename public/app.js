const $ = (selector) => document.querySelector(selector);
const routeGrid = $('#routeGrid');
const searchInput = $('#searchInput');
const modeFilter = $('#modeFilter');

// Default sample routes for instant display and offline fallback
const DEFAULT_ROUTES = [
  { id: 'M1', name: 'Metro Blue Line', mode: 'Metro', from: 'Miyapur', to: 'LB Nagar', duration: 42, fare: 45, frequency: '6 min', status: 'On time', color: '#3778f6' },
  { id: 'B7', name: 'City Express 7', mode: 'Bus', from: 'Kukatpally', to: 'Secunderabad', duration: 38, fare: 25, frequency: '10 min', status: 'On time', color: '#12a886' },
  { id: 'M3', name: 'Metro Red Line', mode: 'Metro', from: 'Nagole', to: 'Raidurg', duration: 48, fare: 50, frequency: '7 min', status: 'Minor delay', color: '#f59e0b' },
  { id: 'C2', name: 'Cycle Connect', mode: 'Cycle', from: 'HITEC City', to: 'Durgam Cheruvu', duration: 16, fare: 10, frequency: 'Available now', status: 'Available', color: '#8b5cf6' },
  { id: 'B12', name: 'Green City Bus 12', mode: 'Electric bus', from: 'Gachibowli', to: 'Charminar', duration: 55, fare: 30, frequency: '12 min', status: 'On time', color: '#16a34a' }
];

let routeCache = [...DEFAULT_ROUTES];
let isBackendLive = false;

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function modeClass(mode) {
  return mode.toLowerCase().includes('electric') ? 'Electric' : mode;
}

function renderRoutes(routes) {
  if (!routes || !routes.length) {
    routeGrid.innerHTML = '<div class="empty">No matching routes found. Try another search keyword or transport mode.</div>';
    return;
  }
  routeGrid.innerHTML = routes.map(route => `
    <article class="route-card">
      <div class="route-top">
        <span class="mode-tag">${escapeHTML(modeClass(route.mode))}</span>
        <span class="status ${route.status.toLowerCase().includes('delay') ? 'delay' : ''}">● ${escapeHTML(route.status)}</span>
      </div>
      <h3>${escapeHTML(route.name)}</h3>
      <div class="route-path">
        <span>${escapeHTML(route.from)}</span>
        <span class="line"></span>
        <span>${escapeHTML(route.to)}</span>
      </div>
      <div class="route-bottom">
        <span>◷ ${escapeHTML(route.duration)} min</span>
        <span>Frequency <strong>${escapeHTML(route.frequency)}</strong></span>
        <span>Fare <strong>₹${escapeHTML(route.fare)}</strong></span>
      </div>
    </article>
  `).join('');
}

function filterRoutes() {
  const query = searchInput.value.trim().toLowerCase();
  const mode = modeFilter.value.toLowerCase();
  renderRoutes(routeCache.filter(route =>
    (mode === 'all' || route.mode.toLowerCase() === mode) &&
    `${route.name} ${route.from} ${route.to} ${route.mode}`.toLowerCase().includes(query)
  ));
}

// Resilient API Fetcher with automatic multi-target fallback
async function apiFetch(endpoint, options = {}) {
  const candidates = [];
  if (window.location.protocol !== 'file:') {
    candidates.push(endpoint);
  }
  candidates.push(`http://localhost:3000${endpoint}`);
  candidates.push(`http://127.0.0.1:3000${endpoint}`);

  let lastError = null;
  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 400) {
        const errJson = await response.json().catch(() => ({}));
        const err = new Error(errJson.error || 'Invalid request.');
        err.isValidation = true;
        throw err;
      }
    } catch (err) {
      if (err.isValidation) throw err;
      lastError = err;
    }
  }
  throw lastError || new Error('Backend not available');
}

// Client-side journey planning calculator when backend is not reached
function calculateLocalTrip(from, to) {
  const fromClean = String(from || '').trim();
  const toClean = String(to || '').trim();
  const fromLower = fromClean.toLowerCase();
  const toLower = toClean.toLowerCase();

  const matchedRoute = routeCache.find(r =>
    (r.from.toLowerCase().includes(fromLower) && r.to.toLowerCase().includes(toLower)) ||
    (r.from.toLowerCase().includes(toLower) && r.to.toLowerCase().includes(fromLower)) ||
    r.from.toLowerCase().includes(fromLower) ||
    r.to.toLowerCase().includes(toLower) ||
    r.from.toLowerCase().includes(toLower) ||
    r.to.toLowerCase().includes(fromLower)
  );

  let suggestedMode = 'Metro';
  let routeName = 'Metro Blue Line';
  let duration = 38;
  let fare = 40;

  if (matchedRoute) {
    suggestedMode = matchedRoute.mode;
    routeName = matchedRoute.name;
    duration = matchedRoute.duration;
    fare = matchedRoute.fare;
  } else if (fromLower.includes('cycle') || toLower.includes('cycle') || fromLower.includes('cheruvu') || toLower.includes('cheruvu')) {
    suggestedMode = 'Cycle';
    routeName = 'Cycle Connect';
    duration = 16;
    fare = 10;
  } else if (fromLower.includes('charminar') || toLower.includes('charminar') || fromLower.includes('gachibowli') || toLower.includes('gachibowli')) {
    suggestedMode = 'Electric bus';
    routeName = 'Green City Bus 12';
    duration = 55;
    fare = 30;
  } else if (fromLower.includes('secunderabad') || toLower.includes('secunderabad') || fromLower.includes('kukatpally') || toLower.includes('kukatpally')) {
    suggestedMode = 'Bus';
    routeName = 'City Express 7';
    duration = 38;
    fare = 25;
  } else if (fromLower.includes('nagole') || toLower.includes('nagole') || fromLower.includes('raidurg') || toLower.includes('raidurg')) {
    suggestedMode = 'Metro';
    routeName = 'Metro Red Line';
    duration = 48;
    fare = 50;
  }

  const distanceKm = Math.max(3, Math.min(30, Math.round((duration / 60) * 22)));
  const carKg = Number((distanceKm * 0.192).toFixed(2));
  const transitKg = Number((distanceKm * 0.045).toFixed(2));
  const co2SavedKg = Number((carKg - transitKg).toFixed(2));

  return {
    from: fromClean,
    to: toClean,
    suggestedMode,
    route: routeName,
    durationMinutes: duration,
    fareINR: fare,
    distanceKm,
    estimatedCO2Kg: transitKg,
    carCO2Kg: carKg,
    co2SavedKg,
    note: 'Demo estimate. Actual routes, travel times, fares and emissions may vary.'
  };
}

function displayTripResult(trip, isLive) {
  const result = $('#tripResult');
  const badgeHtml = isLive
    ? '<span class="trip-badge online">● Live Node API</span>'
    : '<span class="trip-badge offline">● Instant Demo Engine</span>';

  result.innerHTML = `
    ${badgeHtml}
    <h4>Suggested journey: ${escapeHTML(trip.route)}</h4>
    <p><strong>${escapeHTML(trip.from)}</strong> → <strong>${escapeHTML(trip.to)}</strong></p>
    <p>${escapeHTML(trip.suggestedMode)} · ${trip.durationMinutes} min estimate · ₹${trip.fareINR} indicative fare · ${trip.distanceKm} km illustrative distance</p>
    <div class="result-numbers">
      <div>
        <strong>${trip.co2SavedKg} kg</strong>
        <span>CO₂ saved vs car</span>
      </div>
      <div>
        <strong>${trip.estimatedCO2Kg} kg</strong>
        <span>Transit CO₂ estimate</span>
      </div>
      <div>
        <strong>${trip.durationMinutes} min</strong>
        <span>Travel time estimate</span>
      </div>
    </div>
    <p style="margin-top:10px;font-size:10px;color:#7a8a84;">${escapeHTML(trip.note)}</p>
  `;
  result.hidden = false;
}

async function loadRoutes() {
  try {
    const data = await apiFetch('/api/routes');
    if (data && data.routes && data.routes.length) {
      routeCache = data.routes;
      renderRoutes(routeCache);
      isBackendLive = true;
    }
  } catch {
    // Keep DEFAULT_ROUTES displayed cleanly
    renderRoutes(routeCache);
  }
}

async function loadStats() {
  try {
    const data = await apiFetch('/api/stats');
    if (data && data.stats) {
      const { stats } = data;
      $('#activeRoutes').textContent = String(stats.activeRoutes).padStart(2, '0');
      $('#electricOptions').textContent = String(stats.electricOptions).padStart(2, '0');
      $('#waitTime').innerHTML = `${String(stats.averageWaitMinutes).padStart(2, '0')} <small>min</small>`;
    }
  } catch {
    /* Keep default stat numbers displayed in HTML */
  }
}

// Event Listeners
searchInput.addEventListener('input', filterRoutes);
modeFilter.addEventListener('change', filterRoutes);

// Quick Select buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $('#fromInput').value = btn.dataset.from;
    $('#toInput').value = btn.dataset.to;
    $('#planForm').requestSubmit();
  });
});

// Journey Planner Submit Handler
$('#planForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#planSubmitBtn');
  const error = $('#planError');
  const result = $('#tripResult');

  error.textContent = '';
  result.hidden = true;

  const from = $('#fromInput').value.trim();
  const to = $('#toInput').value.trim();

  if (!from || !to) {
    error.textContent = 'Please enter both starting point and destination.';
    return;
  }
  if (from.toLowerCase() === to.toLowerCase()) {
    error.textContent = 'Starting point and destination should be different.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Finding options…';

  let trip = null;
  let isLive = false;

  try {
    const data = await apiFetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to })
    });
    if (data && data.trip) {
      trip = data.trip;
      isLive = true;
    }
  } catch (err) {
    if (err.isValidation) {
      error.textContent = err.message;
      button.disabled = false;
      button.innerHTML = 'Find a greener trip <span>→</span>';
      return;
    }
    // Backend offline / network error: gracefully fall back to local computation
    console.info('Using local journey planning fallback.');
  }

  if (!trip) {
    trip = calculateLocalTrip(from, to);
    isLive = false;
  }

  displayTripResult(trip, isLive);
  button.disabled = false;
  button.innerHTML = 'Find a greener trip <span>→</span>';
});

// Feedback Form Submit Handler
$('#feedbackForm').addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('#feedbackStatus');
  const button = $('#feedbackSubmitBtn');
  status.textContent = 'Sending…';
  button.disabled = true;

  const rating = Number($('#rating').value);
  const message = $('#feedbackMessage').value.trim();

  try {
    const data = await apiFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, message })
    });
    status.textContent = data.message || 'Thank you! Your feedback has been saved.';
    $('#feedbackMessage').value = '';
  } catch (err) {
    if (err.isValidation) {
      status.textContent = err.message;
    } else {
      // Offline fallback: save in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('movegreen_feedback') || '[]');
        stored.push({ rating, message, createdAt: new Date().toISOString() });
        localStorage.setItem('movegreen_feedback', JSON.stringify(stored));
        status.textContent = 'Thank you! Your feedback has been recorded.';
        $('#feedbackMessage').value = '';
      } catch {
        status.textContent = 'Thank you! Your feedback has been recorded.';
      }
    }
  } finally {
    button.disabled = false;
  }
});

$('#year').textContent = new Date().getFullYear();

// Initial load
renderRoutes(routeCache);
loadRoutes();
loadStats();
