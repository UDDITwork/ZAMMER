"""
ZAMMER Level 4 Banner Image Generation & Upload Pipeline
Generates specific product-level banner images using Google Gemini 2.5 Flash,
uploads to Cloudinary, and outputs banner_urls_level4.json for database seeding.

Run locally: python scripts/generate_level4_banners.py
Images are saved to scripts/generated_banners/level4/ and uploaded to Cloudinary.
The output JSON is then embedded into bannerController.js for production seeding.
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

# --- Cloudinary config ---
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


# --- Full 4-Level Category Hierarchy (mirrors categoryHierarchy.js) ---
CATEGORY_HIERARCHY_L4 = {
    "Men Fashion": {
        "Ethnic Wear": {
            "Kurtas & Kurta Sets": ["Cotton Kurta", "Silk Kurta", "Printed Kurta", "Plain Kurta", "Designer Kurta", "Festive Kurta"],
            "Sherwanis": ["Wedding Sherwani", "Reception Sherwani", "Party Sherwani", "Indo-Western Sherwani"],
            "Nehru Jackets": ["Silk Nehru Jacket", "Cotton Nehru Jacket", "Brocade Nehru Jacket", "Printed Nehru Jacket"],
            "Ethnic Sets": ["Kurta Pajama Set", "Pathani Suit", "Dhoti Kurta Set"],
            "Dhotis & Mundus": ["Cotton Dhoti", "Silk Dhoti", "Mundu", "Angavastram"],
        },
        "Western Wear": {
            "T-Shirts": ["Round Neck", "V-Neck", "Polo", "Printed T-Shirt", "Plain T-Shirt", "Graphic T-Shirt", "Oversized T-Shirt"],
            "Shirts": ["Casual Shirts", "Formal Shirts", "Denim Shirts", "Printed Shirts", "Plain Shirts", "Linen Shirts"],
            "Jeans": ["Slim Fit", "Regular Fit", "Skinny", "Straight Fit", "Bootcut", "Ripped Jeans"],
            "Trousers": ["Formal Trousers", "Casual Trousers", "Chinos", "Cargo Pants"],
            "Shorts": ["Casual Shorts", "Sports Shorts", "Denim Shorts", "Bermuda Shorts"],
        },
        "Winter Wear": {
            "Jackets": ["Bomber Jacket", "Denim Jacket", "Leather Jacket", "Puffer Jacket", "Windcheater"],
            "Sweaters & Sweatshirts": ["Pullover Sweater", "Cardigan", "Hoodie", "Sweatshirt", "Fleece Jacket"],
            "Thermals": ["Thermal Top", "Thermal Bottom", "Thermal Set"],
        },
        "Sportswear": {
            "Track Pants": ["Joggers", "Track Pants", "Sports Pants"],
            "Sports T-Shirts": ["Gym T-Shirt", "Running T-Shirt", "Training T-Shirt"],
            "Sports Shorts": ["Gym Shorts", "Running Shorts", "Training Shorts"],
        },
        "Sleepwear & Loungewear": {
            "Night Suits": ["Cotton Night Suit", "Printed Night Suit", "Plain Night Suit"],
            "Pyjamas": ["Cotton Pyjama", "Checked Pyjama", "Printed Pyjama"],
            "Lounge Pants": ["Track Pants", "Lounge Pants", "Joggers"],
        },
    },
    "Women Fashion": {
        "Ethnic Wear": {
            "Sarees, Blouses & Petticoats": ["Sarees", "Blouses", "Petticoats", "Ready To Wear Sarees", "Silk Sarees", "Cotton Sarees", "Georgette Sarees", "Printed Sarees"],
            "Kurtis, Sets & Fabrics": ["Anarkali Kurtis", "Straight Kurtis", "A-Line Kurtis", "Kurta Sets", "Palazzo Sets", "Sharara Sets", "Unstitched Fabric"],
            "Suits & Dress Material": ["Salwar Suits", "Unstitched Suits", "Dress Material", "Churidar Suits", "Patiala Suits"],
            "Lehengas": ["Bridal Lehengas", "Party Lehengas", "Semi-Stitched Lehenga", "Ready-to-Wear Lehenga", "Designer Lehenga"],
            "Dupattas & Stoles": ["Cotton Dupatta", "Silk Dupatta", "Chiffon Dupatta", "Printed Dupatta", "Embroidered Dupatta"],
        },
        "Western Wear": {
            "Tops & T-Shirts": ["Crop Tops", "Tank Tops", "Blouses", "T-Shirts", "Tunics", "Shirts", "Peplum Tops"],
            "Dresses": ["Maxi Dress", "Mini Dress", "Bodycon Dress", "A-Line Dress", "Shift Dress", "Wrap Dress", "Party Dress"],
            "Jeans & Jeggings": ["Skinny Jeans", "Straight Jeans", "Boyfriend Jeans", "High Rise Jeans", "Jeggings"],
            "Pants & Palazzos": ["Palazzo Pants", "Culottes", "Cigarette Pants", "Formal Trousers", "Wide Leg Pants"],
            "Skirts": ["A-Line Skirt", "Pencil Skirt", "Pleated Skirt", "Maxi Skirt", "Mini Skirt"],
            "Jumpsuits & Playsuits": ["Jumpsuits", "Playsuits", "Dungarees", "Co-ord Sets"],
        },
        "Winter Wear": {
            "Sweaters & Cardigans": ["Pullover", "Cardigan", "Poncho", "Shrug", "Cape"],
            "Jackets & Coats": ["Denim Jacket", "Bomber Jacket", "Puffer Jacket", "Long Coat", "Blazer"],
            "Sweatshirts & Hoodies": ["Sweatshirt", "Hoodie", "Fleece Top"],
        },
        "Sleepwear & Loungewear": {
            "Night Suits": ["Cotton Night Suit", "Satin Night Suit", "Printed Night Suit"],
            "Nighties & Nightgowns": ["Cotton Nighty", "Satin Nighty", "Kaftan", "Maxi Gown"],
            "Loungewear Sets": ["Lounge Set", "Kaftan Set", "Co-ord Set"],
        },
        "Bottom Wear": {
            "Leggings": ["Cotton Leggings", "Printed Leggings", "Ankle Leggings", "Churidar Leggings"],
            "Palazzos": ["Printed Palazzo", "Plain Palazzo", "Wide Leg Palazzo"],
            "Capris": ["Cotton Capri", "Denim Capri", "Printed Capri"],
        },
        "Lingerie & Innerwear": {
            "Bras": ["T-Shirt Bra", "Sports Bra", "Padded Bra", "Non-Padded Bra"],
            "Panties": ["Bikini", "Hipster", "Brief", "Thong"],
            "Shapewear": ["Body Shaper", "Tummy Tucker", "Waist Cincher"],
        },
    },
    "Kids Fashion": {
        "Boys Wear": {
            "T-Shirts & Polos": ["Printed T-Shirt", "Plain T-Shirt", "Character T-Shirt", "Polo T-Shirt", "Sports T-Shirt"],
            "Shirts": ["Casual Shirt", "Party Shirt", "School Shirt", "Denim Shirt"],
            "Jeans & Pants": ["Denim Jeans", "Cargo Pants", "Joggers", "Shorts", "Track Pants"],
            "Ethnic Wear": ["Kurta Set", "Dhoti Kurta", "Sherwani", "Nehru Jacket Set"],
            "Sets & Outfits": ["T-Shirt & Shorts Set", "Shirt & Pants Set", "Party Outfit", "Casual Set"],
        },
        "Girls Wear": {
            "Dresses & Frocks": ["Party Dress", "Casual Dress", "Ethnic Dress", "Gown", "Maxi Dress"],
            "Tops & T-Shirts": ["Printed Top", "Embroidered Top", "Character T-Shirt", "Casual T-Shirt"],
            "Lehengas & Ethnic": ["Lehenga Choli", "Salwar Suit", "Anarkali", "Sharara Set", "Ghagra"],
            "Jeans & Pants": ["Denim Jeans", "Jeggings", "Leggings", "Palazzo"],
            "Skirts": ["A-Line Skirt", "Pleated Skirt", "Denim Skirt", "Tutu Skirt"],
        },
        "Infant Wear": {
            "Rompers & Bodysuits": ["Cotton Romper", "Printed Bodysuit", "Sleepsuit", "Onesie"],
            "Sets": ["Jhabla Set", "Top & Bottom Set", "Night Suit Set"],
            "Essentials": ["Bibs", "Mittens", "Caps", "Booties"],
        },
        "School Uniforms": {
            "Shirts & Blouses": ["White Shirt", "School Blouse", "Checked Shirt"],
            "Pants & Skirts": ["School Pants", "School Skirt", "Pinafore"],
            "Accessories": ["School Ties", "Belts", "Socks"],
        },
    },
}

OUTPUT_DIR = Path(__file__).parent / "generated_banners"
RESULTS_FILE = Path(__file__).parent / "banner_urls_level4.json"


# --- Material and occasion-aware prompt hints ---
MATERIAL_HINTS = {
    "cotton": "soft cotton fabric texture visible, breathable natural look",
    "silk": "lustrous silk sheen, elegant drape, luxurious rich texture",
    "denim": "classic denim texture, indigo tones, casual rugged style",
    "satin": "smooth satin fabric, subtle sheen, sensual elegance",
    "linen": "natural linen texture, relaxed casual elegance, earthy tones",
    "chiffon": "flowing chiffon fabric, ethereal lightweight texture",
    "georgette": "soft georgette drape, semi-sheer elegant fabric",
    "brocade": "rich brocade patterns, ornate woven texture, traditional craft",
    "fleece": "cozy fleece texture, warm comfortable soft material",
    "printed": "eye-catching print patterns, colorful vibrant designs",
    "embroidered": "intricate embroidery work, detailed handcraft artistry",
    "leather": "supple leather texture, premium material, bold look",
    "wool": "warm wool texture, cozy knit fabric, winter comfort",
}

OCCASION_HINTS = {
    "wedding": "grand wedding occasion, ornate festive details, opulent setting",
    "bridal": "bridal luxury, ornate wedding details, opulent regal setting",
    "party": "glamorous party look, stylish evening ambiance, celebration mood",
    "casual": "relaxed casual everyday lifestyle, comfortable effortless style",
    "formal": "professional formal setting, crisp tailored polished look",
    "sports": "dynamic athletic energy, active performance lifestyle",
    "gym": "workout fitness setting, athletic performance gear",
    "running": "outdoor running activity, motion energy, performance wear",
    "training": "athletic training session, performance-focused gear",
    "school": "neat school environment, crisp uniform clean styling",
    "designer": "haute couture inspired, premium designer artistic details",
    "festive": "vibrant festive celebration, colorful traditional setting",
    "reception": "elegant reception event, semi-formal sophisticated style",
    "oversized": "trendy oversized relaxed fit, streetwear inspired comfort",
    "graphic": "bold graphic artwork, creative artistic expression on fabric",
    "indo-western": "fusion of Indian and Western styles, modern traditional blend",
}

GARMENT_TYPE_HINTS = {
    "kurta": "traditional Indian kurta garment, straight or A-line silhouette",
    "sherwani": "structured Indian sherwani, knee-length embroidered coat",
    "nehru jacket": "mandarin collar sleeveless jacket, structured formal wear",
    "dhoti": "traditional draped lower garment, white or off-white fabric",
    "saree": "elegant draped six-yard fabric, flowing pleats and pallu",
    "lehenga": "flared skirt with ornate embellishment, festive Indian wear",
    "kurti": "shorter Indian tunic top, versatile everyday wear",
    "salwar": "traditional Indian pants with pleats, paired with kameez",
    "dupatta": "flowing scarf accessory, draped across shoulder or head",
    "palazzo": "wide-leg flowing pants, comfortable elegant silhouette",
    "jumpsuit": "one-piece garment, modern chic full-body outfit",
    "romper": "baby one-piece outfit, adorable comfortable infant wear",
    "bodysuit": "snug baby garment, snap closure, practical infant clothing",
    "joggers": "tapered athletic pants with elastic cuffs, sporty comfort",
    "hoodie": "hooded sweatshirt pullover, casual warm streetwear",
    "cardigan": "open-front knit sweater, layering wardrobe essential",
    "blazer": "structured tailored jacket, semi-formal versatile outerwear",
    "puffer": "quilted insulated jacket, winter warmth bubble design",
    "bomber": "classic bomber jacket silhouette, ribbed collar and cuffs",
    "polo": "collared knit shirt, smart casual classic style",
    "jeggings": "jean-legging hybrid, stretchy denim-look skinny fit",
    "capri": "cropped mid-calf length pants, casual summer style",
    "dungarees": "bib-and-brace overall, casual utilitarian style",
    "kaftan": "loose flowing tunic dress, relaxed bohemian elegance",
    "anarkali": "flared floor-length Indian dress, princess silhouette",
    "sharara": "wide flared pants from knee, traditional festive wear",
    "ghagra": "long flared skirt, traditional Indian ethnic wear",
    "pinafore": "sleeveless dress worn over blouse, school uniform style",
    "tutu": "layered tulle skirt, playful ballerina-inspired children wear",
    "onesie": "full-body baby garment, adorable cozy infant wear",
}


def build_prompt_l4(cat_l1, cat_l2, cat_l3, cat_l4):
    """Build a brand-aware, context-rich prompt for Level 4 product images."""
    base = (
        "Professional high-quality fashion product photography for a premium "
        "international clothing brand e-commerce banner. Clean, elegant, minimalist "
        "composition. Studio lighting. No text overlays. No watermarks. No logos. "
        "White and warm-toned background. Premium luxury aesthetic. "
    )

    # Gender context
    gender_context = {
        "Men Fashion": "men's clothing items, masculine styling",
        "Women Fashion": "women's clothing items, feminine styling",
        "Kids Fashion": "children's clothing items, playful youthful styling",
    }
    gender = gender_context.get(cat_l1, "fashion clothing")

    # Build extra detail from material, occasion, and garment type hints
    extra_details = []
    l4_lower = cat_l4.lower()

    for keyword, hint in MATERIAL_HINTS.items():
        if keyword in l4_lower:
            extra_details.append(hint)
            break

    for keyword, hint in OCCASION_HINTS.items():
        if keyword in l4_lower:
            extra_details.append(hint)
            break

    for keyword, hint in GARMENT_TYPE_HINTS.items():
        if keyword in l4_lower:
            extra_details.append(hint)
            break

    extra_detail = ". ".join(extra_details) if extra_details else ""

    prompt = (
        base
        + f"Specific product: {cat_l4} from the {cat_l3} collection, "
        + f"under {cat_l2}, {cat_l1}. "
        + f"Detailed close-up showcase featuring {gender}, "
        + f"specifically {cat_l4.lower()} items. "
        + f"Single hero product focus, premium product photography. "
    )

    if extra_detail:
        prompt += f"Style details: {extra_detail}. "

    prompt += f"Clean arrangement highlighting the unique qualities of {cat_l4.lower()}."

    return prompt


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
    return name.replace(" ", "_").replace(",", "").replace("&", "and").replace("/", "-").replace("'", "").lower()


def main():
    print("=" * 60)
    print("ZAMMER Level 4 Banner Image Generation & Upload Pipeline")
    print("=" * 60)

    # Verify Cloudinary config
    cn = os.getenv("CLOUDINARY_CLOUD_NAME", "dr17ap4sb")
    print(f"[OK] Cloudinary cloud: {cn}")

    results = {"level4": []}
    tasks = []  # (level, prompt, save_path, metadata)

    # --- Build task list ---
    for cat_l1, l2_dict in CATEGORY_HIERARCHY_L4.items():
        for cat_l2, l3_dict in l2_dict.items():
            for cat_l3, l4_list in l3_dict.items():
                for cat_l4 in l4_list:
                    fname = f"{sanitize(cat_l1)}_{sanitize(cat_l2)}_{sanitize(cat_l3)}_{sanitize(cat_l4)}.jpg"
                    save_path = OUTPUT_DIR / "level4" / fname
                    prompt = build_prompt_l4(cat_l1, cat_l2, cat_l3, cat_l4)
                    tasks.append((4, prompt, save_path, {
                        "categoryLevel1": cat_l1,
                        "categoryLevel2": cat_l2,
                        "categoryLevel3": cat_l3,
                        "categoryLevel4": cat_l4,
                    }))

    print(f"\n[INFO] Total Level 4 images to generate: {len(tasks)}")
    print(f"  Men Fashion:   {sum(1 for t in tasks if t[3]['categoryLevel1'] == 'Men Fashion')}")
    print(f"  Women Fashion: {sum(1 for t in tasks if t[3]['categoryLevel1'] == 'Women Fashion')}")
    print(f"  Kids Fashion:  {sum(1 for t in tasks if t[3]['categoryLevel1'] == 'Kids Fashion')}")

    # --- Generate images (parallel, 3 workers = 1 per API key) ---
    print("\n--- PHASE 1: Generating images with Gemini ---")

    completed_count = 0
    total_count = len(tasks)

    def generate_task(task):
        nonlocal completed_count
        level, prompt, save_path, meta = task
        save_path.parent.mkdir(parents=True, exist_ok=True)
        if save_path.exists():
            completed_count += 1
            print(f"  [SKIP {completed_count}/{total_count}] Already exists: {save_path.name}")
            return (level, save_path, meta, True)
        success = generate_image(prompt, save_path)
        completed_count += 1
        if completed_count % 10 == 0:
            print(f"\n  >>> Progress: {completed_count}/{total_count} images processed <<<\n")
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

    upload_count = 0

    def upload_task(item):
        nonlocal upload_count
        level, save_path, meta, _ = item
        level_folder = "level4"
        pub_id = save_path.stem
        upload_result = upload_to_cloudinary(save_path, level_folder, pub_id)
        upload_count += 1
        if upload_count % 10 == 0:
            print(f"\n  >>> Upload progress: {upload_count}/{len(generated)} <<<\n")
        if upload_result:
            return (level, {**meta, **upload_result})
        return None

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(upload_task, item): item for item in generated}
        for future in as_completed(futures):
            result = future.result()
            if result:
                level, data = result
                results["level4"].append(data)

    # --- Save results ---
    print(f"\n--- PHASE 3: Saving results ---")
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[OK] Saved {RESULTS_FILE}")
    print(f"  Level 4 URLs: {len(results['level4'])}")

    print("\n" + "=" * 60)
    print(f"Pipeline complete! {len(results['level4'])} Level 4 banners generated and uploaded.")
    print(f"Output: {RESULTS_FILE}")
    print("Next steps:")
    print("  1. Copy the level4 array from banner_urls_level4.json")
    print("  2. Add it to BANNER_DATA in backend/controllers/bannerController.js")
    print("  3. Deploy and click 'Seed from JSON' in the admin panel")
    print("=" * 60)


if __name__ == "__main__":
    main()
