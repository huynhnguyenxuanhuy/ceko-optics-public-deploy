(function () {
  const localApi = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000/api' : location.origin + '/api';
  const API = (window.CEKO_API_BASE || window.CEKO_API || window.CEKO_PUBLIC_API || localApi).replace(/\/$/, '');
  const DEFAULTS = {
    hotline: ['0899836994', '0899836995'],
    email: ['cekooptics@gmail.com'],
    address: ['Tầng 2 LK16, Khu Đại Hoàng Long, Phường Võ Cường, Tỉnh Bắc Ninh'],
    facebook: ['https://www.facebook.com/share/14bLRtqWpYB/'],
    zalo: ['https://zalo.me/0899836994']
  };
  let lastSignature = '';
  const appliedValues = { hotline: [], email: [], address: [] };

  function rememberValue(key, value) {
    if (!value) return;
    const list = appliedValues[key] || (appliedValues[key] = []);
    if (!list.includes(value)) list.push(value);
  }

  function replacementValues(key) {
    return [...(DEFAULTS[key] || []), ...(appliedValues[key] || [])];
  }

  function cleanPhone(value) {
    return String(value || '').replace(/\s+/g, '');
  }

  function replaceTextNode(root, fromValues, toValue) {
    if (!toValue || !fromValues || !fromValues.length) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return fromValues.some(v => v && node.nodeValue.includes(v))
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      fromValues.forEach(v => { if (v) text = text.split(v).join(toValue); });
      node.nodeValue = text;
    });
  }

  function applySettings(s) {
    if (!s || typeof s !== 'object') return;
    const signature = JSON.stringify({
      hotline: s.hotline || '', email: s.email || '', address: s.address || '',
      facebook: s.facebook || '', zalo: s.zalo || '', site_name: s.site_name || '',
      site_tagline: s.site_tagline || '', logo_url: s.logo_url || ''
    });
    if (signature === lastSignature) return;
    lastSignature = signature;

    if (s.site_name) {
      document.querySelectorAll('[data-setting="site_name"]').forEach(el => { el.textContent = s.site_name; });
      if (document.title && document.title.includes('CEKO OPTICS')) {
        document.title = document.title.replace(/CEKO OPTICS/g, s.site_name);
      }
    }
    if (s.site_tagline) {
      document.querySelectorAll('[data-setting="site_tagline"]').forEach(el => { el.textContent = s.site_tagline; });
    }
    if (s.hotline) {
      window.CEKO_CURRENT_HOTLINE = s.hotline;
      const phone = cleanPhone(s.hotline);
      document.querySelectorAll('a[href^="tel:"]').forEach(el => { el.href = 'tel:' + phone; });
      document.querySelectorAll('[data-setting="hotline"]').forEach(el => { el.textContent = s.hotline; });
      replaceTextNode(document.body, replacementValues('hotline'), s.hotline);
      rememberValue('hotline', s.hotline);
      document.querySelectorAll('input[type="tel"][placeholder]').forEach(el => {
        if (DEFAULTS.hotline.some(v => el.placeholder.includes(v))) el.placeholder = s.hotline;
      });
    }
    if (s.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(el => { el.href = 'mailto:' + s.email; });
      document.querySelectorAll('[data-setting="email"]').forEach(el => { el.textContent = s.email; });
      replaceTextNode(document.body, replacementValues('email'), s.email);
      rememberValue('email', s.email);
    }
    if (s.address) {
      document.querySelectorAll('[data-setting="address"]').forEach(el => { el.textContent = s.address; });
      replaceTextNode(document.body, replacementValues('address'), s.address);
      rememberValue('address', s.address);
    }
    if (s.facebook) {
      document.querySelectorAll('a[aria-label="Facebook"], a[href*="facebook.com"]').forEach(el => {
        el.href = s.facebook; el.target = '_blank'; el.rel = 'noopener noreferrer';
      });
    }
    if (s.zalo) {
      document.querySelectorAll('a[aria-label="Zalo"], a[href*="zalo.me"]').forEach(el => {
        el.href = s.zalo; el.target = '_blank'; el.rel = 'noopener noreferrer';
      });
    }
    if (s.logo_url) {
      document.querySelectorAll('[data-setting-img="logo_url"]').forEach(el => { el.src = s.logo_url; });
    }
  }

  async function refreshSettings() {
    try {
      const res = await fetch(API + '/settings', { cache: 'no-store' });
      if (!res.ok) return;
      applySettings(await res.json());
    } catch (_) {}
  }

  window.CEKO_REFRESH_SETTINGS = refreshSettings;
  window.addEventListener('storage', event => {
    if (event.key === 'ceko_settings_updated') refreshSettings();
  });
  document.addEventListener('DOMContentLoaded', refreshSettings);
  if (document.readyState !== 'loading') refreshSettings();
  setInterval(refreshSettings, 3000);
})();
