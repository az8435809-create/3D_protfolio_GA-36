"""Local SMTP capture server for testing the contact form end-to-end (like MailHog/Mailpit).
Speaks ESMTP with AUTH PLAIN/LOGIN, saves every received message to tests/out/inbox/*.eml.
python3 tests/smtp_sink.py 2525"""
import asyncio, base64, os, sys, time
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'inbox'); os.makedirs(OUT, exist_ok=True)
USER, PASS = os.environ.get('SINK_USER', 'portfolio'), os.environ.get('SINK_PASS', 'test-app-password')
async def handle(r, w):
    send = lambda s: w.write((s + '\r\n').encode())
    send('220 localhost ESMTP capture-sink'); await w.drain()
    mail_from, rcpt, authed = None, [], False
    while True:
        line = (await r.readline()).decode(errors='replace').rstrip('\r\n')
        if not line: break
        cmd = line.split(' ')[0].upper()
        if cmd in ('EHLO', 'HELO'): send('250-localhost'); send('250-AUTH PLAIN LOGIN'); send('250 8BITMIME')
        elif cmd == 'AUTH':
            parts = line.split(' ')
            if parts[1].upper() == 'PLAIN':
                _, u, p = base64.b64decode(parts[2]).decode().split('\0')
            else:
                send('334 VXNlcm5hbWU6'); await w.drain(); u = base64.b64decode((await r.readline()).strip()).decode()
                send('334 UGFzc3dvcmQ6'); await w.drain(); p = base64.b64decode((await r.readline()).strip()).decode()
            authed = (u == USER and p == PASS); send('235 Authentication successful' if authed else '535 Authentication failed')
        elif cmd == 'MAIL':
            if not authed: send('530 Authentication required')
            else: mail_from = line[10:]; send('250 OK')
        elif cmd == 'RCPT': rcpt.append(line[8:]); send('250 OK')
        elif cmd == 'DATA':
            send('354 End data with <CR><LF>.<CR><LF>'); await w.drain(); data = []
            while True:
                l = await r.readline()
                if l in (b'.\r\n', b'.\n'): break
                data.append(l[1:] if l.startswith(b'..') else l)
            fn = os.path.join(OUT, time.strftime('%Y%m%d-%H%M%S') + f'-{len(os.listdir(OUT))+1}.eml')
            open(fn, 'wb').write(b''.join(data)); print('DELIVERED', mail_from, '->', rcpt, fn, flush=True); send('250 OK: queued as ' + os.path.basename(fn))
        elif cmd == 'QUIT': send('221 Bye'); await w.drain(); break
        else: send('250 OK')
        await w.drain()
    w.close()
async def main(port): s = await asyncio.start_server(handle, '127.0.0.1', port); print('SMTP sink on', port, flush=True); await s.serve_forever()
asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 2525))
