import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

mkdirSync("/home/ubuntu/webdev-static-assets/olucha", { recursive: true });
execFileSync("python3", ["-c", `from PIL import Image
src = Image.open('/home/ubuntu/upload/1000076606.jpg').convert('RGBA')
# Crop the source around the large OKV symbol, then remove the white background.
crop = src.crop((450, 450, 3100, 2100))
pixels = crop.load()
for y in range(crop.height):
    for x in range(crop.width):
        r, g, b, a = pixels[x, y]
        if r > 242 and g > 242 and b > 242:
            pixels[x, y] = (255, 255, 255, 0)
crop.thumbnail((1000, 700), Image.Resampling.LANCZOS)
crop.save('/home/ubuntu/webdev-static-assets/olucha/okv-mark-only.png', optimize=True)
`]);
console.log("created /home/ubuntu/webdev-static-assets/olucha/okv-mark-only.png");
