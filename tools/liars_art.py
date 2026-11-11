# Builds games/liars/art/<id>/<pose>.webp: Liars Party poses keyed on their full original canvas (so poses line up), plus Spades fill-ins.
import sys, os, shutil
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import key as K, key_tight as KT
OUT='games/liars/art'
def holes(im, MIN=60):
    a=np.array(im).astype(int); r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    bg=(g>200)&(r<70)&(b<80)&(al>0); lab,n=ndi.label(bg); s=ndi.sum(bg,lab,range(1,n+1))
    big=np.isin(lab,[i+1 for i,z in enumerate(s) if z>=MIN]); big=ndi.binary_dilation(big,iterations=2)&(g>r+40)&(g>b+40)
    a[...,3]=np.where(big,0,al); return Image.fromarray(a.astype(np.uint8),'RGBA')
LIARS={'mm':('Man Man',True),'sl':('Slugga',False)}
for cid,(name,tight) in LIARS.items():
    src=f'games/characters/{name}/CAP or Not/originals'; os.makedirs(f'{OUT}/{cid}',exist_ok=True)
    for f in sorted(os.listdir(src)):
        pose=f.rsplit('.',1)[0]
        if pose=='turnaround': continue
        im=(KT.key(f'{src}/{f}')[0] if tight else K.key(f'{src}/{f}')); im=holes(im)
        if pose=='portrait':
            bb=im.getchannel('A').point(lambda v:255 if v>30 else 0).getbbox(); im=im.crop(bb); im.thumbnail((360,360))
        else:
            im=im.resize((512,int(512*im.height/im.width)),Image.LANCZOS)
        im.save(f'{OUT}/{cid}/{pose}.webp',quality=82,method=6)
for cid in ['fp','kd','mb','tc']:
    os.makedirs(f'{OUT}/{cid}',exist_ok=True)
    for p in ['idle','slap','celebrate','mad','portrait']:
        im=Image.open(f'games/spades/img/{cid}_{p}.webp')
        if p!='portrait': im=im.resize((512,int(512*im.height/im.width)),Image.LANCZOS)
        else: im.thumbnail((360,360))
        im.save(f'{OUT}/{cid}/{p}.webp',quality=82,method=6)
print('ok')
