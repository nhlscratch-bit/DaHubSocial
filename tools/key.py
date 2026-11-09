import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
def key(path):
    a=np.array(Image.open(path).convert('RGB')).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
    gd=g-np.maximum(r,b); al=1-np.clip((gd-45)/120,0,1)
    a[...,1]=np.where(gd>0,np.minimum(g,np.maximum(r,b)+4),g)
    al=ndi.binary_opening(al>0.05,iterations=1)*al
    return Image.fromarray(np.dstack([a,al*255]).astype(np.uint8),'RGBA')
def split(im, n):
    al=np.array(im.getchannel('A'))>30; cols=al.sum(0)
    lab,k=ndi.label(ndi.binary_dilation(cols>3,iterations=6))
    parts=sorted([s[0] for s in ndi.find_objects(lab)],key=lambda s:-(s.stop-s.start))[:n]
    return sorted(parts,key=lambda s:s.start)
if __name__=='__main__':
    src,outdir,names=sys.argv[1],sys.argv[2],sys.argv[3].split(',')
    im=key(src); res=[]
    for nm,s in zip(names, split(im,len(names)) if len(names)>1 else [slice(0,im.width)]):
        c=im.crop((s.start,0,s.stop,im.height)); bb=c.getchannel('A').point(lambda v:255 if v>30 else 0).getbbox(); c=c.crop(bb)
        c.save(f'{outdir}/{nm}.png',optimize=True); res.append((nm,c.size))
    print(res)
