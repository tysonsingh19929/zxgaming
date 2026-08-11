// SkyExchange Client App with Smart Market-Active Prioritization & Zero-Stub Auto-Selection

const state = {
  activeSport: 'all',
  activeCategory: 'ALL',
  inplayOnly: false,
  searchQuery: '',
  selectedEventId: null,
  events: [],
  currentEventDetail: null,
  isFetchingDetail: false
};

// DOM Elements
const sseStatus = document.getElementById('sse-status');
const eventsListContainer = document.getElementById('events-list-container');
const eventsCountLabel = document.getElementById('events-count-label');
const eventHeaderCard = document.getElementById('event-header-card');
const categoryFilterBar = document.getElementById('category-filter-bar');
const marketsContainer = document.getElementById('markets-container');
const globalSearch = document.getElementById('global-search');
const eventIdInput = document.getElementById('event-id-input');
const goEventBtn = document.getElementById('go-event-btn');
const inplayOnlyCheckbox = document.getElementById('inplay-only-checkbox');
const sportTabs = document.querySelectorAll('.sport-tab');
const catPills = document.querySelectorAll('.cat-pill');

function init() {
  setupEventListeners();
  connectSSE();
  fetchEvents(true);
}

function connectSSE() {
  const evtSource = new EventSource('/api/stream');

  evtSource.onopen = () => {
    sseStatus.innerText = 'REAL-TIME STREAM LIVE (0.2s)';
    sseStatus.parentElement.style.borderColor = 'rgba(16, 185, 129, 0.5)';
  };

  evtSource.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'LIVE_UPDATE') {
        await refreshLiveState();
      }
    } catch (e) {}
  };

  evtSource.onerror = () => {
    sseStatus.innerText = 'RECONNECTING STREAM...';
    sseStatus.parentElement.style.borderColor = 'rgba(239, 68, 68, 0.5)';
  };
}

async function refreshLiveState() {
  await fetchEvents(false);
  if (state.selectedEventId) {
    await fetchEventDetail(state.selectedEventId, false);
  }
}

async function fetchEvents(showLoading = true) {
  if (showLoading && state.events.length === 0) {
    eventsListContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading live matches...</div>`;
  }

  try {
    let url = `/api/events?sport=${state.activeSport}&t=${Date.now()}`;
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    let events = data.events || [];

    if (state.inplayOnly) {
      events = events.filter(e => e.isInPlay);
    }

    // PRIORITIZE EVENTS WITH ACTIVE MARKETS (hasBookmaker / hasFancy / marketCount > 0 FIRST)
    events.sort((a, b) => {
      const weightA = (a.hasBookmaker ? 4 : 0) + (a.hasFancy ? 4 : 0) + (a.marketCount > 0 ? 2 : 0) + (a.isInPlay ? 1 : 0);
      const weightB = (b.hasBookmaker ? 4 : 0) + (b.hasFancy ? 4 : 0) + (b.marketCount > 0 ? 2 : 0) + (b.isInPlay ? 1 : 0);
      return weightB - weightA;
    });

    state.events = events;
    renderEventsSidebar();

    // AUTO-SELECT FIRST EVENT THAT HAS OPEN MARKETS
    const isSelectedInList = state.events.some(e => String(e.eventId) === String(state.selectedEventId));
    if ((!state.selectedEventId || !isSelectedInList) && state.events.length > 0) {
      // Find first event with active markets, fallback to first event in list
      const bestEvent = state.events.find(e => e.hasBookmaker || e.hasFancy || e.marketCount > 0) || state.events[0];
      state.selectedEventId = String(bestEvent.eventId);
      renderEventsSidebar();
      await fetchEventDetail(state.selectedEventId, showLoading);
    }
  } catch (err) {
    console.error('Fetch events error:', err);
  }
}

function renderEventsSidebar() {
  eventsCountLabel.innerHTML = `<i class="fa-solid fa-list-check"></i> ${state.events.length} Active Events Found`;

  if (state.events.length === 0) {
    eventsListContainer.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.8rem;">
        <i class="fa-solid fa-ghost" style="font-size:1.5rem; margin-bottom:0.5rem; display:block;"></i>
        No active matches found for this sport.
      </div>
    `;
    return;
  }

  eventsListContainer.innerHTML = state.events.map(ev => `
    <div class="event-item ${String(ev.eventId) === String(state.selectedEventId) ? 'selected' : ''}" onclick="selectEvent('${ev.eventId}')">
      <div class="event-item-header">
        <span>${ev.sportName} • ${ev.competitionName}</span>
        <span class="event-id-pill">ID: ${ev.eventId}</span>
      </div>
      <div class="event-title">${ev.eventName}</div>
      <div class="event-meta">
        ${ev.isInPlay ? `<span class="inplay-badge"><i class="fa-solid fa-play"></i> IN-PLAY</span>` : `<span>${ev.openDateStr}</span>`}
        ${ev.hasBookmaker ? `<span class="cat-badge BOOKMAKER">BM</span>` : ''}
        ${ev.hasFancy ? `<span class="cat-badge FANCY">FANCY</span>` : ''}
        ${ev.hasPremiumSportsbook ? `<span class="cat-badge PREMIUM_SPORTSBOOK">PREMIUM</span>` : ''}
        <span style="margin-left:auto; font-size:0.65rem; color:${ev.marketCount > 0 ? '#10b981' : 'var(--text-muted)'}; font-weight:${ev.marketCount > 0 ? '700' : '400'};">
          ${ev.marketCount > 0 ? `<i class="fa-solid fa-bolt"></i> ${ev.marketCount} Markets` : '0 Markets'}
        </span>
      </div>
    </div>
  `).join('');
}

