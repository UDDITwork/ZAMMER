"""
ZAMMER Banner Image Generation & Upload Pipeline
Uses Google Gemini 2.5 Flash for image generation, uploads to Cloudinary,
and outputs banner_urls.json for database seeding.
"""

import os
import sys
import json
import time
import base64
import threading
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Dependencies ---
from dotenv import load_dotenv
from google import genai
from google.genai import types
import cloudinary
import cloudinary.uploader
from PIL import Image

# --- Load environment ---
BACKEND_ENV = Path(__file__).parent.parent / "backend" / ".env"
if BACKEND_ENV.exists():
    load_dotenv(BACKEND_ENV)

# --- Cloudinary config (fallback to hardcoded if env not available) ---
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dr17ap4sb"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "826141828894487"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "RYIjPUnsL6ooJ89KUWyqzSWe5bQ"),
    secure=True
)

# --- Gemini API keys (rotated for parallel usage) ---
API_KEYS = [
    "AIzaSyCQXP8Wqrr-oQLI_4stIdS5ZcbCg612F6A",
    "AIzaSyDnAuODmS97F7OAA1nmNSw3fpke6ATWB9s",
    "AIzaSyCKh3Q_45ojFsPvSQPTllngMaqcgI2AzNI",
]

MODEL = "gemini-2.5-flash-image"

# Thread-safe key rotation
_key_index = 0
_key_lock = threading.Lock()

def get_next_client():
    global _key_index
    with _key_lock:
        key = API_KEYS[_key_index % len(API_KEYS)]
        _key_index += 1
    return genai.Client(api_key=key)


# --- Category hierarchy (mirrors categoryHierarchy.js) ---
CATEGORY_HIERARCHY = {
    "Men Fashion": {
        "Ethnic Wear": ["Kurtas & Kurta Sets", "Sherwanis", "Nehru Jackets", "Ethnic Sets", "Dhotis & Mundus"],
        "Western Wear": ["T-Shirts", "Shirts", "Jeans", "Trousers", "Shorts"],
        "Winter Wear": ["Jackets", "Sweaters & Sweatshirts", "Thermals"],
        "Sportswear": ["Track Pants", "Sports T-Shirts", "Sports Shorts"],
        "Sleepwear & Loungewear": ["Night Suits", "Pyjamas", "Lounge Pants"],
    },
    "Women Fashion": {
        "Ethnic Wear": ["Sarees, Blouses & Petticoats", "Kurtis, Sets & Fabrics", "Suits & Dress Material", "Lehengas", "Dupattas & Stoles"],
        "Western Wear": ["Tops & T-Shirts", "Dresses", "Jeans & Jeggings", "Pants & Palazzos", "Skirts", "Jumpsuits & Playsuits"],
        "Winter Wear": ["Sweaters & Cardigans", "Jackets & Coats", "Sweatshirts & Hoodies"],
        "Sleepwear & Loungewear": ["Night Suits", "Nighties & Nightgowns", "Loungewear Sets"],
        "Bottom Wear": ["Leggings", "Palazzos", "Capris"],
        "Lingerie & Innerwear": ["Bras", "Panties", "Shapewear"],
    },
    "Kids Fashion": {
        "Boys Wear": ["T-Shirts & Polos", "Shirts", "Jeans & Pants", "Ethnic Wear", "Sets & Outfits"],
        "Girls Wear": ["Dresses & Frocks", "Tops & T-Shirts", "Lehengas & Ethnic", "Jeans & Pants", "Skirts"],
        "Infant Wear": ["Rompers & Bodysuits", "Sets", "Essentials"],
        "School Uniforms": ["Shirts & Blouses", "Pants & Skirts", "Accessories"],
    },
}

OUTPUT_DIR = Path(__file__).parent / "generated_banners"
RESULTS_FILE = Path(__file__).parent / "banner_urls.json"


