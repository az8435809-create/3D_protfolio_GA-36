"""Render the promo frame by frame (headless Chrome) and encode with ffmpeg.
python3 video/capture.py [--fps 30] [--sheet]   (needs playwright + chrome + ffmpeg)"""
import sys,os,subprocess,time
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__)); FR=os.path.join(D,'frames'); os.makedirs(FR,exist_ok=True)
fps=30; sheet='--sheet' in sys.argv
CHROME=os.environ.get('CHROME','/usr/bin/google-chrome')
with sync_playwright() as p:
  b=p.chromium.launch(executable_path=CHROME,args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--allow-file-access-from-files'])
  pg=b.new_page(viewport={'width':1920,'height':1080});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file://'+os.path.join(D,'promo.html'));pg.wait_for_timeout(1500);pg.evaluate('window.ready')
  times=[1.6,3.5,7.6,9.5,13.8,16,20.5,23.5,30.2,32.6,36.5,38.5,42.4,44,45.2] if sheet else [i/fps for i in range(int(46*fps))]
  t0=time.time()
  for i,t in enumerate(times):
    pg.evaluate(f'seek({t})');pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    pg.screenshot(path=os.path.join(FR,(f'sheet_{i:02d}.jpg' if sheet else f'f_{i:05d}.jpg')),type='jpeg',quality=92)
    if i%150==0:print(i,f'{time.time()-t0:.0f}s',flush=True)
  print('errors',errs);b.close()
