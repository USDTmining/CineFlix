// ============================================
// CINEFLIX - App controller (uses OnBox utils.js: TMDB, AppState, UI, PlayerManager,
// SeasonManager, AuthManager, ThemeManager, FirebaseManager)
// ============================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" fill="#e9edf7"><path d="M6 3.8v16.4a1 1 0 001.5.9l13.2-8.2a1 1 0 000-1.8L7.5 2.9A1 1 0 006 3.8z"/></svg>';
const KEB = '<svg viewBox="0 0 24 24" fill="#cfd6e8"><circle cx="12" cy="4.5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19.5" r="2.2"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4l8 8-8 8"/></svg>';

const FILTERS = {
  movie: [['trending', 'Trending', '/trending/movie/day'], ['popular', 'Popular', '/movie/popular'], ['now', 'Now Playing', '/movie/now_playing'], ['upcoming', 'Upcoming', '/movie/upcoming'], ['top', 'Top Rated', '/movie/top_rated']],
  tv: [['trending', 'Trending', '/trending/tv/day'], ['popular', 'Popular', '/tv/popular'], ['air', 'On The Air', '/tv/on_the_air'], ['today', 'Airing Today', '/tv/airing_today'], ['top', 'Top Rated', '/tv/top_rated']]
};
const GENRES = { movie: [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37], tv: [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10765, 10766, 10768, 37] };
const TITLES = { movies: 'Movies', tv: 'TV Shows', explore: 'Explore', genres: 'Genres', watchlist: 'Watchlist', search: 'Search', history: 'Continue Watching' };

const INFO = {};                       // cache: "type:id" -> { meta, thumb, runtime }
const G = { mode: 'movies', type: 'movie', filter: 'trending', genre: null, page: 1, total: 1, q: '' };
const HERO = { items: [], i: 0, timer: null };
let CW = [];                           // continue-watching items currently rendered

const metaOf = (m, type) => {
  const g = (m.genre_ids || (m.genres || []).map(x => x.id) || []).slice(0, 2).map(UI.getGenreName).join(', ');
  return g || (type === 'tv' ? 'TV Show' : 'Movie');
};
const remember = (m, type) => {
  const t = m.media_type || type;
  INFO[`${t}:${m.id}`] = Object.assign(INFO[`${t}:${m.id}`] || {}, {
    thumb: m.backdrop_path ? TMDB.image(m.backdrop_path, 'w500') : null,
    meta: INFO[`${t}:${m.id}`]?.meta?.includes('•') ? INFO[`${t}:${m.id}`].meta : metaOf(m, t)
  });
  return t;
};
const posterOf = (m, size = 'w342') => TMDB.image(m.poster_path, size);

// ---------- cards ----------
function posterCard(m, type) {
  const t = remember(m, type);
  return `<article class="poster" data-open="${m.id}:${t}"><img loading="lazy" src="${posterOf(m)}" alt="${esc(m.title || m.name)}" onerror="this.onerror=null;UI.setImageFallback(this,'poster')"><span class="rate">${STAR}${(m.vote_average || 0).toFixed(1)}</span></article>`;
}
function gridCard(m, type) {
  const t = remember(m, type);
  const date = m.release_date || m.first_air_date;
  return `<div class="gcard" data-open="${m.id}:${t}"><div class="gposter"><img loading="lazy" src="${posterOf(m)}" alt="" onerror="this.onerror=null;UI.setImageFallback(this,'poster')"><span class="rate">${STAR}${(m.vote_average || 0).toFixed(1)}</span></div><h5>${esc(m.title || m.name)}</h5><small>${UI.getYear(date)} • ${t === 'tv' ? 'TV' : 'Movie'}</small></div>`;
}
const skeleton = n => Array(n).fill('<div class="gcard"><div class="gposter skeleton"></div></div>').join('');

