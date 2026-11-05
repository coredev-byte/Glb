"""Extrai a máscara dourada da logo LR Importados.

Gera:
  tools/glb/work/logo-mask.png  -> máscara binária ampliada (entrada do potrace)
  public/brand/logo.png         -> logo com fundo transparente (uso 2D / overlay)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[2]
src = root / "public/brand/lr-imports-logo-original.jpg"
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# ouro = vermelho alto e bem acima do azul; o fundo preto/cinza fica de fora
soft = np.clip((r - b - 28) / 40.0, 0, 1) * np.clip((r - 80) / 60.0, 0, 1)

# restringe ao disco preto da logo (descarta cantos fora do círculo)
h, w = soft.shape
yy, xx = np.mgrid[0:h, 0:w]
cx, cy, rad = w * 0.5, h * 0.5, min(w, h) * 0.5 + 40
soft *= ((xx - cx) ** 2 + (yy - cy) ** 2 < rad ** 2)

# recorta a área útil
ys, xs = np.where(soft > 0.5)
pad = 12
x0, x1, y0, y1 = max(xs.min() - pad, 0), min(xs.max() + pad, w), max(ys.min() - pad, 0), min(ys.max() + pad, h)
soft_c = soft[y0:y1, x0:x1]
rgb_c = a[y0:y1, x0:x1]

# máscara ampliada 4x (contornos mais suaves no trace)
mimg = Image.fromarray((soft_c * 255).astype(np.uint8))
mimg = mimg.resize((mimg.width * 4, mimg.height * 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
m = (np.asarray(mimg) > 95).astype(np.uint8) * 255
# potrace traça o escuro: preto = logo
Image.fromarray(255 - m).save(root / "tools/glb/work/logo-mask.png")

# PNG transparente em alta
rgba = np.dstack([rgb_c, soft_c * 255]).astype(np.uint8)
out = Image.fromarray(rgba, "RGBA")
out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
out.save(root / "public/brand/logo.png")
print("crop", (x0, y0, x1, y1), "mask", mimg.size)
