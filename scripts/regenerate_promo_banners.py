"""
ZAMMER Promo Banner REGENERATION — Cinematic 16:9 with Full Models
==================================================================
Replaces the old sparse/headless banners with rich, filled, cinematic
fashion e-commerce campaign banners in 16:9 landscape format.

- Full body models (head to feet)
- Rich filled backgrounds with props, elements, environment
- Cinematic wide-angle compositions (Myntra/Meesho style)
- Same 12 banner IDs, same Cloudinary public IDs (overwrite: true)

Run: python scripts/regenerate_promo_banners.py
"""

import os
import json
import time
import shutil
import threading
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed

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
    "AIzaSyAt7xkchrk-XzDEdqi4GZIrpzS2lQSJ8Ss",
    "AIzaSyApDqjjtsNcebqTXIfpFEQLuHu5vUpV_Eg",
    "AIzaSyBegB6vo4zormEZPbI6IPadFDl758uHPZk",
    "AIzaSyA1L0-3c4MhCHgdb6kL2Qa5d-0Owj87Mqc",
    "AIzaSyCJinbs4cLW18JVtx4sFQL4JtR9q2vv2Yo",
]

MODEL = "gemini-2.5-flash-image"

_key_index = 0
_key_lock = threading.Lock()

def get_next_client():
    global _key_index
    with _key_lock:
        key = API_KEYS[_key_index % len(API_KEYS)]
        _key_index += 1
    return genai.Client(api_key=key)


# ========================================================================
# CINEMATIC PROMPT PREFIX — applied to every banner
# ========================================================================
CINEMATIC_PREFIX = (
    "Generate a WIDE CINEMATIC 16:9 LANDSCAPE fashion e-commerce promotional banner image. "
    "Aspect ratio MUST be wide landscape (approximately 1792x1024 or 16:9 proportions). "
    "CRITICAL RULES: "
    "1) The model's FULL BODY must be visible — head, face, hair, torso, legs, feet — absolutely NO cropping at neck or shoulders. "
    "2) The background must be COMPLETELY FILLED edge-to-edge with rich visual elements — NO empty white space, NO plain studio backdrops, NO blank areas. "
    "3) Use cinematic wide-angle composition with the model positioned on one third of the frame (rule of thirds). "
    "4) Fill the remaining space with environment elements: shopping bags, fashion accessories, decorative props, plants, geometric patterns, textured walls, colorful gradients, abstract shapes, bokeh lights, confetti, or architectural elements. "
    "5) This is a professional Indian e-commerce campaign banner (like Myntra, Meesho, Ajio) — vibrant, aspirational, visually PACKED. "
    "6) The entire frame must feel FULL and ALIVE — every corner has something interesting. No dead zones. "
    "7) Photorealistic quality, natural skin tones, authentic human proportions and expressions. "
    "8) DO NOT include any text, logos, words, letters, discount badges, or typography in the image. Generate a PURELY VISUAL image — all text will be overlaid separately. "
    "\n\n"
)