// ---------- router (hash based: #home #movies #tv #explore #genres #watchlist #search #downloads #more #ai #movie/123 #tv/123) ----------
function nav(h) { if (location.hash.slice(1) === h) route(); else location.hash = h; }
function show(view) { $$('.view').forEach(v => v.classList.toggle('on', v.id === 'view-' + view)); }
function setNav(name) { $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === name)); }

function route() {
  const [a, b] = (location.hash.slice(1) || 'home').split('/');
  PlayerManager.close(); SeasonManager.hide(); AuthManager.hide(); closeDrawer(); hideKmenu();
  window.scrollTo(0, 0);
  if (a === 'movie' || a === 'tv') { show('detail'); setNav(''); return showDetail(a, b); }
  if (['movies', 'tv', 'explore', 'genres', 'watchlist', 'search', 'history'].includes(a)) { show('grid'); setNav(['watchlist', 'history'].includes(a) ? '' : a === 'search' ? 'explore' : 'explore'); return openGrid(a); }
  if (a === 'downloads' || a === 'more' || a === 'ai') { show(a); setNav(a === 'ai' ? 'more' : a); if (a === 'more') renderMore(); return; }
  show('home'); setNav('home'); loadHome();
}

// ---------- home ----------
let homeLoaded = false;
async function loadHome() {
  renderContinue();
  if (homeLoaded) return;
  homeLoaded = true;
  const [hero, trend] = await Promise.all([TMDB.fetch('/trending/movie/day'), TMDB.fetch('/trending/all/week')]);
  if (hero?.results) { HERO.items = hero.results.filter(m => m.backdrop_path).slice(0, 5); drawHero(0); startHero(); }
  if (trend?.results) $('#trending').innerHTML = trend.results.filter(m => m.media_type !== 'person').slice(0, 12).map(m => posterCard(m)).join('');
}
function drawHero(i) {
  const m = HERO.items[i]; if (!m) return;
  HERO.i = i;
  const bg = $('#hbg'); bg.style.opacity = 0;
  setTimeout(() => { bg.style.backgroundImage = `url(${TMDB.image(m.backdrop_path, 'w1280')})`; bg.style.opacity = 1; }, 220);
  const t = $('#h-title'); t.textContent = m.title; t.classList.toggle('long', m.title.length > 14);
  $('#h-sub').textContent = [UI.getYear(m.release_date), (m.genre_ids || []).slice(0, 1).map(UI.getGenreName)[0]].filter(Boolean).join(' • ').toUpperCase();
  $('#h-desc').textContent = m.overview || '';
  $('#h-dots').innerHTML = HERO.items.map((_, k) => `<i class="${k === i ? 'on' : ''}" data-act="dot" data-i="${k}"></i>`).join('');
  updateHeroList();
}
function updateHeroList() {
  const m = HERO.items[HERO.i]; if (!m) return;
  const saved = AppState.isInWatchlist(m.id, 'movie');
  $('#list-ico').innerHTML = saved ? '<path d="M5 13l4 4L19 7"/>' : '<path d="M12 4v16M4 12h16"/>';
  $('#list-txt').textContent = saved ? 'In List' : 'My List';
}
function startHero() { clearInterval(HERO.timer); HERO.timer = setInterval(() => drawHero((HERO.i + 1) % HERO.items.length), 6000); }
document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(HERO.timer) : HERO.items.length && startHero());