function selectEvent(eventId) {
  state.selectedEventId = String(eventId);
  renderEventsSidebar();
  fetchEventDetail(eventId, true);
}

async function fetchEventDetail(eventId, showLoading = true) {
  if (state.isFetchingDetail && !showLoading) return;
  state.isFetchingDetail = true;

  if (showLoading) {
    marketsContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading live odds...</div>`;
  }

  try {
    const res = await fetch(`/api/event/${eventId}?category=${state.activeCategory}&t=${Date.now()}`);
    
    if (!res.ok) {
      // AUTO-RECOVER: Purge invalid event ID from local list and switch immediately to first active event with markets
      state.events = state.events.filter(e => String(e.eventId) !== String(eventId));
      renderEventsSidebar();

      if (state.events.length > 0) {
        const bestEvent = state.events.find(e => e.hasBookmaker || e.hasFancy || e.marketCount > 0) || state.events[0];
        state.selectedEventId = String(bestEvent.eventId);
        state.isFetchingDetail = false;
        return fetchEventDetail(state.selectedEventId, true);
      }

      eventHeaderCard.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-ban" style="color:#ef4444;"></i>
          <h2>Event Removed or Finished</h2>
          <p>Event ID '<code>${eventId}</code>' has been closed and purged from SkyExchange.</p>
        </div>
      `;
      categoryFilterBar.style.display = 'none';
      marketsContainer.innerHTML = '';
      state.isFetchingDetail = false;
      return;
    }

    const data = await res.json();
    state.currentEventDetail = data.event;
    categoryFilterBar.style.display = 'flex';
    renderEventHeader(data.event);
    renderMarkets(data.event.markets || []);
  } catch (err) {
    console.error('Fetch event detail error:', err);
  } finally {
    state.isFetchingDetail = false;
  }
}

function renderEventHeader(ev) {
  eventHeaderCard.innerHTML = `
    <div class="event-banner-details">
      <div class="banner-top">
        <span class="inplay-badge">${ev.isInPlay ? 'IN-PLAY LIVE' : 'UPCOMING'}</span>
        <span class="event-id-pill">EVENT ID: ${ev.eventId}</span>
        <span class="event-id-pill">SPORT: ${ev.sportName.toUpperCase()}</span>
        ${ev.hasBookmaker ? `<span class="cat-badge BOOKMAKER">BOOKMAKER AVAILABLE</span>` : ''}
        ${ev.hasFancy ? `<span class="cat-badge FANCY">FANCY BETS AVAILABLE</span>` : ''}
        ${ev.hasPremiumSportsbook ? `<span class="cat-badge PREMIUM_SPORTSBOOK">PREMIUM SPORTSBOOK AVAILABLE</span>` : ''}
      </div>
      <div class="banner-title">${ev.eventName}</div>
      <div class="banner-sub">
        <span><i class="fa-solid fa-trophy"></i> Competition: <strong>${ev.competitionName}</strong></span>
        <span><i class="fa-regular fa-clock"></i> Open Time: <strong>${ev.openDateStr}</strong></span>
        <span><i class="fa-solid fa-chart-line"></i> Total Active Markets: <strong>${ev.markets.length}</strong></span>
      </div>
    </div>
  `;
}