# ========================================================================
# 12 PROMO BANNER THEMES — rewritten for cinematic filled compositions
# ========================================================================
PROMO_THEMES = [
    # ---- MEN'S FASHION (4) ----
    {
        "id": "men_new_drop",
        "title": "NEW Drop",
        "subtitle": "Fresh Styles Just In",
        "discountText": "UPTO 50% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A confident young Indian man (full body, head to feet visible) wearing a trendy oversized graphic hoodie, slim-fit cargo pants, and white chunky sneakers. "
            "He stands in a dynamic pose leaning against a graffiti-covered urban wall in a vibrant street setting. "
            "BACKGROUND FILL: The scene is packed with visual elements — colorful street art murals covering the wall behind him, neon sign reflections, stacked sneaker boxes on one side, "
            "a vintage motorcycle partially visible, hanging streetwear clothing racks, scattered fashion magazines on the ground, warm golden hour sunlight streaming through buildings creating long shadows. "
            "Shopping bags from trendy brands scattered around his feet. Bokeh city lights in the distance. "
            "COLOR PALETTE: Warm amber, rust orange, and teal accents. Rich, saturated, editorial fashion photography."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A stylish young Indian man (full body head to feet) in a classic denim jacket over a black crew-neck tee, dark slim jeans, and leather boots. "
            "He's seated casually on a vintage leather Chesterfield sofa in a premium menswear boutique setting. "
            "BACKGROUND FILL: Behind him, floor-to-ceiling wooden shelving filled with folded denim, stacked shirts, leather belts on display hooks, "
            "a large industrial mirror reflecting the store, hanging Edison bulb lights, potted indoor plants (monstera, ficus), "
            "a wooden ladder leaning against shelves with more clothes, shopping bags on the floor, vintage clock on the wall, exposed brick walls with warm lighting. "
            "COLOR PALETTE: Rich navy, warm brown leather tones, golden ambient lighting. Premium menswear boutique aesthetic."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A handsome young Indian man (full body head to feet) wearing an elegant silk kurta with golden embroidery paired with churidar pants and mojari shoes. "
            "He stands in a regal pose inside a richly decorated traditional Indian haveli courtyard. "
            "BACKGROUND FILL: Ornate Mughal-style arched doorways with intricate jali (lattice) work, hanging brass lanterns with warm glowing candles, "
            "scattered marigold and rose flower petals on the marble floor, ornamental brass urns and vessels, "
            "draped silk fabrics in gold and maroon hanging from pillars, a beautiful rangoli design on the floor, "
            "potted palms and bougainvillea plants along the courtyard walls, warm golden hour light filtering through the arches. "
            "COLOR PALETTE: Royal gold, deep maroon, warm ivory. Luxurious Indian wedding/festive aesthetic."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A ruggedly handsome young Indian man (full body head to feet) wearing a premium quilted puffer jacket, wool scarf, dark jeans, and hiking boots. "
            "He stands confidently in a cozy winter cabin lodge setting near a large window showing snowy mountains outside. "
            "BACKGROUND FILL: The cabin interior is packed with winter elements — a crackling stone fireplace with flames, stacked firewood logs, "
            "plaid wool blankets draped over a leather armchair, a hot coffee mug on a wooden side table, hanging winter coats on a rustic wooden rack, "
            "snow boots lined up near the door, pine branches and pine cones decorating the mantle, warm string lights along the ceiling beams, "
            "shopping bags with winter wear visible, a knitted rug on the wooden floor. Frosted window panes. "
            "COLOR PALETTE: Icy blue outside, warm amber/golden inside. Cozy winter editorial contrast."
        )
    },

    # ---- WOMEN'S FASHION (4) ----
    {
        "id": "women_new_drop",
        "title": "NEW Drop",
        "subtitle": "Curated Elegance Awaits",
        "discountText": "UPTO 60% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A beautiful young Indian woman (full body head to feet) in an elegant flowing midi dress with floral print, strappy heels, and a delicate gold necklace. "
            "She walks gracefully through a dreamy luxury fashion boutique with the dress flowing behind her. "
            "BACKGROUND FILL: The boutique is filled with visual richness — racks of colorful designer dresses along the walls, "
            "a large ornate gold-framed mirror reflecting the scene, fresh pink and white flower arrangements in crystal vases on display tables, "
            "stacked designer hatboxes, draped silk scarves on mannequin arms, scattered rose petals on the polished marble floor, "
            "crystal chandelier overhead casting warm sparkles, shopping bags from luxury brands, "
            "a velvet tufted bench with fashion magazines scattered on it. Soft pink and peach ambient lighting. "
            "COLOR PALETTE: Blush pink, soft coral, champagne gold. Dreamy luxury feminine aesthetic."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A trendy young Indian woman (full body head to feet) in a stylish crop top, high-waisted wide-leg jeans, and platform sneakers, "
            "striking a confident pose in a vibrant pop-art inspired fashion studio. "
            "BACKGROUND FILL: The studio is PACKED with colorful visual elements — a bold geometric accent wall in coral and mint, "
            "clothing racks overflowing with colorful garments, stacked shoe boxes tower, neon ring lights, "
            "scattered shopping bags in multiple colors, a full-length mirror with light bulbs around its frame, "
            "hanging polaroid photos on a string, potted succulents on a shelf, fashion mood board with fabric swatches pinned to it, "
            "a skateboard leaning against the wall, colorful abstract art prints, confetti scattered on the floor. "
            "COLOR PALETTE: Hot coral, electric mint, sunny yellow. Energetic Gen-Z pop fashion vibes."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A gorgeous young Indian woman (full body head to feet) wearing a stunning designer lehenga choli with heavy gold zardosi embroidery, "
            "statement kundan jewelry set (necklace, jhumka earrings, maang tikka), and embroidered juttis. She stands in an elegant bridal pose. "
            "BACKGROUND FILL: A lavish Indian wedding/festive setting — ornate carved wooden door with brass handles behind her, "
            "hanging strings of marigold and jasmine flower garlands creating a golden curtain, brass diyas (oil lamps) with flames lining the floor, "
            "scattered red rose petals, traditional brass urli bowls with floating flowers and candles, "
            "silk cushions on a low carved wooden bench, draped dupatta fabric in rich colors on the side, "
            "intricate floor rangoli in bright colors, warm fairy string lights overhead, incense smoke wisps. "
            "COLOR PALETTE: Deep red, royal gold, rich emerald green. Opulent Indian wedding grandeur."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A beautiful young Indian woman (full body head to feet) in a stylish matching loungewear co-ord set (soft cotton top and joggers), "
            "relaxing on a plush oversized sofa in a beautifully styled modern living room. "
            "BACKGROUND FILL: The living room is cozy and richly decorated — fluffy throw pillows in multiple textures and colors on the sofa, "
            "a soft chunky knit blanket draped over the armrest, a marble-top coffee table with a latte in a ceramic mug, fashion magazines, and a scented candle, "
            "a large monstera plant in a woven basket planter, floating wooden bookshelves filled with books and small decor items, "
            "a gallery wall of framed art prints and photos, fairy string lights draped along the wall, "
            "a plush area rug on herringbone wooden floor, shopping bags visible near the sofa. Warm afternoon sunlight streaming through sheer curtains. "
            "COLOR PALETTE: Soft lavender, warm cream, blush rose. Cozy aspirational lifestyle aesthetic."
        )
    },

    # ---- KIDS FASHION (4) ----
    {
        "id": "kids_new_drop",
        "title": "NEW Drop",
        "subtitle": "Playful Styles for Little Ones",
        "discountText": "UPTO 40% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: Two adorable Indian children (boy and girl, ages 6-8, full bodies head to feet) in trendy colorful casual outfits — "
            "the boy in a graphic print tee, denim dungarees and bright sneakers, the girl in a rainbow striped dress with cute hair accessories. "
            "They're laughing and jumping playfully in a vibrant children's playroom/fashion store. "
            "BACKGROUND FILL: The room is PACKED with fun elements — a colorful ball pit partially visible on one side, "
            "stuffed toys (teddy bears, unicorns) on shelves, a mini clothing rack with tiny colorful outfits, "
            "scattered building blocks and crayons on the floor, balloons in multiple colors floating near the ceiling, "
            "a chalkboard wall with doodles, a miniature vintage bicycle, bunting flags in rainbow colors strung overhead, "
            "stacked gift boxes with ribbons, a bright polka-dot rug, star-shaped fairy lights. "
            "COLOR PALETTE: Bright primary colors — sunny yellow, sky blue, cherry red, grass green. Pure joy and playfulness."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: Two cute Indian children (boy and girl, ages 7-9, full bodies head to feet) in crisp school uniforms — "
            "the boy in a white shirt, navy shorts, tie, and polished shoes with a backpack, the girl in a pinafore dress with braided hair and a school bag. "
            "They stand confidently smiling in a cheerful school-themed setting. "
            "BACKGROUND FILL: Behind them is a colorful classroom/school hallway — a green chalkboard with math equations and drawings, "
            "wooden desks with books and pencil cases, a globe on the teacher's desk, colorful alphabet and world map posters on the walls, "
            "stacked textbooks and notebooks, a pencil-shaped coat rack with hanging school bags, "
            "an apple on the desk, crayon drawings pinned to a bulletin board, a clock showing morning time, "
            "potted desk plants, a bookshelf with colorful books, scattered stationery items. Bright cheerful morning sunlight from windows. "
            "COLOR PALETTE: Navy, sunny yellow, chalk white, apple red. Bright cheerful back-to-school energy."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An adorable little Indian girl (age 5-7, full body head to feet) in a beautiful sparkly party dress with tulle layers, "
            "matching hair bow, and glittery shoes. She's mid-twirl with the dress flaring out beautifully, laughing with pure joy. "
            "BACKGROUND FILL: A magical birthday party setting — a dessert table with a tiered cake, cupcakes, and candy jars visible on one side, "
            "cascading balloon arch in pink, gold, and white, scattered confetti and glitter on the floor, "
            "a sparkly backdrop curtain with sequins catching light, wrapped gift boxes with bows stacked nearby, "
            "paper lanterns and pom-poms hanging from above, a princess crown on a velvet cushion, "
            "fairy lights twinkling everywhere, streamers and ribbons trailing down, a flower garland frame. "
            "COLOR PALETTE: Princess pink, sparkle gold, soft lavender, pearl white. Magical fairytale party vibes."
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
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An energetic Indian boy (age 7-9, full body head to feet) in a cool sporty outfit — graphic printed tee with a superhero motif, "
            "jogger track pants with side stripes, and colorful running shoes. He's in a dynamic action pose (mid-jump or running) with huge energy. "
            "BACKGROUND FILL: A vibrant sports and activity themed setting — a mini basketball hoop on the wall, scattered sports balls (basketball, football, tennis), "
            "a skateboard ramp partially visible, colorful graffiti art on a concrete wall, "
            "stacked sneaker boxes, a gym rope hanging from above, sports water bottles, "
            "a trophy shelf with medals and cups, action figure toys on shelves, a bike wheel leaning on the wall, "
            "dynamic paint splashes and abstract geometric shapes adding energy to the background, "
            "star-burst lighting effects. "
            "COLOR PALETTE: Electric green, energetic orange, bold blue, dynamic red. High-energy sporty action vibes."
        )
    },
]