function renderContinue() {
  CW = AppState.getContinueWatching();
  const sec = $('#continue-section');
  sec.style.display = CW.length ? 'block' : 'none';
  $('#continue-list').innerHTML = CW.map((it, i) => {
    const info = INFO[`${it.type}:${it.id}`] || {};
    const img = it.thumb || info.thumb || it.poster || '';
    const meta = it.meta || info.meta || (it.type === 'tv' && it.season ? `S${it.season} E${it.episode || 1}` : it.type === 'tv' ? 'TV Show' : 'Movie');
    const p = Math.round(Math.min(100, Math.max(0, it.progress || 5)));
    return `<article class="watch" data-resume="${i}"><div class="thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="play">${PLAY}</span></div><h4>${esc(it.title)}</h4><div class="meta">${esc(meta)}${it.type === 'tv' && it.season ? ` • S${it.season}E${it.episode || 1}` : ''}</div><button class="kebab" data-act="kebab" data-i="${i}" aria-label="More">${KEB}</button><div class="prog"><i style="width:${p}%"></i></div><span class="pct">${p}%</span></article>`;
  }).join('');
}
window.HomePage = { renderContinueWatching: () => { if ($('#view-home').classList.contains('on')) renderContinue(); } };

// ---------- grid pages ----------
function openGrid(mode) {
  if (mode === 'movies' || mode === 'tv') { G.type = mode === 'tv' ? 'tv' : 'movie'; G.filter = 'trending'; }
  else if (mode === 'explore' && G.mode !== 'explore') G.filter = 'popular';
  if (mode === 'genres' && G.mode !== 'genres') G.genre = null;
  G.mode = mode; G.page = 1;
  $('#g-title').textContent = TITLES[mode];
  $('#g-search').style.display = mode === 'search' ? 'flex' : 'none';
  if (mode === 'search') { $('#q').value = G.q; setTimeout(() => $('#q').focus(), 50); }
  renderChips();
  loadGrid(true);
}
function renderChips() {
  const m = G.mode, seg = $('#g-seg'), chips = $('#g-chips');
  seg.style.display = (m === 'explore' || m === 'genres') ? 'flex' : 'none';
  seg.innerHTML = [['movie', 'Movies'], ['tv', 'TV Shows']].map(([k, l]) => `<button class="${G.type === k ? 'on' : ''}" data-act="seg" data-k="${k}">${l}</button>`).join('');
  let html = '';
  if (m === 'genres') html = GENRES[G.type].map(id => `<button class="chip ${G.genre == id ? 'on' : ''}" data-act="genre" data-k="${id}">${UI.getGenreName(id)}</button>`).join('');
  else if (['movies', 'tv', 'explore'].includes(m)) html = FILTERS[G.type].map(f => `<button class="chip ${G.filter === f[0] ? 'on' : ''}" data-act="chip" data-k="${f[0]}">${f[1]}</button>`).join('');
  chips.innerHTML = html; chips.style.display = html ? 'flex' : 'none';
}
async function loadGrid(reset) {
  const grid = $('#g-grid'), more = $('#g-more'), empty = $('#g-empty');
  empty.style.display = 'none'; more.style.display = 'none';
  if (reset) grid.innerHTML = skeleton(9);
  const mode = G.mode;
  if (mode === 'watchlist') {
    if (!AppState.watchlist.length) { grid.innerHTML = ''; return showEmpty('Your watchlist is empty', 'Tap “My List” on any title to save it here.'); }
    const items = await Promise.all(AppState.watchlist.map(async w => { const d = await TMDB.fetch(`/${w.type}/${w.id}`); return d ? gridCard(d, w.type) : ''; }));
    grid.innerHTML = items.join(''); return;
  }
  if (mode === 'history') {
    const h = AppState.watchHistory;
    if (!h.length) { grid.innerHTML = ''; return showEmpty('Nothing watched yet', 'Titles you play will show up here.'); }
    grid.innerHTML = h.map(it => `<div class="gcard" data-open="${it.id}:${it.type}"><div class="gposter"><img src="${esc(it.poster || '')}" alt="" onerror="this.onerror=null;UI.setImageFallback(this,'poster')"><span class="rate">${Math.round(it.progress || 0)}%</span></div><h5>${esc(it.title)}</h5><small>${it.type === 'tv' && it.season ? `S${it.season} E${it.episode}` : it.type === 'tv' ? 'TV' : 'Movie'}</small></div>`).join('');
    return;
  }
  let ep, params = { page: G.page };
  if (mode === 'search') {
    if (G.q.length < 3) { grid.innerHTML = ''; return showEmpty('Search Cineflix', 'Type at least 3 letters to find movies and TV shows.'); }
    ep = '/search/multi'; params.query = G.q;
  } else if (mode === 'genres') {
    if (!G.genre) { grid.innerHTML = ''; return showEmpty('Pick a genre', 'Choose a genre above to browse titles.'); }
    ep = `/discover/${G.type}`; params.with_genres = G.genre; params.sort_by = 'popularity.desc';
  } else ep = (FILTERS[G.type].find(f => f[0] === G.filter) || FILTERS[G.type][0])[2];
  const d = await TMDB.fetch(ep, params);
  if (!d || mode !== G.mode) return;
  let res = d.results || [];
  if (mode === 'search') res = res.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  if (reset) grid.innerHTML = '';
  if (!res.length && reset) return showEmpty('No results found', 'Try different keywords.');
  grid.insertAdjacentHTML('beforeend', res.map(m => gridCard(m, G.type)).join(''));
  G.total = d.total_pages || 1;
  more.style.display = G.page < Math.min(G.total, 500) ? 'flex' : 'none';
}
function showEmpty(t, s) { const e = $('#g-empty'); e.innerHTML = `<h3>${t}</h3><p>${s}</p>`; e.style.display = 'block'; }
$('#q')?.addEventListener('input', UI.debounce(e => { G.q = e.target.value.trim(); G.page = 1; loadGrid(true); }, 500));

