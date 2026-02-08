"""
ZAMMER Promotional Banner Image Generation & Upload Pipeline
Generates 12 promotional/discount banners using Google Gemini 2.5 Flash,
uploads to Cloudinary, and outputs promo_banner_urls.json for database seeding.
"""

import os
import sys
import json
import time
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


# --- 12 Promotional Banner Themes ---
PROMO_THEMES = [
    # Men's Fashion (4 banners)
    {
        "id": "men_new_drop",
        "title": "NEW Drop",
        "subtitle": "Fresh Styles Just In",
        "discountText": "UPTO 50% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Stylish young male model in trendy streetwear outfit, "
            "vibrant orange and black background, dynamic urban setting, bold modern aesthetic, "
            "high energy fashion photography, magazine quality, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "men_flash_sale",
        "title": "Flash Sale",
        "subtitle": "24 Hours Only",
        "discountText": "FLAT 60% OFF",
        "ctaText": "GRAB NOW",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Western%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Male model in casual western wear, "
            "denim jacket and jeans, dramatic lighting, deep blue and electric neon background, "
            "urgent sale energy, premium fashion photography, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "men_trending",
        "title": "Trending Now",
        "subtitle": "What Everyone Is Wearing",
        "discountText": "STARTING Rs.499",
        "ctaText": "EXPLORE",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Ethnic%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Confident male model in ethnic kurta set, "
            "rich warm tones, gold and maroon background, festive Indian fashion vibes, "
            "editorial quality, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "men_season_end",
        "title": "Season End Sale",
        "subtitle": "Last Chance to Save Big",
        "discountText": "UPTO 70% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Winter%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Male model in winter jacket and layered outfit, "
            "cool blue and white tones, snowy aesthetic, premium winter fashion, "
            "clean studio shot, no text on image, no watermarks, no logos"
        )
    },

    # Women's Fashion (4 banners)
    {
        "id": "women_new_drop",
        "title": "NEW Drop",
        "subtitle": "Curated Elegance Awaits",
        "discountText": "UPTO 60% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Elegant female model in flowing designer dress, "
            "pastel pink and coral gradient background, graceful pose, premium womenswear editorial, "
            "soft beautiful lighting, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "women_buy1get1",
        "title": "Buy 1 Get 1",
        "subtitle": "Double the Style",
        "discountText": "BUY 1 GET 1 FREE",
        "ctaText": "SHOP PAIRS",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Western%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Two female models in coordinated western outfits, "
            "vibrant magenta and gold background, playful friendship pose, modern fashion photography, "
            "no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "women_ethnic_fest",
        "title": "Ethnic Fest",
        "subtitle": "Celebrate in Style",
        "discountText": "UPTO 70% OFF",
        "ctaText": "EXPLORE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Ethnic%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Beautiful female model in gorgeous saree or lehenga, "
            "rich jewel tones background with gold accents, festive Indian atmosphere, "
            "bridal or party fashion, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "women_flash_sale",
        "title": "Flash Sale",
        "subtitle": "Limited Time Deals",
        "discountText": "FLAT 50% OFF",
        "ctaText": "HURRY",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Sleepwear%20%26%20Loungewear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Female model in comfortable chic loungewear, "
            "soft lavender and white tones, relaxed cozy aesthetic, lifestyle photography, "
            "warm inviting mood, no text on image, no watermarks, no logos"
        )
    },

    # Kids Fashion (4 banners)
    {
        "id": "kids_new_drop",
        "title": "NEW Drop",
        "subtitle": "Playful Styles for Little Ones",
        "discountText": "UPTO 40% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Adorable children in colorful trendy outfits, "
            "bright rainbow gradient background, playful happy poses, modern kids fashion photography, "
            "cheerful vibrant energy, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "kids_back_to_school",
        "title": "Back to School",
        "subtitle": "School-Ready Styles",
        "discountText": "STARTING Rs.299",
        "ctaText": "SHOP NOW",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion/School%20Uniforms",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Happy children in neat school uniforms, "
            "clean bright yellow and white background, school setting with books and bags, "
            "crisp organized look, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "kids_party_wear",
        "title": "Party Ready",
        "subtitle": "Dress Them Up",
        "discountText": "UPTO 50% OFF",
        "ctaText": "EXPLORE",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion/Girls%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Cute children in party dresses and formal outfits, "
            "sparkly purple and silver background, birthday party vibes, adorable poses, "
            "premium kids fashion, no text on image, no watermarks, no logos"
        )
    },
    {
        "id": "kids_mega_sale",
        "title": "Mega Kids Sale",
        "subtitle": "Biggest Discounts Ever",
        "discountText": "UPTO 70% OFF",
        "ctaText": "GRAB NOW",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion/Boys%20Wear",
        "prompt": (
            "Premium fashion e-commerce promotional banner. Energetic boys in cool casual outfits, "
            "sporty and trendy, bright green and blue gradient background, action poses, "
            "dynamic kids fashion photography, no text on image, no watermarks, no logos"
        )
    },
]

