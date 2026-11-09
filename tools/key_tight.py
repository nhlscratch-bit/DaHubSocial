import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
def key(path):
    a=np.array(Image.open(path).convert('RGB')).astype(float)
    h,w,_=a.shape; border=np.concatenate([a[:8].reshape(-1,3),a[-8:].reshape(-1,3),a[:,:8].reshape(-1,3),a[:,-8:].reshape(-1,3)])
    bg=np.median(border,0); d=np.sqrt(((a-bg)**2).sum(2))
    al=np.clip((d-35)/55,0,1)
    # only treat as background if connected to the border region (protect interior lime)
    soft=d<95; lab,n=ndi.label(soft); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    conn=np.isin(lab,list(edge))
    # big enclosed gaps (e.g. between arm and body) are background too; small enclosed regions (shirt stripes) are not
    sizes=ndi.sum(soft,lab,range(1,n+1)); bigenc=np.isin(lab,[i+1 for i,z in enumerate(sizes) if z>40000 and (i+1) not in edge]) & (d<45)
    region=ndi.binary_dilation(conn|bigenc,iterations=2)
    al=np.where(region, al, 1.0)
    sp=(a[...,1]-np.maximum(a[...,0],a[...,2]))>40; edgezone=(al<0.98)&(al>0)
    a[...,1]=np.where(edgezone&sp, np.maximum(a[...,0],a[...,2])+10, a[...,1])
    return Image.fromarray(np.dstack([a,al*255]).astype(np.uint8),'RGBA'), bg
if __name__=='__main__':
    im,bg=key(sys.argv[1]); bb=im.getchannel('A').point(lambda v:255 if v>30 else 0).getbbox(); im.crop(bb).save(sys.argv[2]); print(sys.argv[2], bg)