def build_prompt(level, cat_l1, cat_l2=None, cat_l3=None):
    """Build a fashion-appropriate prompt for each banner level."""
    base = (
        "Professional high-quality fashion photography for a premium international clothing brand e-commerce banner. "
        "Clean, elegant, minimalist composition. Studio lighting. No text overlays. No watermarks. No logos. "
        "White and warm-toned background. Premium luxury aesthetic. "
    )
    if level == 1:
        gender_map = {
            "Men Fashion": "Stylish male model wearing premium contemporary fashion outfit, sophisticated menswear editorial photo, tailored clothing, confident pose, neutral background",
            "Women Fashion": "Elegant female model wearing premium designer fashion outfit, high-end womenswear editorial photo, graceful pose, flowing fabrics, neutral background",
            "Kids Fashion": "Adorable children wearing colorful premium kids fashion outfits, playful poses, bright clean studio setting, happy expressions, modern children clothing",
        }
        return base + gender_map.get(cat_l1, f"Premium {cat_l1} fashion photography")

    elif level == 2:
        specifics = {
            "Ethnic Wear": "traditional ethnic clothing beautifully arranged, rich fabrics and embroidery details",
            "Western Wear": "modern western casual and formal clothing display, clean contemporary style",
            "Winter Wear": "cozy winter fashion items, warm fabrics, layered outfits, seasonal styling",
            "Sportswear": "athletic and sporty clothing items, dynamic energy, activewear display",
            "Sleepwear & Loungewear": "comfortable loungewear and sleepwear, soft fabrics, relaxed atmosphere",
            "Bottom Wear": "stylish bottom wear collection, pants and skirts arrangement, clean display",
            "Lingerie & Innerwear": "elegant innerwear collection displayed tastefully, minimalist styling, soft tones",
            "Boys Wear": "trendy boys clothing collection, playful yet stylish, modern kids fashion",
            "Girls Wear": "beautiful girls clothing collection, colorful and elegant, modern kids fashion",
            "Infant Wear": "adorable infant clothing collection, soft pastels, tiny outfits beautifully arranged",
            "School Uniforms": "neat school uniform collection, crisp and organized display, professional look",
        }
        detail = specifics.get(cat_l2, f"{cat_l2} clothing collection display")
        return base + f"Category: {cat_l1} > {cat_l2}. {detail}"

    elif level == 3:
        return (
            base
            + f"Specific product category: {cat_l1} > {cat_l2} > {cat_l3}. "
            + f"Close-up showcase of {cat_l3} items, detailed fabric textures visible, "
            + f"premium product photography style, clean arrangement of {cat_l3.lower()} items."
        )
    return base


def generate_image(prompt, save_path, retries=3):
    """Generate an image using Gemini and save it."""
    for attempt in range(retries):
        try:
            client = get_next_client()
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )

            # Extract image from response
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        img_data = part.inline_data.data
                        # Save the image
                        img = Image.open(BytesIO(img_data))
                        img = img.convert("RGB")
                        img.save(str(save_path), "JPEG", quality=90)
                        print(f"  [OK] Generated: {save_path.name}")
                        return True

            print(f"  [WARN] No image in response for {save_path.name}, attempt {attempt+1}")
            time.sleep(2)

        except Exception as e:
            err_msg = str(e)
            print(f"  [ERR] Attempt {attempt+1} for {save_path.name}: {err_msg[:100]}")
            if "429" in err_msg or "quota" in err_msg.lower():
                time.sleep(10 * (attempt + 1))
            else:
                time.sleep(3 * (attempt + 1))

    print(f"  [FAIL] Could not generate: {save_path.name}")
    return False


def upload_to_cloudinary(file_path, folder, public_id_prefix):
    """Upload a single image to Cloudinary and return the result."""
    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            folder=f"zammer_banners/{folder}",
            public_id=public_id_prefix,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
        print(f"  [UPLOAD OK] {result['secure_url'][:80]}...")
        return {
            "imageUrl": result["secure_url"],
            "cloudinaryPublicId": result["public_id"],
        }
    except Exception as e:
        print(f"  [UPLOAD FAIL] {file_path.name}: {e}")
        return None


def sanitize(name):
    """Make a filesystem-safe name."""
    return name.replace(" ", "_").replace(",", "").replace("&", "and").replace("/", "-").lower()