OUTPUT_DIR = Path(__file__).parent / "generated_promo_banners"
RESULTS_FILE = Path(__file__).parent / "promo_banner_urls.json"


def generate_image(prompt, save_path, retries=3):
    """Generate a cinematic 16:9 banner image using Gemini."""
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

            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        img_data = part.inline_data.data
                        img = Image.open(BytesIO(img_data))
                        img = img.convert("RGB")

                        # Enforce 16:9 aspect ratio by center-cropping
                        w, h = img.size
                        target_ratio = 16 / 9
                        current_ratio = w / h

                        if current_ratio < target_ratio:
                            # Too tall — crop height
                            new_h = int(w / target_ratio)
                            top = (h - new_h) // 2
                            img = img.crop((0, top, w, top + new_h))
                        elif current_ratio > target_ratio:
                            # Too wide — crop width
                            new_w = int(h * target_ratio)
                            left = (w - new_w) // 2
                            img = img.crop((left, 0, left + new_w, h))

                        img.save(str(save_path), "JPEG", quality=92)
                        print(f"  [OK] Generated: {save_path.name} ({img.size[0]}x{img.size[1]})")
                        return True

            print(f"  [WARN] No image in response for {save_path.name}, attempt {attempt+1}")
            time.sleep(2)

        except Exception as e:
            err_msg = str(e)
            print(f"  [ERR] Attempt {attempt+1} for {save_path.name}: {err_msg[:120]}")
            if "429" in err_msg or "quota" in err_msg.lower():
                time.sleep(10 * (attempt + 1))
            else:
                time.sleep(3 * (attempt + 1))

    print(f"  [FAIL] Could not generate: {save_path.name}")
    return False


