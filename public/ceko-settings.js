(function(){
  const API = window.CEKO_API_BASE || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000/api' : location.origin + '/api');
  const text = (selector, value) => { if (value) document.querySelectorAll(selector).forEach(el => { el.textContent = value; }); };
  const html = (selector, value) => { if (value) document.querySelectorAll(selector).forEach(el => { el.innerHTML = value; }); };
  const attr = (selector, name, value) => { if (value) document.querySelectorAll(selector).forEach(el => { el.setAttribute(name, value); }); };
  const phoneHref = value => 'tel:' + String(value || '').replace(/[^0-9+]/g, '');

  function applySettings(s) {
    if (!s || typeof s !== 'object') return;
    if (s.seo_title) document.title = s.seo_title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && s.seo_description) desc.setAttribute('content', s.seo_description);
    if (s.favicon_url) {
      let icon = document.querySelector('link[rel="icon"]') || document.createElement('link');
      icon.rel = 'icon'; icon.href = s.favicon_url; document.head.appendChild(icon);
    }
    if (s.logo_url) {
      document.querySelectorAll('.nav-logo,.footer-logo,.footer-brand').forEach(el => {
        el.innerHTML = '<img src="' + s.logo_url + '" alt="' + (s.site_name || 'CEKO OPTICS') + '" style="max-height:42px;max-width:190px;object-fit:contain">';
      });
    }

    document.querySelectorAll('[data-setting]').forEach(el => { const v = s[el.dataset.setting]; if (v) el.textContent = v; });
    document.querySelectorAll('[data-setting-html]').forEach(el => { const v = s[el.dataset.settingHtml]; if (v) el.innerHTML = v; });
    document.querySelectorAll('[data-setting-src]').forEach(el => { const v = s[el.dataset.settingSrc]; if (v) el.src = v; });
    document.querySelectorAll('[data-setting-href]').forEach(el => { const v = s[el.dataset.settingHref]; if (v) el.href = v; });

    text('.hero-eyebrow', s.home_hero_eyebrow);
    html('.hero-title', s.home_hero_title_html);
    text('.hero-desc', s.home_hero_subtitle);
    text('[data-ceko="home_cta_primary"]', s.home_cta_primary);
    text('[data-ceko="home_cta_secondary"]', s.home_cta_secondary);
    text('[data-ceko="about_eyebrow"]', s.about_eyebrow);
    html('[data-ceko="about_title"]', s.about_title_html);
    text('[data-ceko="about_vision_title"]', s.about_vision_title);
    text('[data-ceko="about_vision_text"]', s.about_vision_text);
    text('[data-ceko="about_mission_title"]', s.about_mission_title);
    text('[data-ceko="about_mission_text"]', s.about_mission_text);
    text('[data-ceko="about_values_title"]', s.about_values_title);
    if (s.about_values) {
      const items = s.about_values.split(/\n+/).map(x => x.trim()).filter(Boolean);
      document.querySelectorAll('[data-ceko="about_values"]').forEach(el => {
        el.innerHTML = items.map(item => '<div style="display:flex;align-items:center;gap:10px;font-size:0.88rem;color:var(--cream2);"><span style="color:var(--gold);">✦</span> ' + item + '</div>').join('');
      });
    }
    text('[data-ceko="commitment_eyebrow"]', s.commitment_eyebrow);
    html('[data-ceko="commitment_title"]', s.commitment_title_html);
    text('[data-ceko="commitment_text"]', s.commitment_text);
    text('[data-ceko="contact_eyebrow"]', s.contact_eyebrow);
    html('[data-ceko="contact_title"]', s.contact_title_html);
    text('[data-ceko="contact_text"]', s.contact_text);
    text('#contact-submit-btn', s.contact_button);
    text('.footer-copy', s.footer_copy);
    html('footer .footer-logo + p', s.footer_intro);

    if (s.hotline) {
      attr('a[href^="tel:"],a[data-phone-link]', 'href', phoneHref(s.hotline));
      document.querySelectorAll('[data-setting="hotline"]').forEach(el => { el.textContent = s.hotline; });
      document.querySelectorAll('.contact-item span').forEach(el => { if (/Hotline:|^0\d/.test(el.textContent.trim())) el.textContent = 'Hotline: ' + s.hotline; });
    }
    if (s.email) {
      attr('a[href^="mailto:"]', 'href', 'mailto:' + s.email);
      document.querySelectorAll('[data-setting="email"]').forEach(el => { el.textContent = s.email; });
      document.querySelectorAll('.contact-item span').forEach(el => { if (el.textContent.includes('@')) el.textContent = s.email; });
    }
    if (s.address) {
      document.querySelectorAll('[data-setting="address"]').forEach(el => { el.innerHTML = s.address; });
      document.querySelectorAll('.contact-item span').forEach(el => { if (/Bắc Ninh|Đại Hoàng Long|Võ Cường/.test(el.textContent)) el.innerHTML = s.address; });
    }
    attr('a[aria-label="Facebook"],a[data-social="facebook"]', 'href', s.facebook);
    attr('a[aria-label="Zalo"],a[data-social="zalo"]', 'href', s.zalo);
  }

  async function loadCekoSettings() {
    try {
      const res = await fetch(API + '/settings', { cache: 'no-store' });
      if (!res.ok) return;
      applySettings(await res.json());
    } catch (_) {}
  }
  window.CEKOApplySettings = applySettings;
  window.CEKOLoadSettings = loadCekoSettings;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadCekoSettings);
  else loadCekoSettings();
})();
