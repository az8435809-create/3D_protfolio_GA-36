"""Original 46 s soundtrack for the promo (synthesised, royalty-free). Writes soundtrack.wav"""
import numpy as np, wave, os
SR=44100; DUR=46.0; N=int(SR*DUR); t=np.arange(N)/SR
out=np.zeros((N,2))
def note(f): return 440*2**((f-69)/12)
def lp(x,a):                        # one-pole low-pass
    y=np.empty_like(x); acc=0.
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
def env(n,att,rel):
    e=np.ones(n); a=int(att*SR); r=int(rel*SR)
    if a: e[:a]=np.linspace(0,1,a)
    if r: e[-r:]*=np.linspace(1,0,r)
    return e
def add(sig,start,gain=1.,pan=0.):
    s=int(start*SR); e=min(N,s+len(sig)); sig=sig[:e-s]
    out[s:e,0]+=sig*gain*(1-max(0,pan)); out[s:e,1]+=sig*gain*(1+min(0,pan))
BAR=2.5   # 96 bpm, 4/4
CH=[[57,60,64],[53,57,60],[48,52,55,60],[55,59,62]]   # Am F C G
# --- pad (detuned saw stack, filtered, slow swell)
for k in range(int(DUR/(2*BAR))+1):
    start=k*2*BAR; ch=CH[k%4]; L=2*BAR+.6; n=int(L*SR); tt=np.arange(n)/SR; sig=np.zeros(n)
    for m in ch:
        for det in (-.07,0,.08):
            f=note(m-12)*2**(det/12); sig+=2*((tt*f)%1)-1
    sig=lp(sig/len(ch)/3,.035)*env(n,1.2,1.0)
    add(sig,start,.34,pan=.2 if k%2 else -.2)
# --- sub bass
for k in range(int(DUR/(2*BAR))+1):
    n=int(2*BAR*SR); tt=np.arange(n)/SR; m=CH[k%4][0]-24
    add(np.sin(2*np.pi*note(m)*tt)*env(n,.3,.6),k*2*BAR,.22)
# --- pluck arpeggio (from the intro scene)
step=BAR/8
for i in range(int((40.2-5.6)/step)):
    st=5.6+i*step; k=int(st/(2*BAR))%4; ch=CH[k]; m=ch[[0,1,2,1,len(ch)-1,1,2,0][i%8]]+12+(12 if i%16>=8 else 0)
    n=int(.9*SR); tt=np.arange(n)/SR; f=note(m)
    sig=(np.sin(2*np.pi*f*tt)+.35*np.sin(4*np.pi*f*tt)+.12*np.sin(6*np.pi*f*tt))*np.exp(-tt*5.5)
    add(sig,st,.085*(.7+.3*np.sin(i)),pan=.35*np.sin(i*1.3))
# --- soft pulse on the beat (skills → achievements)
for i in range(int((40.2-11.2)/(BAR/4))):
    st=11.2+i*BAR/4; n=int(.35*SR); tt=np.arange(n)/SR
    f=60*np.exp(-tt*18)+42; sig=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)
    add(sig,st,.28 if i%4==0 else .14)
# --- whooshes into each scene
rng=np.random.default_rng(1)
for b in [5.6,11.2,18.2,28.2,34.2,40.2]:
    n=int(1.1*SR); noise=rng.normal(0,1,n); sw=np.linspace(.01,.25,n)**1.5
    acc=0.;y=np.empty(n)
    for i in range(n): acc+=sw[i]*(noise[i]-acc); y[i]=acc
    e=np.concatenate([np.linspace(0,1,int(.85*SR))**2,np.linspace(1,0,n-int(.85*SR))])
    add(y*e,b-.85,.5,pan=.3)
# --- impacts: title and finale
for st,g in [(1.0,.9),(40.2,.7),(44.6,.5)]:
    n=int(2.5*SR); tt=np.arange(n)/SR
    boom=np.sin(2*np.pi*(45*tt+30*(1-np.exp(-tt*8))/8))*np.exp(-tt*2.2)
    shimmer=sum(np.sin(2*np.pi*note(m)*tt)*np.exp(-tt*1.4) for m in (76,79,84))/3
    add(boom*.8+shimmer*.25,st,g)
# --- master: gentle intro/outro fades, soft clip, normalise to -1 dBFS
fade=np.ones(N); fi=int(.6*SR); fo=int(2.2*SR); fade[:fi]=np.linspace(0,1,fi); fade[-fo:]=np.linspace(1,0,fo)**1.5
out*=fade[:,None]; out=np.tanh(out*1.2); out/=np.abs(out).max(); out*=10**(-1/20)
pcm=(out*32767).astype('<i2')
with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'soundtrack.wav'),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('soundtrack.wav', DUR, 's')
