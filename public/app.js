// AllPanel777 Zero-Flicker Real-Time Sportsbook Client

const state = {
  activeSport: 'all',
  activeCategory: 'ALL',
  selectedEventId: null,
  events: [],
  currentEvent: null,
  isFetchingDetail: false
};

const dom = {
  streamStatus: document.getElementById('stream-status'),
  eventsList: document.getElementById('events-list'),
  eventsCount: document.getElementById('events-count'),
  eventBanner: document.getElementById('event-banner'),
  categoryFilters: document.getElementById('category-filters'),
  marketsContainer: document.getElementById('markets-container')
};

function init() {
  setupEventListeners();
  connectSSE();
  fetchEvents(true);
}

function connectSSE() {
  const evtSource = new EventSource('/api/stream');

  evtSource.onopen = () => {
    dom.streamStatus.innerHTML = `<span class="ap-dot"></span> REAL-TIME STREAM LIVE (0.2s)`;
  };

  evtSource.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'LIVE_UPDATE') {
        // Smooth background refresh without full page rebuilds
        await refreshLiveStateSilently();
      }
    } catch (e) {}
  };

  evtSource.onerror = () => {
    dom.streamStatus.innerHTML = `<span class="ap-dot" style="background:#ff3b30;"></span> RECONNECTING...`;
  };
}

async function refreshLiveStateSilently() {
  await fetchEvents(false);
  if (state.selectedEventId) {
    await fetchEventDetail(state.selectedEventId, false);
  }
}

async function fetchEvents(showLoading = true) {
  try {
    const res = await fetch(`/api/events?sport=${state.activeSport}&t=${Date.now()}`);
    const data = await res.json();
    let events = data.events || [];

    // Prioritize events with active markets
    events.sort((a, b) => {
      const weightA = (a.hasBookmaker ? 4 : 0) + (a.hasFancy ? 4 : 0) + (a.marketCount > 0 ? 2 : 0) + (a.isInPlay ? 1 : 0);
      const weightB = (b.hasBookmaker ? 4 : 0) + (b.hasFancy ? 4 : 0) + (b.marketCount > 0 ? 2 : 0) + (b.isInPlay ? 1 : 0);
      return weightB - weightA;
    });

    state.events = events;
    renderSidebar();

    const isSelectedInList = state.events.some(e => String(e.eventId) === String(state.selectedEventId));
    if ((!state.selectedEventId || !isSelectedInList) && state.events.length > 0) {
      const bestEvent = state.events.find(e => e.hasBookmaker || e.hasFancy || e.marketCount > 0) || state.events[0];
      state.selectedEventId = String(bestEvent.eventId);
      renderSidebar();
      await fetchEventDetail(state.selectedEventId, showLoading);
    }
  } catch (err) {}
}

function renderSidebar() {
  dom.eventsCount.innerText = `${state.events.length} Active`;

  if (state.events.length === 0) {
    dom.eventsList.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--ap-text-muted);">No active matches found.</div>`;
    return;
  }

  dom.eventsList.innerHTML = state.events.map(ev => `
    <div class="ap-event-card ${String(ev.eventId) === String(state.selectedEventId) ? 'selected' : ''}" onclick="selectEvent('${ev.eventId}')">
      <div class="ap-event-meta">
        <span>${ev.sportName.toUpperCase()} • ${ev.competitionName}</span>
        <span style="color:var(--ap-gold);">ID: ${ev.eventId}</span>
      </div>
      <div class="ap-event-title">${ev.eventName}</div>
      <div class="ap-badges">
        ${ev.isInPlay ? `<span class="ap-badge-inplay">IN-PLAY</span>` : `<span style="font-size:0.65rem; color:var(--ap-text-muted);">${ev.openDateStr}</span>`}
        ${ev.hasBookmaker ? `<span class="ap-badge-market">BM</span>` : ''}
        ${ev.hasFancy ? `<span class="ap-badge-market">FANCY</span>` : ''}
        <span style="margin-left:auto; font-size:0.65rem; color:${ev.marketCount > 0 ? 'var(--ap-green)' : 'var(--ap-text-muted)'}; font-weight:800;">
          ${ev.marketCount > 0 ? `${ev.marketCount} Markets` : '0 Markets'}
        </span>
      </div>
    </div>
  `).join('');
}