function renderMarkets(markets) {
  if (!markets || markets.length === 0) {
    marketsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <h3>No Active Markets Currently Available for this Match</h3>
        <p>Pre-match or in-play odds for this event are updating. Select another live match with active green markets from the left list.</p>
      </div>
    `;
    return;
  }

  marketsContainer.innerHTML = markets.map(m => {
    const category = m.category || 'MATCH_ODDS';

    // 1. PREMIUM SPORTSBOOK MARKETS
    if (category === 'PREMIUM_SPORTSBOOK') {
      const selections = m.selections || [];

      return `
        <div class="market-card premium_sportsbook" id="market-card-${m.marketId}">
          <div class="market-header">
            <h3><i class="fa-solid fa-fire"></i> ${m.marketName} <span class="cat-badge PREMIUM_SPORTSBOOK">PREMIUM SPORTSBOOK</span></h3>
            <span class="market-id-tag">MARKET ID: ${m.marketId}</span>
          </div>

          <table class="odds-table">
            <thead>
              <tr>
                <th class="runner-col">Selection</th>
                <th class="green-header" style="width: 140px;">DECIMAL ODDS</th>
              </tr>
            </thead>
            <tbody>
              ${selections.length > 0 ? selections.map(s => `
                <tr>
                  <td class="runner-cell">${s.runnerName}</td>
                  <td style="text-align:right; padding-right:1rem;">
                    ${s.isActive && !s.isBallRunning && s.odds && s.odds > 0 ? `
                      <div class="odds-box green">
                        <span class="odds-price">${s.odds}</span>
                      </div>
                    ` : `
                      <div class="odds-box ball-running-box" style="margin-left:auto; width:120px;">
                        <span class="odds-price" style="font-size:0.75rem; font-weight:800; color:#ef4444;">Ball Run</span>
                      </div>
                    `}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="2" style="text-align:center; padding:0.75rem; color:#ef4444; font-weight:700;">
                    Ball Running / Suspended
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      `;
    }

    // 2. FANCY BET SESSION MARKETS
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
        <div class="market-card fancy" id="market-card-${m.marketId}">
          <div class="market-header">
            <h3><i class="fa-solid fa-star"></i> ${m.marketName} <span class="cat-badge FANCY">FANCY BET</span></h3>
            <span class="market-id-tag">MARKET ID: ${m.marketId}</span>
          </div>

          <table class="odds-table">
            <thead>
              <tr>
                <th class="runner-col">Session / Special Bet</th>
                <th class="lay-header" style="width: 160px;">NOT (LAY / NO)</th>
                <th class="back-header" style="width: 160px;">YES (BACK)</th>
                <th style="width: 120px;">Stakes Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="runner-cell">${m.marketName}</td>
                <td>
                  ${isBallRunning ? `
                    <div class="odds-box ball-running-box">
                      <span class="odds-price" style="font-size:0.75rem; color:#ef4444; font-weight:800;">Ball Run</span>
                    </div>
                  ` : `
                    <div class="odds-box lay">
                      <span class="odds-price">${noLabel}</span>
                      <span class="odds-size">${m.oddsNo ? m.oddsNo + ' Odds' : '100 Odds'}</span>
                    </div>
                  `}
                </td>
                <td>
                  ${isBallRunning ? `
                    <div class="odds-box ball-running-box">
                      <span class="odds-price" style="font-size:0.75rem; color:#ef4444; font-weight:800;">Ball Run</span>
                    </div>
                  ` : `
                    <div class="odds-box back">
                      <span class="odds-price">${yesLabel}</span>
                      <span class="odds-size">${m.oddsYes ? m.oddsYes + ' Odds' : '100 Odds'}</span>
                    </div>
                  `}
                </td>
                <td style="font-size:0.75rem; color:var(--text-muted); text-align:center;">
                  Min: ${m.min || 1}<br>Max: ${m.max || 800}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // 3. BOOKMAKER MARKETS
    if (category === 'BOOKMAKER') {
      const selections = m.selections || [];
      return `
        <div class="market-card bookmaker" id="market-card-${m.marketId}">
          <div class="market-header">
            <h3><i class="fa-solid fa-book"></i> ${m.marketName} <span class="cat-badge BOOKMAKER">BOOKMAKER</span></h3>
            <span class="market-id-tag">MARKET ID: ${m.marketId}</span>
          </div>

          <table class="odds-table">
            <thead>
              <tr>
                <th class="runner-col">Runner / Team</th>
                <th class="back-header" style="width: 160px;">BACK (BET FOR)</th>
                <th class="lay-header" style="width: 160px;">LAY (BET AGAINST)</th>
              </tr>
            </thead>
            <tbody>
              ${selections.map(s => {
                const hasBack = s.backPrice && s.backPrice !== '' && s.backPrice !== null;
                const hasLay = s.layPrice && s.layPrice !== '' && s.layPrice !== null;
                const isSuspended = s.status === 2 || (!hasBack && !hasLay);

                return `
                  <tr>
                    <td class="runner-cell">${s.runnerName}</td>
                    <td>
                      ${!isSuspended && hasBack ? `
                        <div class="odds-box back">
                          <span class="odds-price">${parseFloat(s.backPrice).toFixed(0)}</span>
                        </div>
                      ` : `
                        <div class="odds-box ball-running-box">
                          <span class="odds-price" style="font-size:0.75rem; color:#ef4444; font-weight:800;">SUSPENDED</span>
                        </div>
                      `}
                    </td>
                    <td>
                      ${!isSuspended && hasLay ? `
                        <div class="odds-box lay">
                          <span class="odds-price">${parseFloat(s.layPrice).toFixed(0)}</span>
                        </div>
                      ` : `
                        <div class="odds-box ball-running-box">
                          <span class="odds-price" style="font-size:0.75rem; color:#ef4444; font-weight:800;">SUSPENDED</span>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 4. MATCH ODDS / 1x2 EXCHANGE MARKETS
    const selections = m.selections || [];

    return `
      <div class="market-card match_odds" id="market-card-${m.marketId}">
        <div class="market-header">
          <h3><i class="fa-solid fa-chart-simple"></i> ${m.marketName} <span class="cat-badge MATCH_ODDS">MATCH ODDS / EXCHANGE</span></h3>
          <span class="market-id-tag">MARKET ID: ${m.marketId}</span>
        </div>

        <table class="odds-table">
          <thead>
            <tr>
              <th class="runner-col">Selection / Runner</th>
              <th class="back-header" colspan="3">Back (Bet For)</th>
              <th class="lay-header" colspan="3">Lay (Bet Against)</th>
            </tr>
          </thead>
          <tbody>
            ${selections.length > 0 ? selections.map(s => {
              const rawBack = (s.availableToBack || []).slice();
              rawBack.sort((a, b) => a.price - b.price);

              let backCol1 = null, backCol2 = null, backCol3Best = null;
              if (rawBack.length === 1) {
                backCol3Best = rawBack[0];
              } else if (rawBack.length === 2) {
                backCol2 = rawBack[0];
                backCol3Best = rawBack[1];
              } else if (rawBack.length >= 3) {
                backCol1 = rawBack[rawBack.length - 3];
                backCol2 = rawBack[rawBack.length - 2];
                backCol3Best = rawBack[rawBack.length - 1];
              }

              const rawLay = (s.availableToLay || []).slice();
              rawLay.sort((a, b) => a.price - b.price);

              let layCol4Best = null, layCol5 = null, layCol6 = null;
              if (rawLay.length >= 1) layCol4Best = rawLay[0];
              if (rawLay.length >= 2) layCol5 = rawLay[1];
              if (rawLay.length >= 3) layCol6 = rawLay[2];

              return `
                <tr>
                  <td class="runner-cell">${s.runnerName}</td>

                  <td>${backCol1 ? `<div class="odds-box back"><span class="odds-price">${backCol1.price}</span><span class="odds-size">$${backCol1.size}</span></div>` : '-'}</td>
                  <td>${backCol2 ? `<div class="odds-box back"><span class="odds-price">${backCol2.price}</span><span class="odds-size">$${backCol2.size}</span></div>` : '-'}</td>
                  <td>${backCol3Best ? `<div class="odds-box back" style="transform:scale(1.04); box-shadow:0 0 8px rgba(59,130,246,0.3);"><span class="odds-price">${backCol3Best.price}</span><span class="odds-size">$${backCol3Best.size}</span></div>` : '-'}</td>

                  <td>${layCol4Best ? `<div class="odds-box lay" style="transform:scale(1.04); box-shadow:0 0 8px rgba(236,72,153,0.3);"><span class="odds-price">${layCol4Best.price}</span><span class="odds-size">$${layCol4Best.size}</span></div>` : '-'}</td>
                  <td>${layCol5 ? `<div class="odds-box lay"><span class="odds-price">${layCol5.price}</span><span class="odds-size">$${layCol5.size}</span></div>` : '-'}</td>
                  <td>${layCol6 ? `<div class="odds-box lay"><span class="odds-price">${layCol6.price}</span><span class="odds-size">$${layCol6.size}</span></div>` : '-'}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">
                  Market Open • Waiting for live prices...
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  sportTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sportTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeSport = tab.dataset.sport;
      state.selectedEventId = null; // Clear previous event selection on tab change

      fetchEvents(true);
    });
  });

  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeCategory = pill.dataset.category;
      if (state.selectedEventId) {
        fetchEventDetail(state.selectedEventId, true);
      }
    });
  });

  globalSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    fetchEvents();
  });

  inplayOnlyCheckbox.addEventListener('change', (e) => {
    state.inplayOnly = e.target.checked;
    fetchEvents();
  });

  goEventBtn.addEventListener('click', () => {
    const val = eventIdInput.value.trim();
    if (val) {
      selectEvent(val);
    }
  });

  eventIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      goEventBtn.click();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
