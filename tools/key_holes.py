# Clears background green trapped inside a cutout (enclosed gaps key_tight keeps), leaving thin lime trim alone.
import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
p=sys.argv[1]; im=np.array(Image.open(p).convert('RGBA')).astype(int)
r,g,b,a=im[...,0],im[...,1],im[...,2],im[...,3]
bg=(g>200)&(r<70)&(b<80)&(a>0)
lab,n=ndi.label(bg); sizes=ndi.sum(bg,lab,range(1,n+1))
big=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>=400])
big=ndi.binary_dilation(big,iterations=2)&(g>r+40)&(g>b+40)
im[...,3]=np.where(big,0,a); print(p,int(big.sum()),'px cleared')
Image.fromarray(im.astype(np.uint8),'RGBA').save(p)
