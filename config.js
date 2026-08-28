const fs = require('fs');
const path = require('path');
const process = require('process');

// ============================================================================
// 🌐 CENTRALIZED SKYEXCHANGE DOMAIN CONFIGURATION
// Change 'DEFAULT_SKYEXCH_DOMAIN' or 'DEFAULT_MANUAL_LOGIN_URL' below!
// ============================================================================
const DEFAULT_SKYEXCH_DOMAIN = 'https://saapipl.skyexch.vip';
const DEFAULT_MANUAL_LOGIN_URL = 'https://skyinplay.club/';

const rawDomain = (process.env.SKYEXCH_DOMAIN || DEFAULT_SKYEXCH_DOMAIN).trim().replace(/\/+$/, '');
const BASE_DOMAIN = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
const API_BASE = `${BASE_DOMAIN}/exchange/member/playerService/`;
const MANUAL_LOGIN_URL = process.env.MANUAL_LOGIN_URL || DEFAULT_MANUAL_LOGIN_URL;

const SESSION_FILE = path.join(__dirname, 'member_session.json');

function loadMemberSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    const defaultSession = {
      username: 'tsn019',
      cookie: '',
      token: '',
      updatedAt: new Date().toISOString()
    };
    try { fs.writeFileSync(SESSION_FILE, JSON.stringify(defaultSession, null, 2)); } catch (e) {}
    return defaultSession;
  }
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf8');
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

function saveMemberSession(sessionData) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
  } catch (e) {}
}

const currentSession = loadMemberSession();

function getAuthenticatedHeaders() {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Origin': BASE_DOMAIN,
    'Referer': `${BASE_DOMAIN}/`,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  const sess = loadMemberSession();
  if (sess.cookie && sess.cookie.trim() !== '') {
    headers['Cookie'] = sess.cookie;
  }
  if (sess.token && sess.token.trim() !== '') {
    headers['Authorization'] = `Bearer ${sess.token}`;
  }

  return headers;
}

module.exports = {
  DEFAULT_SKYEXCH_DOMAIN,
  DEFAULT_MANUAL_LOGIN_URL,
  BASE_DOMAIN,
  API_BASE,
  MANUAL_LOGIN_URL,
  SESSION_FILE,
  loadMemberSession,
  saveMemberSession,
  getAuthenticatedHeaders,
  HTTP_HEADERS: getAuthenticatedHeaders()
};
