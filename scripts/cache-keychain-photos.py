"""Pin the current remote keychain photos for asset-specific mask authoring.

Only downloads the public image URLs in the keychain catalog. Existing local
files are left unchanged. This does not update the catalog or write to Firebase.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import subprocess
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
catalog = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import { KEYCHAINS } from './src/lib/keychains.ts'; "
    "console.log(JSON.stringify(KEYCHAINS.map(({id,image_url}) => ({id,image_url}))));",
], cwd=ROOT, text=True))


def cache(product):
    name = product['id'].removeprefix('keychain-')
    target = ROOT / 'public/keychains' / (name + '.png')
    try:
        if not target.exists():
            request = Request(product['image_url'], headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(request, timeout=30) as response:
                data = response.read(12 * 1024 * 1024 + 1)
            if len(data) > 12 * 1024 * 1024:
                raise ValueError('Image exceeds authoring download limit')
            image = ImageOps.exif_transpose(Image.open(BytesIO(data))).convert('RGB')
            image.save(target, optimize=True)
        image = Image.open(target)
        return {'id': product['id'], 'path': str(target.relative_to(ROOT)),
                'size': image.size, 'bytes': target.stat().st_size,
                'sha256': sha256(target.read_bytes()).hexdigest()}
    except Exception as error:
        return {'id': product['id'], 'error': type(error).__name__}


remote = [product for product in catalog if product['image_url'].startswith('https://')]
with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(cache, remote))
print(json.dumps(results, indent=2))
if any('error' in result for result in results):
    raise SystemExit(1)