# Cuts the front (leftmost) figure out of a green-screen turnaround sheet -> transparent PNG.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import key_tight as KT
src, out = sys.argv[1], sys.argv[2]
im = KT.key(src)[0]; a = np.array(im.getchannel('A')) > 40
cols = a.sum(0) > 6; lab, n = ndi.label(ndi.binary_dilation(cols, iterations=4))
parts = sorted(ndi.find_objects(lab), key=lambda s: s[0].start)
big = [p for p in parts if p[0].stop - p[0].start > im.width * 0.12]
s = big[0][0]; c = im.crop((s.start, 0, s.stop, im.height))
c = c.crop(c.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox()); c.save(out); print(out, c.size)
