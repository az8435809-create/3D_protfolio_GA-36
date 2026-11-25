/* Contact-form rules shared by the browser and the server (UMD) — one source of truth. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ContactRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LIMITS = { name: [2, 80], email: [6, 254], subject: [3, 120], message: [20, 4000] };
  const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/i;
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  const oneLine = s => clean(s).replace(/[\r\n]+/g, ' ');     // header-safe (blocks CRLF injection)
  function validate(input) {
    const v = { name: oneLine(input.name), email: oneLine(input.email).toLowerCase(), subject: oneLine(input.subject), message: clean(input.message).replace(/\r\n/g, '\n') };
    const e = {};
    const len = (k, label) => { const [a, b] = LIMITS[k]; if (!v[k]) e[k] = label + ' is required.'; else if (v[k].length < a) e[k] = `${label} must be at least ${a} characters.`; else if (v[k].length > b) e[k] = `${label} must be at most ${b} characters.` };
    len('name', 'Name'); len('subject', 'Subject'); len('message', 'Message');
    if (!v.email) e.email = 'Email is required.'; else if (!EMAIL.test(v.email) || v.email.length > LIMITS.email[1]) e.email = 'Please enter a valid email address.';
    if (v.name && /https?:|www\.|[<>]/i.test(v.name)) e.name = 'Name cannot contain links or angle brackets.';
    return { values: v, errors: e, ok: !Object.keys(e).length };
  }
  /* basic spam scoring (server decides; the browser only warns) */
  function spamScore(v) {
    let s = 0; const links = (v.message.match(/https?:\/\/|www\./gi) || []).length;
    if (links > 2) s += 2; if (links > 5) s += 3;
    if (/\b(viagra|casino|crypto ?(?:pump|signal)|loan offer|seo services|backlinks?|forex)\b/i.test(v.message + ' ' + v.subject)) s += 3;
    if (/(.)\1{9,}/.test(v.message)) s += 1;
    if (/[\u0400-\u04FF]{20,}/.test(v.message) && !/[a-z]{3}/i.test(v.message)) s += 1;
    return s;
  }
  return { LIMITS, validate, spamScore, clean, oneLine };
});
