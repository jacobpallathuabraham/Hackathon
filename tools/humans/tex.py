import sys, os, glob
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in glob.glob(os.path.join(src, '*.tga')):
    n = os.path.basename(f)[:-4]
    if n.endswith('_specular'): continue
    im = Image.open(f)
    size = 2048 if n.endswith('head_color') else 1024
    if n.endswith('opacity_color'):
        im = im.convert('RGBA').resize((1024, 1024), Image.LANCZOS)
        im.save(os.path.join(dst, n + '.png'), optimize=True)
    else:
        im = im.convert('RGB').resize((size, size), Image.LANCZOS)
        im.save(os.path.join(dst, n + '.jpg'), quality=86, optimize=True, progressive=False)
    print(n, im.mode, im.size)
