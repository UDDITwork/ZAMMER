"""DALL-E 3 batch runner — reads brand_prompts.json, generates images, uploads to Cloudinary."""
import os, sys, json, time, requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "dr17ap4sb")
CLOUD_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUD_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

SCRIPTS = Path(__file__).parent
OUT = SCRIPTS / "generated_brand_products"
OUT.mkdir(exist_ok=True)

PREFIX = (
    "For this image follow these rules strictly: "
    "3:4 portrait ratio (1024x1365). Full body shot of a real Indian model, head to shoes visible, no cropping. "
    "Ultra-realistic commercial e-commerce photography, NOT illustration. "
    "Shot on Sony A7III 85mm f/1.4, shallow DOF. Natural Indian skin tones, realistic texture. "
    "NO text, watermark, brand name or typography on the image. "
    "Solid color clean background. "
)

def gen_one(item, idx, total):
    fname = item["filename"]
    out_path = OUT / f"{fname}.png"
    if out_path.exists() and out_path.stat().st_size > 10000:
        print(f"[{idx}/{total}] SKIP {fname}")
        return fname, str(out_path)

    print(f"[{idx}/{total}] GEN  {fname} ...", flush=True)
    try:
        r = requests.post("https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
            json={"model":"dall-e-3","prompt": PREFIX + item["prompt"],
                  "n":1,"size":"1024x1792","quality":"hd","response_format":"url"},
            timeout=120)
        r.raise_for_status()
        url = r.json()["data"][0]["url"]
        img = requests.get(url, timeout=60)
        img.raise_for_status()
        with open(out_path,"wb") as f: f.write(img.content)
        kb = out_path.stat().st_size/1024
        print(f"[{idx}/{total}] OK   {fname} ({kb:.0f}KB)")
        return fname, str(out_path)
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code if e.response else "?"
        msg = ""
        try: msg = e.response.json().get("error",{}).get("message","")[:150]
        except: pass
        print(f"[{idx}/{total}] FAIL {fname} (HTTP {code}): {msg}")
        if code == 429:
            print(f"  Rate limited, waiting 60s...")
            time.sleep(60)
            return gen_one(item, idx, total)
        return fname, None
    except Exception as e:
        print(f"[{idx}/{total}] ERR  {fname}: {e}")
        return fname, None

def upload_one(fname, local_path):
    import cloudinary, cloudinary.uploader
    cloudinary.config(cloud_name=CLOUD_NAME, api_key=CLOUD_KEY, api_secret=CLOUD_SECRET)
    try:
        r = cloudinary.uploader.upload(local_path,
            folder="zammer_banners/brand_products", public_id=fname,
            overwrite=True, resource_type="image")
        return r["secure_url"]
    except Exception as e:
        print(f"  UPLOAD FAIL {fname}: {e}")
        return None

def main():
    with open(SCRIPTS / "brand_prompts.json") as f:
        prompts = json.load(f)

    total = len(prompts)
    # Parse optional slice args: python dalle_runner.py [start] [end]
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end = int(sys.argv[2]) if len(sys.argv) > 2 else total
    batch = prompts[start:end]

    print(f"\n{'='*50}")
    print(f" DALL-E 3 Generator — items {start}-{end} of {total}")
    print(f"{'='*50}\n")

    # Phase 1: Generate
    generated = {}
    for i, item in enumerate(batch, start+1):
        fname, path = gen_one(item, i, total)
        if path: generated[fname] = path
        time.sleep(13)  # ~4.5/min to stay under rate limit

    print(f"\nGenerated: {len(generated)}/{len(batch)}")

    # Phase 2: Upload to Cloudinary
    print("\nUploading to Cloudinary...")
    results = {}
    for fname, path in generated.items():
        print(f"  Upload {fname}...", end=" ", flush=True)
        url = upload_one(fname, path)
        if url:
            results[fname] = url
            print("OK")
        else:
            print("FAIL")

    # Save results
    results_file = SCRIPTS / f"brand_urls_{start}_{end}.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDONE: {len(results)}/{len(batch)} uploaded")
    print(f"URLs: {results_file}")

if __name__ == "__main__":
    main()
