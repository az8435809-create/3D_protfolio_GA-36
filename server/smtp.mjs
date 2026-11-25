/* Minimal dependency-free SMTP client: implicit TLS (465) or STARTTLS (587/25), AUTH LOGIN/PLAIN.
   Enough for Gmail (with an App Password), Outlook, Zoho, Brevo, Mailgun SMTP, etc. */
import net from 'node:net'; import tls from 'node:tls'; import crypto from 'node:crypto';
export async function sendSMTP({ host, port = 465, secure = port === 465, user, pass, from, to, replyTo, subject, text, html, timeoutMs = 15000 }) {
  let sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
  sock.setTimeout(timeoutMs);
  let buf = '', waiters = [];
  const onData = d => { buf += d.toString('utf8'); drain() };
  function drain() {
    while (waiters.length) {
      const m = buf.match(/^(\d{3})([ -]).*\r\n/m); if (!m) return;
      // multi-line replies end with "ddd " line
      const lines = buf.split('\r\n'); let end = -1;
      for (let i = 0; i < lines.length - 1; i++) if (/^\d{3} /.test(lines[i])) { end = i; break }
      if (end < 0) return;
      const reply = lines.slice(0, end + 1); buf = lines.slice(end + 1).join('\r\n');
      waiters.shift()({ code: +reply[end].slice(0, 3), text: reply.join('\n') });
    }
  }
  const attach = s => { s.on('data', onData); s.on('timeout', () => s.destroy(new Error('SMTP timeout'))) };
  attach(sock);
  const errP = () => new Promise((_, rej) => sock.once('error', rej));
  const read = () => Promise.race([new Promise(r => { waiters.push(r); drain() }), errP()]);
  const cmd = async (line, ok) => { if (line != null) sock.write(line + '\r\n'); const r = await read(); if (ok && !ok.includes(r.code)) throw new Error(`SMTP ${line ? line.split(' ')[0] : 'greeting'} failed: ${r.text}`); return r };
  try {
    await cmd(null, [220]);
    const name = 'portfolio.local';
    let ehlo = await cmd('EHLO ' + name, [250]);
    if (!secure && /STARTTLS/i.test(ehlo.text)) {
      await cmd('STARTTLS', [220]);
      sock.removeListener('data', onData);
      sock = tls.connect({ socket: sock, servername: host }); attach(sock);
      await new Promise((res, rej) => { sock.once('secureConnect', res); sock.once('error', rej) });
      ehlo = await cmd('EHLO ' + name, [250]);
    }
    if (user) {
      if (/AUTH[^\n]*PLAIN/i.test(ehlo.text)) await cmd('AUTH PLAIN ' + Buffer.from(`\0${user}\0${pass}`).toString('base64'), [235]);
      else { await cmd('AUTH LOGIN', [334]); await cmd(Buffer.from(user).toString('base64'), [334]); await cmd(Buffer.from(pass).toString('base64'), [235]) }
    }
    const addr = s => (s.match(/<([^>]+)>/) || [, s])[1];
    await cmd(`MAIL FROM:<${addr(from)}>`, [250]);
    await cmd(`RCPT TO:<${addr(to)}>`, [250, 251]);
    await cmd('DATA', [354]);
    const id = `<${crypto.randomUUID()}@${(addr(from).split('@')[1] || 'portfolio')}>`;
    const b = 'b_' + crypto.randomBytes(12).toString('hex');
    const enc = s => '=?UTF-8?B?' + Buffer.from(s).toString('base64') + '?=';
    const b64 = s => Buffer.from(s).toString('base64').replace(/.{76}/g, '$&\r\n');
    const msg = [
      `From: ${from}`, `To: ${to}`, replyTo ? `Reply-To: ${replyTo}` : null, `Subject: ${enc(subject)}`, `Date: ${new Date().toUTCString()}`, `Message-ID: ${id}`,
      'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${b}"`, '',
      `--${b}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(text),
      `--${b}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(html), `--${b}--`, ''
    ].filter(l => l !== null).join('\r\n').replace(/\r\n\./g, '\r\n..');
    await cmd(msg + '\r\n.', [250]);
    await cmd('QUIT').catch(() => {});
    return { id, provider: 'smtp' };
  } finally { sock.end() }
}