// ---------- detail ----------
async function showDetail(type, id) {
  const root = $('#detail');
  root.innerHTML = '<div class="spin"></div>';
  AppState.setDetail(+id, type);
  const d = await TMDB.fetch(`/${type}/${id}`, { append_to_response: 'credits,recommendations' });
  if (!d) { root.innerHTML = '<div class="empty"><h3>Could not load this title</h3><p>Check your connection and try again.</p></div>'; return; }
  const title = d.title || d.name || 'Untitled';
  const rt = d.runtime || (d.episode_run_time || [])[0];
  const genres = (d.genres || []).map(g => g.name);
  INFO[`${type}:${id}`] = { thumb: d.backdrop_path ? TMDB.image(d.backdrop_path, 'w500') : null, runtime: rt, meta: `${rt ? UI.formatRuntime(rt) + ' • ' : ''}${genres.slice(0, 2).join(', ') || (type === 'tv' ? 'TV Show' : 'Movie')}` };
  const cast = (d.credits?.cast || []).slice(0, 10);
  const rec = (d.recommendations?.results || []).slice(0, 12);
  const seasons = type === 'tv' ? (d.seasons || []).filter(s => s.season_number > 0) : [];
  root.innerHTML = `
    <button class="back" data-act="back" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l-8 8 8 8"/></svg></button>
    <div class="dhero"><img src="${TMDB.image(d.backdrop_path || d.poster_path, 'w780')}" alt=""><b></b></div>
    <div class="dmain"><img id="detail-poster-img" class="dposter" src="${posterOf(d, 'w342')}" alt="">
      <div class="dinfo"><h2>${esc(title)}</h2><div class="dmeta"><span class="rt">${STAR}${(d.vote_average || 0).toFixed(1)}</span><span>${UI.getYear(d.release_date || d.first_air_date)}</span><span>${UI.formatRuntime(rt)}</span></div>
      <div class="chips-wrap">${genres.map(g => `<span class="gtag">${esc(g)}</span>`).join('')}</div></div></div>
    <div class="dbtns"><button class="btn primary" data-act="d-play"><svg viewBox="0 0 24 24" fill="#fff"><path d="M6 3.8v16.4a1 1 0 001.5.9l13.2-8.2a1 1 0 000-1.8L7.5 2.9A1 1 0 006 3.8z"/></svg>Play</button>
      <button class="btn ghost" id="d-wl" data-act="d-list"></button><button class="btn ghost sq" data-act="d-share" aria-label="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4"/></svg></button></div>
    <p class="dover">${esc(d.overview || 'No overview available.')}</p>
    <div class="dstats">${[[d.status || '-', 'Status'], [UI.formatNumber(d.vote_count), 'Votes'], [type === 'tv' ? (d.number_of_seasons || '-') : UI.formatCurrency(d.budget), type === 'tv' ? 'Seasons' : 'Budget'], [type === 'tv' ? (d.number_of_episodes || '-') : UI.formatCurrency(d.revenue), type === 'tv' ? 'Episodes' : 'Revenue']].map(s => `<div><b>${esc(s[0])}</b><small>${s[1]}</small></div>`).join('')}</div>
    ${seasons.length ? `<div class="sec sm"><h3>Seasons</h3></div><div class="chips">${seasons.map(s => `<button class="chip" data-act="season" data-n="${s.season_number}">${esc(s.name)}</button>`).join('')}</div>` : ''}
    ${cast.length ? `<div class="sec sm"><h3>Cast</h3></div><div class="row cast">${cast.map(p => `<div class="cc"><img loading="lazy" src="${p.profile_path ? TMDB.image(p.profile_path, 'w200') : ''}" alt="" onerror="this.onerror=null;UI.setImageFallback(this,'avatar')"><h6>${esc(p.name)}</h6><small>${esc(p.character || '')}</small></div>`).join('')}</div>` : ''}
    ${rec.length ? `<div class="sec sm"><h3>More Like This</h3></div><div class="row">${rec.map(m => posterCard(m, type)).join('')}</div>` : ''}`;
  root.dataset.title = title; root.dataset.poster = posterOf(d);
  updateDetailList();
}
function updateDetailList() {
  const b = $('#d-wl'), c = AppState.currentDetail; if (!b || !c) return;
  const s = AppState.isInWatchlist(c.id, c.type);
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${s ? '<path d="M5 13l4 4L19 7"/>' : '<path d="M12 4v16M4 12h16"/>'}</svg>${s ? 'In List' : 'My List'}`;
}
function toggleList(id, type, title) {
  if (AppState.isInWatchlist(id, type)) { AppState.removeFromWatchlist(id, type); UI.showToast('Removed from watchlist', 'info'); }
  else { AppState.addToWatchlist({ id, type, title }); UI.showToast('Added to watchlist', 'success'); }
  updateHeroList(); updateDetailList();
}

// ---------- player + continue-watching progress ----------
// Embed players don't report playback time, so progress is estimated from time the player stays open.
const _open = PlayerManager.open.bind(PlayerManager);
let progTimer = null;
PlayerManager.open = function (id, type = 'movie', title = '', season = null, episode = null, poster = null) {
  if (type === 'tv' && !season) { season = 1; episode = 1; }
  _open(id, type, title, season, episode, poster);
  const info = INFO[`${type}:${id}`] || {};
  const e = AppState.watchHistory.find(h => h.id == id && h.type === type && (type !== 'tv' || (h.season === season && h.episode === episode)));
  if (e) { e.thumb = info.thumb || e.thumb; e.meta = info.meta || e.meta; AppState.saveHistory(); }
  clearInterval(progTimer);
  const mins = info.runtime || (type === 'tv' ? 45 : 120);
  progTimer = setInterval(() => {
    const h = AppState.watchHistory.find(x => x.id == id && x.type === type && (type !== 'tv' || (x.season === season && x.episode === episode)));
    if (h) AppState.updateProgress(h.id, type, (h.progress || 5) + (20 / (mins * 60)) * 100, season, episode);
  }, 20000);
};
const _close = PlayerManager.close.bind(PlayerManager);
PlayerManager.close = function () { const was = $('#player-modal')?.classList.contains('active'); _close(); clearInterval(progTimer); if (was) window.HomePage.renderContinueWatching(); };

// ---------- kebab menu on Continue Watching ----------
let kIndex = -1;
function showKmenu(btn, i) {
  const m = $('#kmenu'), r = btn.getBoundingClientRect(), app = $('.app').getBoundingClientRect();
  kIndex = i; m.style.top = r.bottom + 6 + 'px'; m.style.left = Math.min(r.right - 150, app.right - 160) + 'px'; m.classList.add('on');
}
function hideKmenu() { $('#kmenu')?.classList.remove('on'); }

// ---------- drawer / more ----------
const openDrawer = () => { $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); };
function closeDrawer() { $('#drawer')?.classList.remove('on'); $('#scrim')?.classList.remove('on'); }
function renderMore() {
  const user = AppState.currentUser, dark = document.body.getAttribute('data-theme') !== 'light';
  $('#more-list').innerHTML = `
    <button class="mrow" data-act="theme"><i id="theme-icon" class="fas ${dark ? 'fa-moon' : 'fa-sun'}"></i><span>Theme<small>${dark ? 'Dark' : 'Light'} mode</small></span>${CHEV}</button>
    <button class="mrow" data-act="profile"><i class="fas fa-user"></i><span>${user ? 'Account' : 'Sign in'}<small>${user ? esc(user.email || 'Signed in') : 'Sync your watchlist & history'}</small></span>${CHEV}</button>
    <button class="mrow" data-nav="ai"><i class="fas fa-wand-magic-sparkles"></i><span>AI Movie Generator<small>Coming soon</small></span>${CHEV}</button>
    <button class="mrow" data-nav="history"><i class="fas fa-clock-rotate-left"></i><span>Watch history<small>${AppState.watchHistory.length} titles</small></span>${CHEV}</button>
    <button class="mrow" data-act="clear"><i class="fas fa-trash"></i><span>Clear watch history<small>Removes Continue Watching</small></span>${CHEV}</button>
    <button class="mrow" data-act="install" id="install-row" style="display:${deferredPrompt ? 'flex' : 'none'}"><i class="fas fa-download"></i><span>Install app<small>Add Cineflix to your home screen</small></span>${CHEV}</button>
    <div class="mfoot">Cineflix • Data from TMDB • ${PlayerManager.sources.length} playback sources</div>`;
}
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; const b = $('#dl-install'); if (b) b.style.display = 'flex'; renderMoreIfOpen(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; $('#dl-install').style.display = 'none'; });
const renderMoreIfOpen = () => { if ($('#view-more').classList.contains('on')) renderMore(); };

// ---------- actions ----------
function act(name, el) {
  const d = el.dataset, h = HERO.items[HERO.i];
  switch (name) {
    case 'menu': return openDrawer();
    case 'close-drawer': return closeDrawer();
    case 'search': return nav('search');
    case 'profile': return AuthManager.show();
    case 'dot': drawHero(+d.i); return startHero();
    case 'hero-play': return h && PlayerManager.open(h.id, 'movie', h.title, null, null, posterOf(h));
    case 'hero-list': return h && toggleList(h.id, 'movie', h.title);
    case 'see-trending': return nav('movies');
    case 'see-continue': return nav('history');
    case 'chip': G.filter = d.k; G.page = 1; renderChips(); return loadGrid(true);
    case 'genre': G.genre = d.k; G.page = 1; renderChips(); return loadGrid(true);
    case 'seg': G.type = d.k; G.filter = G.mode === 'explore' ? 'popular' : 'trending'; G.genre = null; G.page = 1; renderChips(); return loadGrid(true);
    case 'more': G.page++; return loadGrid(false);
    case 'back': return history.length > 1 ? history.back() : nav('home');
    case 'd-play': { const c = AppState.currentDetail, r = $('#detail'); return PlayerManager.open(c.id, c.type, r.dataset.title, null, null, r.dataset.poster); }
    case 'd-list': { const c = AppState.currentDetail; return toggleList(c.id, c.type, $('#detail').dataset.title); }
    case 'd-share': { const u = location.href, t = $('#detail').dataset.title; return navigator.share ? navigator.share({ title: t, url: u }).catch(() => { }) : navigator.clipboard.writeText(u).then(() => UI.showToast('Link copied to clipboard!', 'success')); }
    case 'season': return TMDB.fetch(`/tv/${AppState.currentDetail.id}/season/${d.n}`).then(s => s && SeasonManager.show(+d.n, s, AppState.currentDetail.id, ($('#detail').dataset.title || '').replace(/['"\\]/g, '')));
    case 'kebab': return showKmenu(el, +d.i);
    case 'k-remove': { const it = CW[kIndex]; if (it) { AppState.removeFromHistory(it.id, it.type, it.season, it.episode); renderContinue(); } return hideKmenu(); }
    case 'k-info': { const it = CW[kIndex]; hideKmenu(); return it && nav(`${it.type}/${it.id}`); }
    case 'theme': ThemeManager.toggle(); return renderMore();
    case 'clear': if (confirm('Clear your watch history?')) { AppState.watchHistory = []; AppState.saveHistory(); renderMore(); UI.showToast('Watch history cleared', 'info'); } return;
    case 'install': return installApp();
    case 'ai-go': { const v = $('#ai-prompt').value.trim(); return v ? UI.showToast('AI Movie Generator is coming soon! Stay tuned.', 'info', 4000) : (UI.showToast('Please enter a prompt first', 'warning'), $('#ai-prompt').focus()); }
    case 'p-close': return PlayerManager.close();
    case 'p-prev': return PlayerManager.prevSource();
    case 'p-next': return PlayerManager.switchSource();
    case 'p-full': return PlayerManager.toggleFullscreen();
    case 'a-toggle': return AuthManager.toggleMode();
    case 'a-close': return AuthManager.hide();
    case 's-close': return SeasonManager.hide();
  }
}
async function installApp() {
  if (!deferredPrompt) return UI.showToast('Use your browser menu → “Add to Home Screen”.', 'info', 4000);
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#dl-install').style.display = 'none';
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-open],[data-nav],[data-resume]');
  if (!e.target.closest('#kmenu,[data-act="kebab"]')) hideKmenu();
  if (!el) return;
  const d = el.dataset;
  if (d.act) return act(d.act, el);
  if (d.open) { const [id, t] = d.open.split(':'); return nav(`${t}/${id}`); }
  if (d.nav) return nav(d.nav);
  if (d.resume !== undefined) { const it = CW[+d.resume]; if (it) PlayerManager.open(it.id, it.type, it.title, it.season, it.episode, it.poster); }
});

// hero swipe
let tx = null;
$('#hero')?.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
$('#hero')?.addEventListener('touchend', e => {
  if (tx === null || !HERO.items.length) return;
  const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(dx) > 40) { drawHero((HERO.i + (dx < 0 ? 1 : HERO.items.length - 1)) % HERO.items.length); startHero(); }
}, { passive: true });

// auth avatar + modal wiring
const _ui = AuthManager.updateUI.bind(AuthManager);
AuthManager.updateUI = function () {
  _ui();
  const u = AppState.currentUser, i = $('#profileBtn i');
  if (i) { i.textContent = u ? (u.displayName || u.email || 'U').charAt(0).toUpperCase() : ''; i.classList.toggle('init', !!u); }
  renderMoreIfOpen();
};
$('#auth-form')?.addEventListener('submit', e => AuthManager.handleSubmit(e));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { AuthManager.hide(); PlayerManager.close(); SeasonManager.hide(); closeDrawer(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); nav('search'); }
});
$$('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) { AuthManager.hide(); SeasonManager.hide(); PlayerManager.close(); } }));
$('#ai-prompt')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); act('ai-go'); } });

// boot
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init(); FirebaseManager.init();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => { });
});