function selectEvent(eventId) {
  state.selectedEventId = String(eventId);
  renderSidebar();
  fetchEventDetail(eventId, true);
}

async function fetchEventDetail(eventId, showLoading = true) {
  if (state.isFetchingDetail && !showLoading) return;
  state.isFetchingDetail = true;

  if (showLoading) {
    dom.marketsContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading live odds...</div>`;
  }

  try {
    const res = await fetch(`/api/event/${eventId}?category=${state.activeCategory}&t=${Date.now()}`);

    if (!res.ok) {
      state.events = state.events.filter(e => String(e.eventId) !== String(eventId));
      renderSidebar();
      if (state.events.length > 0) {
        state.selectedEventId = String(state.events[0].eventId);
        state.isFetchingDetail = false;
        return fetchEventDetail(state.selectedEventId, true);
      }
      return;
    }

    const data = await res.json();
    state.currentEvent = data.event;
    dom.categoryFilters.style.display = 'flex';
    renderEventHeader(data.event);
    renderMarkets(data.event.markets || []);
  } catch (err) {
  } finally {
    state.isFetchingDetail = false;
  }
}

function renderEventHeader(ev) {
  dom.eventBanner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="display:flex; gap:0.5rem; margin-bottom:0.4rem; align-items:center;">
          ${ev.isInPlay ? `<span class="ap-badge-inplay">IN-PLAY LIVE</span>` : `<span class="ap-badge-market">UPCOMING</span>`}
          <span style="font-size:0.7rem; font-weight:800; color:var(--ap-gold);">SPORT: ${ev.sportName.toUpperCase()}</span>
          <span style="font-size:0.7rem; font-weight:800; color:var(--ap-text-muted);">ID: ${ev.eventId}</span>
        </div>
        <div class="ap-banner-title">${ev.eventName}</div>
        <div class="ap-banner-info">
          <span>League: <strong>${ev.competitionName}</strong></span>
          <span>Open: <strong>${ev.openDateStr}</strong></span>
          <span>Active Markets: <strong>${ev.markets.length}</strong></span>
        </div>
      </div>
    </div>
  `;
}

function renderMarkets(markets) {
  if (!markets || markets.length === 0) {
    dom.marketsContainer.innerHTML = `
      <div class="ap-empty-state">
        <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:0.5rem; color:var(--ap-gold);"></i>
        <h3>No Active Markets Currently Available for this Match</h3>
        <p>Pre-match or in-play odds for this event are updating. Select another match from the left.</p>
      </div>
    `;
    return;
  }

  dom.marketsContainer.innerHTML = markets.map(m => {
    const category = m.category || 'MATCH_ODDS';

    // 1. MATCH ODDS / 1x2 EXCHANGE MARKETS
    if (category === 'MATCH_ODDS') {
      const selections = m.selections || [];
      return `
        <div class="ap-market-section">
          <div class="ap-market-head">
            <h3><i class="fa-solid fa-chart-simple" style="color:var(--ap-cyan);"></i> ${m.marketName}</h3>
            <span class="ap-market-tag">MATCH ODDS</span>
          </div>

          <table class="ap-odds-table">
            <thead>
              <tr>
                <th style="text-align:left;">Runner / Team</th>
                <th class="back-col" colspan="3">Back (Bet For)</th>
                <th class="lay-col" colspan="3">Lay (Bet Against)</th>
              </tr>
            </thead>
            <tbody>
              ${selections.map(s => {
                const backArr = (s.availableToBack || []).slice().sort((a, b) => a.price - b.price);
                let b1 = null, b2 = null, b3Best = null;
                if (backArr.length === 1) b3Best = backArr[0];
                else if (backArr.length === 2) { b2 = backArr[0]; b3Best = backArr[1]; }
                else if (backArr.length >= 3) { b1 = backArr[backArr.length - 3]; b2 = backArr[backArr.length - 2]; b3Best = backArr[backArr.length - 1]; }

                const layArr = (s.availableToLay || []).slice().sort((a, b) => a.price - b.price);
                let l4Best = null, l5 = null, l6 = null;
                if (layArr.length >= 1) l4Best = layArr[0];
                if (layArr.length >= 2) l5 = layArr[1];
                if (layArr.length >= 3) l6 = layArr[2];

                return `
                  <tr>
                    <td class="ap-runner-name">${s.runnerName}</td>
                    
                    <td style="width:70px; text-align:center;">${b1 ? `<div class="ap-odds-btn back"><span class="ap-price">${b1.price}</span><span class="ap-size">${b1.size}</span></div>` : '-'}</td>
                    <td style="width:70px; text-align:center;">${b2 ? `<div class="ap-odds-btn back"><span class="ap-price">${b2.price}</span><span class="ap-size">${b2.size}</span></div>` : '-'}</td>
                    <td style="width:75px; text-align:center;">${b3Best ? `<div class="ap-odds-btn back" style="transform:scale(1.05); font-weight:900;"><span class="ap-price">${b3Best.price}</span><span class="ap-size">${b3Best.size}</span></div>` : '-'}</td>

                    <td style="width:75px; text-align:center;">${l4Best ? `<div class="ap-odds-btn lay" style="transform:scale(1.05); font-weight:900;"><span class="ap-price">${l4Best.price}</span><span class="ap-size">${l4Best.size}</span></div>` : '-'}</td>
                    <td style="width:70px; text-align:center;">${l5 ? `<div class="ap-odds-btn lay"><span class="ap-price">${l5.price}</span><span class="ap-size">${l5.size}</span></div>` : '-'}</td>
                    <td style="width:70px; text-align:center;">${l6 ? `<div class="ap-odds-btn lay"><span class="ap-price">${l6.price}</span><span class="ap-size">${l6.size}</span></div>` : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 2. BOOKMAKER MARKETS
    if (category === 'BOOKMAKER') {
      const selections = m.selections || [];
      return `
        <div class="ap-market-section">
          <div class="ap-market-head">
            <h3><i class="fa-solid fa-book" style="color:var(--ap-gold);"></i> ${m.marketName}</h3>
            <span class="ap-market-tag" style="background:rgba(255,199,0,0.2); color:var(--ap-gold);">BOOKMAKER</span>
          </div>

          <table class="ap-odds-table">
            <thead>
              <tr>
                <th style="text-align:left;">Runner / Team</th>
                <th class="back-col" style="width:140px;">BACK</th>
                <th class="lay-col" style="width:140px;">LAY</th>
              </tr>
            </thead>
            <tbody>
              ${selections.map(s => {
                const hasBack = s.backPrice && s.backPrice !== '';
                const hasLay = s.layPrice && s.layPrice !== '';
                const isSuspended = s.status === 2 || (!hasBack && !hasLay);

                return `
                  <tr>
                    <td class="ap-runner-name">${s.runnerName}</td>
                    <td style="text-align:center;">
                      ${!isSuspended && hasBack ? `
                        <div class="ap-odds-btn back">
                          <span class="ap-price">${parseFloat(s.backPrice).toFixed(0)}</span>
                        </div>
                      ` : `<div class="ap-odds-btn suspended"><span class="ap-price" style="font-size:0.75rem;">SUSPENDED</span></div>`}
                    </td>
                    <td style="text-align:center;">
                      ${!isSuspended && hasLay ? `
                        <div class="ap-odds-btn lay">
                          <span class="ap-price">${parseFloat(s.layPrice).toFixed(0)}</span>
                        </div>
                      ` : `<div class="ap-odds-btn suspended"><span class="ap-price" style="font-size:0.75rem;">SUSPENDED</span></div>`}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 3. FANCY BET SESSION MARKETS
    if (category === 'FANCY') {
      const isBallRunning = (m.status !== 2) || (m.runsNo === 0 && m.runsYes === 0 && (m.oddsNo === 0 || m.oddsNo === null));

      const nameLower = (m.marketName || '').toLowerCase();
      let noLabel = `${m.runsNo}`;
      let yesLabel = `${m.runsYes}`;
      if (!nameLower.includes('boundar') && !nameLower.includes('wkt') && !nameLower.includes('wicket')) {
        noLabel = `${m.runsNo} Runs`;
        yesLabel = `${m.runsYes} Runs`;
      }

      return `
        <div class="ap-market-section">
          <div class="ap-market-head">
            <h3><i class="fa-solid fa-star" style="color:var(--ap-gold);"></i> ${m.marketName}</h3>
            <span class="ap-market-tag" style="background:rgba(236,72,153,0.2); color:#ec4899;">FANCY BET</span>
          </div>

          <table class="ap-odds-table">
            <thead>
              <tr>
                <th style="text-align:left;">Session / Special Bet</th>
                <th class="lay-col" style="width:140px;">NOT (NO)</th>
                <th class="back-col" style="width:140px;">YES (BACK)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="ap-runner-name">${m.marketName}</td>
                <td style="text-align:center;">
                  ${isBallRunning ? `<div class="ap-odds-btn suspended"><span class="ap-price" style="font-size:0.75rem;">Ball Run</span></div>` : `
                    <div class="ap-odds-btn lay">
                      <span class="ap-price">${noLabel}</span>
                      <span class="ap-size">${m.oddsNo || 100}</span>
                    </div>
                  `}
                </td>
                <td style="text-align:center;">
                  ${isBallRunning ? `<div class="ap-odds-btn suspended"><span class="ap-price" style="font-size:0.75rem;">Ball Run</span></div>` : `
                    <div class="ap-odds-btn back">
                      <span class="ap-price">${yesLabel}</span>
                      <span class="ap-size">${m.oddsYes || 100}</span>
                    </div>
                  `}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // 4. PREMIUM SPORTSBOOK MARKETS
    const selections = m.selections || [];
    return `
      <div class="ap-market-section">
        <div class="ap-market-head">
          <h3><i class="fa-solid fa-fire" style="color:var(--ap-green);"></i> ${m.marketName}</h3>
          <span class="ap-market-tag" style="background:rgba(0,230,118,0.2); color:var(--ap-green);">SPORTSBOOK</span>
        </div>

        <table class="ap-odds-table">
          <thead>
            <tr>
              <th style="text-align:left;">Selection</th>
              <th style="width:140px; text-align:center; color:var(--ap-green);">DECIMAL ODDS</th>
            </tr>
          </thead>
          <tbody>
            ${selections.map(s => `
              <tr>
                <td class="ap-runner-name">${s.runnerName}</td>
                <td style="text-align:center;">
                  ${s.isActive && !s.isBallRunning && s.odds && s.odds > 0 ? `
                    <div class="ap-odds-btn green">
                      <span class="ap-price">${s.odds}</span>
                    </div>
                  ` : `<div class="ap-odds-btn suspended"><span class="ap-price" style="font-size:0.75rem;">Ball Run</span></div>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  document.querySelectorAll('.ap-nav-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ap-nav-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeSport = tab.dataset.sport;
      state.selectedEventId = null;
      fetchEvents(true);
    });
  });

  document.querySelectorAll('.ap-cat-btn').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.ap-cat-btn').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeCategory = pill.dataset.category;
      if (state.selectedEventId) {
        fetchEventDetail(state.selectedEventId, true);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
