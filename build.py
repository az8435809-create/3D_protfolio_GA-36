"""Assemble the site from sections/, css/, js/.
python3 build.py           -> index.html   (links css/ js/ assets/; deploy the whole folder)
python3 build.py --bundle  -> preview.html (one self-contained file, images inlined)"""
import sys,os,base64,re
D=os.path.dirname(os.path.abspath(__file__))
R=lambda p:open(os.path.join(D,p),encoding='utf8').read().strip()
CSS=['base','nav','hero','sections','avatar','reel','chat-contact','responsive','theme']
HEAD_JS=['features','analytics']
JS=['../rag/retriever','../rag/prompt','../rag/validate','content','projects','main','rock','avatar','avatar-section','video','contact-form','chat']
SECTIONS=['hero','about','reel','avatar','skills','projects','journey','testimonials','contact']
MARQUEE=['Web Development','UI/UX Design','React','Next.js','Figma','Three.js','Tailwind CSS']
bundle='--bundle' in sys.argv
artifact='--artifact' in sys.argv
mq=''.join(f'<span>{w}</span>' for w in MARQUEE)
mq=mq+mq.replace('<span>','<span aria-hidden="true">')   # duplicated for the seamless loop
body='\n'.join(R(f'sections/{n}.html') for n in SECTIONS).replace('{{HERO_SCENE}}',R('sections/hero-scene.html')).replace('{{MARQUEE}}',mq)
if bundle:
    css='<style>\n'+'\n'.join(R(f'css/{n}.css') for n in CSS)+'\n</style>'
    js='<script>'+R('data/rag-index.js')+'</script>\n'+'<script>window.AVATAR_GLB_B64="'+base64.b64encode(open(os.path.join(D,'assets/ali-avatar.glb'),'rb').read()).decode()+'";</script>\n'+'\n'.join(f'<script>\n{R(f"js/{n}.js")}\n</script>' for n in JS)
    headjs='\n'.join(f'<script>\n{R(f"js/{n}.js")}\n</script>' for n in HEAD_JS)
else:
    css='\n'.join(f'<link rel="stylesheet" href="css/{n}.css">' for n in CSS)
    js='\n'.join(f'<script src="js/{n}.js" defer></script>' for n in JS)
    headjs='\n'.join(f'<script src="js/{n}.js"></script>' for n in HEAD_JS)
html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ali Zain — Web Developer & UI Designer, Karachi</title>
<meta name="description" content="Ali Zain is a web developer and UI designer from Karachi, Pakistan, building clean, fast and beautiful websites. Contact: az8435809@gmail.com">
<meta name="theme-color" content="#12211A">
<meta property="og:title" content="Ali Zain — I Build Digital Experiences That Reach New Heights">
<meta property="og:description" content="Web developer & UI designer from Karachi, Pakistan.">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/ali.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2312211A'/%3E%3Cpath d='M10 50 L26 22 L34 34 L42 18 L56 50Z' fill='%23D9A821'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500;1,700&family=Manrope:wght@400;500;600;700;800&display=swap">
{css}
{headjs}
</head>
<body>
{R("sections/nav.html")}
<main id="content">
{body}
</main>
{R("sections/footer.html")}
{js}
</body>
</html>
'''
if bundle:
    def inline(m):
        p=m.group(0); f=os.path.join(D,p)
        if not os.path.exists(f): return p
        mime={'webp':'image/webp','png':'image/png','jpg':'image/jpeg'}[p.rsplit('.',1)[1]]
        return f'data:{mime};base64,'+base64.b64encode(open(f,'rb').read()).decode()
    refs={}
    def ref(m):
        p=m.group(1); key=os.path.basename(p).split('.')[0].replace('-','_')
        if key not in refs: refs[key]=inline(re.match(r'.*',p))
        return f'src="" data-asset="{key}"'
    html=re.sub(r'src="(assets/(?:ali|certificate)\.webp)"',ref,html)
    loader='<script>window.__ASSETS={'+','.join(f'{k}:"{v}"' for k,v in refs.items())+'};document.addEventListener("DOMContentLoaded",()=>document.querySelectorAll("[data-asset]").forEach(i=>i.src=__ASSETS[i.dataset.asset]))</script>'
    html=html.replace('</head>',loader+'\n</head>')
if bundle: html=re.sub(r'\s*<button class="play-intro".*?</button>','',html,flags=re.S); html=re.sub(r'<section class="section reel".*?</section>','',html,flags=re.S)   # the single-file preview does not carry the video
if bundle or '--artifact' in sys.argv: html=re.sub(r'\s*<a class="btn btn-outline btn-sm" href="assets/ali-avatar.glb" download[^>]*>.*?</a>','',html,flags=re.S)   # downloads do not work inside the preview frame
if artifact:   # hosted preview: captions inline (the host does not serve .vtt)
    html=html.replace('src="video/promo.vtt"','src="data:text/vtt;base64,'+base64.b64encode(open(os.path.join(D,'video/promo.vtt'),'rb').read()).decode()+'"')
out='preview.html' if bundle else ('artifact.html' if artifact else 'index.html')
open(os.path.join(D,out),'w',encoding='utf8').write(html)
print('built',out,len(html)//1024,'KB')