OUTPUT_DIR = Path(__file__).parent / "generated_promo_banners"
RESULTS_FILE = Path(__file__).parent / "promo_banner_urls.json"


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


def upload_to_cloudinary(file_path, public_id_prefix):
    """Upload a single image to Cloudinary and return the result."""
    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            folder="zammer_banners/promo",
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


def main():
    print("=" * 60)
    print("ZAMMER Promotional Banner Generation Pipeline")
    print(f"Themes: {len(PROMO_THEMES)} promotional banners")
    print("=" * 60)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ─── Phase 1: Generate Images ───
    print("\n📸 PHASE 1: Generating promotional banner images...")
    tasks = []
    for theme in PROMO_THEMES:
        filename = f"{theme['id']}.jpg"
        save_path = OUTPUT_DIR / filename

        if save_path.exists():
            print(f"  [SKIP] Already exists: {filename}")
            continue

        tasks.append((theme, save_path))

    if tasks:
        print(f"\n  Generating {len(tasks)} images with {min(3, len(tasks))} workers...")
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(generate_image, task[0]["prompt"], task[1]): task
                for task in tasks
            }
            for future in as_completed(futures):
                task = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"  [ERR] Thread error for {task[0]['id']}: {e}")
    else:
        print("  All images already generated!")

    # ─── Phase 2: Upload to Cloudinary ───
    print("\n☁️  PHASE 2: Uploading to Cloudinary...")
    results = []

    upload_tasks = []
    for theme in PROMO_THEMES:
        filename = f"{theme['id']}.jpg"
        file_path = OUTPUT_DIR / filename

        if not file_path.exists():
            print(f"  [SKIP] Missing local file: {filename}")
            continue

        upload_tasks.append((theme, file_path))

    if upload_tasks:
        print(f"\n  Uploading {len(upload_tasks)} images with 5 workers...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(upload_to_cloudinary, task[1], task[0]["id"]): task
                for task in upload_tasks
            }
            for future in as_completed(futures):
                task = futures[future]
                theme = task[0]
                try:
                    upload_result = future.result()
                    if upload_result:
                        results.append({
                            "imageUrl": upload_result["imageUrl"],
                            "cloudinaryPublicId": upload_result["cloudinaryPublicId"],
                            "title": theme["title"],
                            "subtitle": theme["subtitle"],
                            "discountText": theme["discountText"],
                            "ctaText": theme["ctaText"],
                            "targetGender": theme["targetGender"],
                            "linkUrl": theme["linkUrl"],
                            "showOnHomePage": True,
                            "showOnDashboard": True,
                        })
                except Exception as e:
                    print(f"  [ERR] Upload thread error for {theme['id']}: {e}")

    # ─── Phase 3: Save JSON ───
    print(f"\n💾 PHASE 3: Saving results to {RESULTS_FILE.name}...")
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"✅ COMPLETE: {len(results)}/{len(PROMO_THEMES)} promo banners processed")
    print(f"   Output: {RESULTS_FILE}")
    print(f"   Images: {OUTPUT_DIR}")
    print(f"{'=' * 60}")

    if len(results) < len(PROMO_THEMES):
        print(f"\n⚠️  {len(PROMO_THEMES) - len(results)} banners failed. Re-run to retry.")

    return results


if __name__ == "__main__":
    main()
