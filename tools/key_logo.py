import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
# logo cutout: remove the screen green everywhere (incl. enclosed pockets), keep darker greens like parsley
a=np.array(Image.open(sys.argv[1]).convert('RGB')).astype(float)
border=np.concatenate([a[:8].reshape(-1,3),a[-8:].reshape(-1,3),a[:,:8].reshape(-1,3),a[:,-8:].reshape(-1,3)]); bg=np.median(border,0)
d=np.sqrt(((a-bg)**2).sum(2))
al=np.clip((d-70)/60,0,1)
# despill: pull green toward the other channels where it's a fringe
sp=a[...,1]-np.maximum(a[...,0],a[...,2]); fringe=(al<1)&(sp>0)
a[...,1]=np.where(fringe, np.maximum(a[...,0],a[...,2])+sp*0.15, a[...,1])
al=ndi.binary_opening(al>0.02,iterations=1)*al
im=Image.fromarray(np.dstack([a,al*255]).astype(np.uint8),'RGBA')
bb=im.getchannel('A').point(lambda v:255 if v>30 else 0).getbbox(); im.crop(bb).save(sys.argv[2])