def main():
    print("=" * 60)
    print("ZAMMER Banner Image Generation & Upload Pipeline")
    print("=" * 60)

    # Verify Cloudinary config
    cn = os.getenv("CLOUDINARY_CLOUD_NAME", "dr17ap4sb")
    print(f"[OK] Cloudinary cloud: {cn}")

    results = {"level1": [], "level2": [], "level3": []}
    tasks = []  # (level, prompt, save_path, metadata)

    # --- Build task list ---
    # Level 1: 3 banners
    for cat_l1 in CATEGORY_HIERARCHY:
        fname = f"{sanitize(cat_l1)}.jpg"
        save_path = OUTPUT_DIR / "level1" / fname
        prompt = build_prompt(1, cat_l1)
        tasks.append((1, prompt, save_path, {"categoryLevel1": cat_l1}))

    # Level 2: subcategories
    for cat_l1, l2_dict in CATEGORY_HIERARCHY.items():
        for cat_l2 in l2_dict:
            fname = f"{sanitize(cat_l1)}_{sanitize(cat_l2)}.jpg"
            save_path = OUTPUT_DIR / "level2" / fname
            prompt = build_prompt(2, cat_l1, cat_l2)
            tasks.append((2, prompt, save_path, {"categoryLevel1": cat_l1, "categoryLevel2": cat_l2}))

    # Level 3: sub-subcategories
    for cat_l1, l2_dict in CATEGORY_HIERARCHY.items():
        for cat_l2, l3_list in l2_dict.items():
            for cat_l3 in l3_list:
                fname = f"{sanitize(cat_l1)}_{sanitize(cat_l2)}_{sanitize(cat_l3)}.jpg"
                save_path = OUTPUT_DIR / "level3" / fname
                prompt = build_prompt(3, cat_l1, cat_l2, cat_l3)
                tasks.append((3, prompt, save_path, {
                    "categoryLevel1": cat_l1,
                    "categoryLevel2": cat_l2,
                    "categoryLevel3": cat_l3,
                }))

    print(f"\n[INFO] Total images to generate: {len(tasks)}")
    print(f"  Level 1: {sum(1 for t in tasks if t[0]==1)}")
    print(f"  Level 2: {sum(1 for t in tasks if t[0]==2)}")
    print(f"  Level 3: {sum(1 for t in tasks if t[0]==3)}")

    # --- Generate images (parallel, 3 workers = 1 per API key) ---
    print("\n--- PHASE 1: Generating images with Gemini ---")

    def generate_task(task):
        level, prompt, save_path, meta = task
        save_path.parent.mkdir(parents=True, exist_ok=True)
        if save_path.exists():
            print(f"  [SKIP] Already exists: {save_path.name}")
            return (level, save_path, meta, True)
        success = generate_image(prompt, save_path)
        return (level, save_path, meta, success)

    generated = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(generate_task, t): t for t in tasks}
        for future in as_completed(futures):
            result = future.result()
            if result[3]:  # success
                generated.append(result)

    print(f"\n[INFO] Successfully generated: {len(generated)} / {len(tasks)} images")

    # --- Upload to Cloudinary (parallel) ---
    print("\n--- PHASE 2: Uploading to Cloudinary ---")

    def upload_task(item):
        level, save_path, meta, _ = item
        level_folder = f"level{level}"
        pub_id = save_path.stem
        upload_result = upload_to_cloudinary(save_path, level_folder, pub_id)
        if upload_result:
            return (level, {**meta, **upload_result})
        return None

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(upload_task, item): item for item in generated}
        for future in as_completed(futures):
            result = future.result()
            if result:
                level, data = result
                level_key = f"level{level}"
                results[level_key].append(data)

    # --- Save results ---
    print(f"\n--- PHASE 3: Saving results ---")
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[OK] Saved {RESULTS_FILE}")
    print(f"  Level 1 URLs: {len(results['level1'])}")
    print(f"  Level 2 URLs: {len(results['level2'])}")
    print(f"  Level 3 URLs: {len(results['level3'])}")

    print("\n" + "=" * 60)
    print("Pipeline complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
