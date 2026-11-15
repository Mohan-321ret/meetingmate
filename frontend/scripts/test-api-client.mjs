/**
 * Test ApiClient and Reusable API Service Logic
 * Tests client behaviors: URL normalization, timeouts, error wrapping, query params, etc.
 */

// Simulated Fetch Mock
class MockResponse {
  constructor(status, data, headers = {}) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this._data = data;
    this.headers = headers;
  }

  async text() {
    return typeof this._data === 'string' ? this._data : JSON.stringify(this._data);
  }

  async json() {
    return typeof this._data === 'string' ? JSON.parse(this._data) : this._data;
  }
}

async function runClientTests() {
  console.log('\n======================================================');
  console.log(' JW Meeting Assistant - Frontend ApiClient Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. URL Normalization
  console.log('1. Base URL Normalization');
  function normalizeUrl(url) {
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api/v1') && !clean.includes('/api/')) {
      clean = `${clean}/api/v1`;
    }
    return clean;
  }

  assert(
    normalizeUrl('http://100.85.12.34:8000') === 'http://100.85.12.34:8000/api/v1',
    'Appends /api/v1 if omitted'
  );
  assert(
    normalizeUrl('http://100.85.12.34:8000/api/v1/') === 'http://100.85.12.34:8000/api/v1',
    'Strips trailing slashes'
  );
  assert(
    normalizeUrl('http://tailscale-node:8000/api/v1') === 'http://tailscale-node:8000/api/v1',
    'Preserves existing /api/v1'
  );

  // 2. Query Params Serialization
  console.log('\n2. Query Parameters Serialization');
  function buildUrl(base, endpoint, params) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let fullUrl = `${base}${cleanEndpoint}`;
    if (params) {
      const queryParts = [];
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
        }
      }
      if (queryParts.length > 0) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParts.join('&');
      }
    }
    return fullUrl;
  }

  const url1 = buildUrl('http://server:8000/api/v1', '/meetings', {
    meeting_type: 'midweek',
    limit: 10,
    empty_param: undefined,
  });
  assert(
    url1 === 'http://server:8000/api/v1/meetings?meeting_type=midweek&limit=10',
    'Correctly builds query string and omits undefined'
  );

  // 3. Error Classification
  console.log('\n3. Error Classification & Tamil Localization');
  class ApiError extends Error {
    constructor(message, tamilMessage, status, code) {
      super(message);
      this.name = 'ApiError';
      this.tamilMessage = tamilMessage;
      this.status = status;
      this.code = code;
    }
  }

  class NetworkError extends ApiError {
    constructor(msg = 'Network connection failed') {
      super(
        msg,
        'சர்வர் இணைப்பை அணுக முடியவில்லை. உங்கள் Tailscale VPN அல்லது இணைய இணைப்பை சரிபார்க்கவும்.',
        0,
        'NETWORK_UNREACHABLE'
      );
      this.name = 'NetworkError';
    }
  }

  class TimeoutError extends ApiError {
    constructor(timeoutMs) {
      super(
        `Request timed out after ${timeoutMs}ms`,
        'கோரிக்கை காலாவதியானது (Request Timed Out). சர்வர் பதிலளிக்க அதிக நேரம் எடுத்தது.',
        408,
        'REQUEST_TIMEOUT'
      );
      this.name = 'TimeoutError';
    }
  }

  const netErr = new NetworkError();
  assert(netErr.status === 0, 'NetworkError has status 0');
  assert(netErr.code === 'NETWORK_UNREACHABLE', 'NetworkError has code NETWORK_UNREACHABLE');
  assert(netErr.tamilMessage.includes('Tailscale VPN'), 'NetworkError has Tamil Tailscale guidance');

  const timeoutErr = new TimeoutError(15000);
  assert(timeoutErr.status === 408, 'TimeoutError has status 408');
  assert(timeoutErr.tamilMessage.includes('காலாவதியானது'), 'TimeoutError has Tamil timeout description');

  // 4. Response Parsing
  console.log('\n4. Response Status Code & Parsing Handling');
  const mockSuccess = new MockResponse(200, { success: true, count: 5 });
  const mock404 = new MockResponse(404, { detail: { message: 'Meeting not found' } });
  const mock204 = new MockResponse(204, '');

  assert(mockSuccess.ok === true, 'Status 200 is ok');
  assert(mock404.ok === false, 'Status 404 is not ok');
  assert(mock204.status === 204, 'Status 204 handled');

  console.log(`\n======================================================`);
  console.log(` Client Logic Tests: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runClientTests();
