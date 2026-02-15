"""Gemini 2.5 Flash Image runner for remaining brand product images."""
import os, sys, json, time, threading
from pathlib import Path
from io import BytesIO

from dotenv import load_dotenv
from google import genai
from google.genai import types
import cloudinary
import cloudinary.uploader
from PIL import Image

SCRIPTS = Path(__file__).parent
OUT = SCRIPTS / "generated_brand_products"
OUT.mkdir(exist_ok=True)

# Load keys from backend/.env
load_dotenv(SCRIPTS.parent / "backend" / ".env")

# Gemini API keys from env (comma-separated GEMINI_API_KEYS or individual GEMINI_API_KEY_*)
_keys_csv = os.environ.get("GEMINI_API_KEYS", "")
if _keys_csv:
    API_KEYS = [k.strip() for k in _keys_csv.split(",") if k.strip()]
else:
    API_KEYS = [v for k, v in sorted(os.environ.items()) if k.startswith("GEMINI_API_KEY")]

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True
)

MODEL = "gemini-2.5-flash-image"
_ki = 0
_lock = threading.Lock()

def get_client():
    global _ki
    with _lock:
        k = API_KEYS[_ki % len(API_KEYS)]
        _ki += 1
    return genai.Client(api_key=k)

PREFIX = (
    "Generate a 3:4 PORTRAIT fashion e-commerce product photo. "
    "CRITICAL: Full body shot of a real Indian model, head to shoes visible, no cropping at all. "
    "Ultra-realistic commercial photography, NOT illustration, NOT cartoon, NOT anime. "
    "Shot on Sony A7III 85mm f/1.4. Natural Indian skin tones, realistic texture. "
    "DO NOT add any text, watermark, brand name, logo or typography. "
    "Solid color clean background unless specified otherwise. "
    "The model's FULL HEAD including hair must be completely visible - do NOT crop the top of the head. "
    "Leave generous space above the head. "
)

def gen_one(item, idx, total):
    fname = item["filename"]
    out_path = OUT / f"{fname}.png"
    if out_path.exists() and out_path.stat().st_size > 10000:
        print(f"[{idx}/{total}] SKIP {fname}")
        return fname, str(out_path)

    print(f"[{idx}/{total}] GEN  {fname} ...", flush=True)
    for attempt in range(3):
        try:
            client = get_client()
            resp = client.models.generate_content(
                model=MODEL,
                contents=PREFIX + item["prompt"],
                config=types.GenerateContentConfig(
                    response_modalities=["image", "text"],
                    temperature=1.0,
                ),
            )
            for part in resp.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    img = Image.open(BytesIO(part.inline_data.data))
                    img.save(str(out_path), "PNG")
                    kb = out_path.stat().st_size / 1024
                    print(f"[{idx}/{total}] OK   {fname} ({kb:.0f}KB)")
                    return fname, str(out_path)
            print(f"[{idx}/{total}] No image in response, retry {attempt+1}")
            time.sleep(5)
        except Exception as e:
            emsg = str(e)[:120]
            print(f"[{idx}/{total}] ERR  {fname} (attempt {attempt+1}): {emsg}")
            if "429" in emsg or "RESOURCE_EXHAUSTED" in emsg:
                time.sleep(30)
            else:
                time.sleep(5)
    print(f"[{idx}/{total}] FAIL {fname} after 3 attempts")
    return fname, None

def upload_one(fname, path):
    try:
        r = cloudinary.uploader.upload(path,
            folder="zammer_banners/brand_products", public_id=fname,
            overwrite=True, resource_type="image")
        return r["secure_url"]
    except Exception as e:
        print(f"  UPLOAD FAIL {fname}: {e}")
        return None

def main():
    with open(SCRIPTS / "brand_prompts.json") as f:
        all_prompts = json.load(f)

    # Find which ones are missing
    existing = {p.stem for p in OUT.glob("*.png") if p.stat().st_size > 10000}
    missing = [p for p in all_prompts if p["filename"] not in existing]

    # Optional slice via args
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end = int(sys.argv[2]) if len(sys.argv) > 2 else len(missing)
    batch = missing[start:end]

    print(f"\n{'='*50}")
    print(f" Gemini Runner — {len(batch)} missing of {len(missing)} total missing")
    print(f" Already have: {len(existing)} images")
    print(f"{'='*50}\n")

    # Generate
    generated = {}
    for i, item in enumerate(batch, 1):
        fname, path = gen_one(item, i, len(batch))
        if path: generated[fname] = path
        time.sleep(4)

    print(f"\nGenerated: {len(generated)}/{len(batch)}")

    # Upload
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

    outf = SCRIPTS / f"gemini_brand_urls.json"
    # Merge with any existing results
    if outf.exists():
        with open(outf) as f:
            old = json.load(f)
        old.update(results)
        results = old
    with open(outf, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDONE: {len(results)} total URLs saved to {outf}")

if __name__ == "__main__":
    main()