def upload_to_cloudinary(file_path, public_id):
    """Upload image to Cloudinary, overwriting the old one."""
    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            folder="zammer_banners/promo",
            public_id=public_id,
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
    print("=" * 70)
    print("ZAMMER Promo Banner REGENERATION — Cinematic 16:9")
    print(f"Banners: {len(PROMO_THEMES)} | Model: {MODEL}")
    print("=" * 70)

    # --- Phase 0: Clean old generated images (disabled for retries) ---
    # To force full regeneration, manually delete scripts/generated_promo_banners/
    # if OUTPUT_DIR.exists():
    #     old_files = list(OUTPUT_DIR.glob("*.jpg"))
    #     if old_files:
    #         print(f"\n[PHASE 0] Deleting {len(old_files)} old banner images...")
    #         for f in old_files:
    #             f.unlink()
    #             print(f"  [DEL] {f.name}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Phase 1: Generate Images ---
    print(f"\n[PHASE 1] Generating {len(PROMO_THEMES)} cinematic banners...")
    tasks = []
    for theme in PROMO_THEMES:
        save_path = OUTPUT_DIR / f"{theme['id']}.jpg"
        if save_path.exists():
            print(f"  [SKIP] Already exists: {save_path.name}")
            continue
        tasks.append((theme, save_path))

    if tasks:
        print(f"\n  Generating {len(tasks)} images with 3 workers...")
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(generate_image, t[0]["prompt"], t[1]): t
                for t in tasks
            }
            done = 0
            for future in as_completed(futures):
                done += 1
                task = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"  [ERR] Thread error for {task[0]['id']}: {e}")
                if done % 4 == 0:
                    print(f"\n  >>> Progress: {done}/{len(tasks)} banners <<<\n")
    else:
        print("  All banners already generated!")

    # --- Phase 2: Upload to Cloudinary ---
    print(f"\n[PHASE 2] Uploading to Cloudinary (overwrite=true)...")
    results = []

    upload_tasks = []
    for theme in PROMO_THEMES:
        file_path = OUTPUT_DIR / f"{theme['id']}.jpg"
        if not file_path.exists():
            print(f"  [SKIP] Missing: {theme['id']}.jpg")
            continue
        upload_tasks.append((theme, file_path))

    if upload_tasks:
        print(f"\n  Uploading {len(upload_tasks)} banners with 5 workers...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(upload_to_cloudinary, t[1], t[0]["id"]): t
                for t in upload_tasks
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
                    print(f"  [ERR] Upload error for {theme['id']}: {e}")

    # Sort results by original order
    order = {t["id"]: i for i, t in enumerate(PROMO_THEMES)}
    results.sort(key=lambda x: order.get(x["cloudinaryPublicId"].split("/")[-1], 999))

    # --- Phase 3: Save JSON ---
    print(f"\n[PHASE 3] Saving to {RESULTS_FILE.name}...")
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'=' * 70}")
    print(f"COMPLETE: {len(results)}/{len(PROMO_THEMES)} cinematic banners processed")
    print(f"  Images: {OUTPUT_DIR}")
    print(f"  JSON:   {RESULTS_FILE}")
    print(f"{'=' * 70}")

    if len(results) < len(PROMO_THEMES):
        print(f"\n[WARN] {len(PROMO_THEMES) - len(results)} banners failed. Re-run to retry.")

    # Print the data for easy copy-paste into controller
    print("\n\n// ---- Copy this into promoBannerController.js PROMO_BANNER_DATA ----")
    print("const PROMO_BANNER_DATA = " + json.dumps(results, indent=2) + ";")

    return results


if __name__ == "__main__":
    main()
