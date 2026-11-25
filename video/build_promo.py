"""Assemble promo.html (render page) from promo_src.html + the site's landscape layers."""
import os,re
D=os.path.dirname(os.path.abspath(__file__))
scene=open(os.path.join(D,'..','sections','hero-scene.html')).read()
inner=scene.split('aria-hidden="true">',1)[1].rsplit('</div>',1)[0]
inner=re.sub(r'<canvas class="bokeh".*?</canvas>','',inner); inner=inner.replace('<div class="scene-shade"></div>','').replace('<div class="sun"></div>','')
src=open(os.path.join(D,'promo_src.html')).read().replace('{{SCENE}}',inner)
src=src.replace('<script src="../js/avatar.js"></script>','<script src="../assets/ali-avatar-data.js"></script>\n<script src="../js/avatar.js"></script>')
open(os.path.join(D,'promo.html'),'w').write(src); print('promo.html ok')
