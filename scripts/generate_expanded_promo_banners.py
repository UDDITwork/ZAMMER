"""
ZAMMER EXPANDED Promo Banners — Creative Lifestyle Themes
==========================================================
Generates 21 NEW promotional banners with creative situations and lifestyle themes:
- VISIBLE MODEL FACES (zoomed closer, faces clearly shown)
- Lifestyle aesthetic themes (gym, date night, work from home, travel, etc.)
- Completely FILLED backgrounds (NO empty space)
- Cinematic 16:9 landscape format

Run: python scripts/generate_expanded_promo_banners.py
"""

import os
import json
import time
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

# --- Gemini API keys ---
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
# ENHANCED CINEMATIC PROMPT — CLOSER FRAMING, VISIBLE FACES
# ========================================================================
CINEMATIC_PREFIX = (
    "Generate a WIDE CINEMATIC 16:9 LANDSCAPE fashion e-commerce promotional banner image. "
    "Aspect ratio MUST be wide landscape (approximately 1792x1024 or 16:9 proportions). "
    "CRITICAL RULES FOR THIS BANNER: "
    "1) The model's FACE must be CLEARLY VISIBLE and in focus — capture the eyes, smile, expression, and facial features prominently. Use a closer framing (medium-full body or 3/4 body) so the face is not tiny. The face should occupy significant visual weight. "
    "2) Show the model from at least waist-up to head OR full body with face clearly visible and large enough to see details. Avoid distant tiny figures. "
    "3) The background must be COMPLETELY FILLED edge-to-edge with rich visual elements — NO empty white space, NO plain studio backdrops, NO blank areas. Every corner must have visual interest. "
    "4) Use cinematic wide-angle composition with the model positioned using rule of thirds. "
    "5) Fill the background with environment elements: shopping bags, fashion accessories, decorative props, plants, geometric patterns, textured walls, colorful gradients, abstract shapes, bokeh lights, confetti, architectural elements, lifestyle props. "
    "6) This is a professional Indian e-commerce campaign banner (like Myntra, Meesho, Ajio) — vibrant, aspirational, visually PACKED with energy and life. "
    "7) The entire frame must feel FULL and ALIVE — no dead zones, no empty corners. "
    "8) Photorealistic quality, natural skin tones, authentic human proportions and expressions. Models should look confident, happy, and relatable. "
    "9) DO NOT include any text, logos, words, letters, discount badges, or typography in the image. Generate a PURELY VISUAL image — all text will be overlaid separately. "
    "10) LIFESTYLE AESTHETIC: The scene should tell a story and evoke a specific mood/lifestyle (gym energy, date night romance, weekend chill, travel adventure, etc.). "
    "\n\n"
)


# ========================================================================
# 21 NEW CREATIVE PROMO BANNER THEMES
# ========================================================================
EXPANDED_PROMO_THEMES = [
    # ---- MEN'S CREATIVE THEMES (6) ----
    {
        "id": "men_summer_vibes",
        "title": "SUMMER VIBES",
        "subtitle": "Cool Styles for Hot Days",
        "discountText": "FLAT 40% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Western%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A handsome young Indian man (medium-full body, face CLEARLY visible and prominent, big smile) wearing a breezy linen shirt (unbuttoned casually), "
            "light khaki shorts, and boat shoes. He's leaning against a vintage convertible car at a beach-side cafe during golden hour. "
            "His face is in focus, showing his confident expression and sunglasses pushed up on his head. "
            "BACKGROUND FILL: The scene is packed with coastal summer elements — palm trees swaying in the breeze, surfboards leaning against a colorful beach shack, "
            "stacked colorful beach towels, hanging string lights starting to glow, scattered fresh coconuts with straws, "
            "beach umbrellas in the distance, a cooler with drinks, surfing posters on the shack wall, "
            "sandy textures with flip-flops scattered around, warm sunset sky with orange-pink gradients. "
            "COLOR PALETTE: Warm sunset orange, turquoise blue, sandy beige. Coastal summer freedom vibes."
        )
    },
    {
        "id": "men_gym_active",
        "title": "GYM & ACTIVE",
        "subtitle": "Performance Wear That Moves",
        "discountText": "UPTO 55% OFF",
        "ctaText": "GET FIT",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Sportswear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A fit young Indian man (waist-up to head, face CLEARLY visible showing determination and energy) in premium gym activewear — "
            "fitted compression tank top, athletic shorts, headband, and training gloves. He's in mid-action (lifting dumbbells or intense workout pose) at a modern gym. "
            "His face shows intense focus and athletic energy, sweat glistening, muscles defined. "
            "BACKGROUND FILL: The gym setting is packed with fitness elements — weight racks loaded with dumbbells and barbells, "
            "a pull-up bar with resistance bands hanging, mirrors reflecting the scene, motivational posters on concrete walls ('NO PAIN NO GAIN'), "
            "gym bags and water bottles scattered around, a foam roller, boxing gloves on a bench, "
            "industrial ceiling lights creating dramatic shadows, rubber gym mats, fitness tracker on the wall showing stats. "
            "COLOR PALETTE: Electric green, charcoal black, metallic silver. High-intensity workout energy."
        )
    },
    {
        "id": "men_date_night",
        "title": "DATE NIGHT",
        "subtitle": "Dress to Impress",
        "discountText": "BUY 2 GET 1",
        "ctaText": "LOOK SHARP",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Western%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A dashing young Indian man (3/4 body, face CLEARLY visible with a charming smile) dressed elegantly in a tailored blazer, "
            "crisp white shirt (top button undone), dark slim-fit trousers, leather dress shoes, and a luxury watch. "
            "He's standing at a chic rooftop restaurant/bar at night, holding a glass of wine, looking confident and sophisticated. "
            "His face is well-lit showing his handsome features and groomed appearance. "
            "BACKGROUND FILL: The upscale rooftop setting is filled with ambiance — city skyline with glowing buildings in the distance, "
            "romantic string lights overhead creating a canopy, premium leather bar stools at a marble bar counter, "
            "elegant wine bottles displayed on wooden shelves, fresh flower centerpieces in crystal vases, "
            "candles in glass holders creating warm glows, velvet rope barriers, champagne bucket on ice, "
            "soft bokeh lights from the city, starry night sky. "
            "COLOR PALETTE: Deep navy, warm golden light, rich burgundy. Sophisticated romantic evening."
        )
    },
    {
        "id": "men_wfh",
        "title": "WORK FROM HOME",
        "subtitle": "Comfort Meets Professional",
        "discountText": "STARTING Rs.399",
        "ctaText": "SHOP COMFORT",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Western%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A relaxed young Indian man (waist-up to head, face CLEARLY visible with a friendly smile) wearing smart-casual WFH attire — "
            "a soft henley shirt or polo, comfortable jogger pants, and house slippers. He's sitting at a stylish home office desk with a laptop, "
            "coffee mug in hand, looking content and productive. His face shows relaxed confidence and casual professionalism. "
            "BACKGROUND FILL: The cozy home office is richly decorated — floating wooden shelves with books, plants, and decor items, "
            "a corkboard with pinned notes and polaroid photos, a large window showing greenery outside with natural light streaming in, "
            "a comfy ergonomic chair, desk lamp with warm light, framed motivational prints on the wall, "
            "a yoga mat rolled up in the corner, AirPods on the desk, a planner and pens, succulent plants, "
            "woven baskets with cables organized, a cozy throw blanket on a nearby chair. "
            "COLOR PALETTE: Warm oak brown, soft sage green, creamy white. Cozy productive home workspace."
        )
    },
    {
        "id": "men_midnight_flash",
        "title": "MIDNIGHT FLASH",
        "subtitle": "Only for 6 Hours",
        "discountText": "FLAT 80% OFF",
        "ctaText": "GRAB NOW",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A stylish young Indian man (full body but face CLEARLY visible and lit dramatically, intense focused expression) "
            "in a bold statement outfit — leather jacket, graphic tee, ripped jeans, and boots. He's walking toward the camera in a neon-lit urban alley at night. "
            "His face is illuminated by the colorful neon lights, showing determination and edgy confidence. "
            "BACKGROUND FILL: The urban night scene is electrified — bright neon signs in multiple colors (pink, cyan, orange) on brick walls, "
            "street art murals glowing under blacklight, steam rising from a manhole, parked motorcycles with chrome details catching light, "
            "hanging Edison bulbs strung across the alley, graffiti tags, metal fire escapes on buildings, "
            "puddles reflecting neon colors, urban decay aesthetic with colorful lighting, scattered shopping bags from late-night retail. "
            "COLOR PALETTE: Electric cyan, hot magenta, deep purple. Urban midnight energy."
        )
    },
    {
        "id": "men_street_style",
        "title": "STREET STYLE",
        "subtitle": "Urban Fashion Forward",
        "discountText": "UPTO 50% OFF",
        "ctaText": "GET TRENDY",
        "targetGender": "men",
        "linkUrl": "/user/browse/Men%20Fashion/Western%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A cool young Indian man (3/4 body, face CLEARLY visible showing confident street attitude) in trendy streetwear — "
            "oversized hoodie with bold graphics, baggy cargo pants with chains, chunky sneakers, and a snapback cap worn backwards. "
            "He's sitting on a skateboard in a colorful urban skate park. His face shows youthful confidence and style. "
            "BACKGROUND FILL: The skate park scene is vibrant and packed — colorful graffiti-covered ramps and walls, "
            "stacked skateboard decks leaning against a wall, scattered spray paint cans, street art characters in the background, "
            "a boom box playing music, energy drink cans, a BMX bike, urban plants growing through concrete cracks, "
            "hanging sneakers on power lines above, chain-link fence with posters, bright afternoon sunlight creating sharp shadows. "
            "COLOR PALETTE: Bold orange, electric blue, graffiti yellow. Urban youth culture energy."
        )
    },

    # ---- WOMEN'S CREATIVE THEMES (7) ----
    {
        "id": "women_valentine",
        "title": "VALENTINE'S SPECIAL",
        "subtitle": "Elegant Looks for Her",
        "discountText": "UPTO 65% OFF",
        "ctaText": "SHOP LOVE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Western%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A beautiful young Indian woman (waist-up to head, face CLEARLY visible with a warm loving smile and soft romantic expression) "
            "wearing an elegant red midi dress with delicate details, statement jewelry, and soft romantic makeup. "
            "She's holding a bouquet of red roses, standing in a dreamy romantic setting. Her face is the focus, showing joy and elegance. "
            "BACKGROUND FILL: The romantic scene is filled with Valentine's elements — dozens of red and white roses in vases and scattered petals on the floor, "
            "heart-shaped balloons floating nearby, soft fairy lights creating a warm glow, a gift-wrapped box with a satin ribbon, "
            "champagne flutes on a marble table, candles in ornate holders, a velvet loveseat with cushions, "
            "romantic string lights creating a bokeh effect, lace curtains, soft pink and red fabric drapes. "
            "COLOR PALETTE: Romantic red, soft blush pink, warm gold. Dreamy Valentine's romance."
        )
    },
    {
        "id": "women_monsoon",
        "title": "MONSOON EDIT",
        "subtitle": "Rainy Day Ready Styles",
        "discountText": "FLAT 45% OFF",
        "ctaText": "EXPLORE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A cheerful young Indian woman (3/4 body, face CLEARLY visible with a bright smile and playful expression) "
            "in stylish monsoon wear — a trendy waterproof jacket in a fun color, patterned leggings, and colorful rain boots. "
            "She's holding a cute umbrella and splashing playfully in a puddle. Her face shows pure joy and carefree spirit. "
            "BACKGROUND FILL: The rainy outdoor scene is lively and filled — colorful umbrellas hanging overhead as art installation, "
            "puddles reflecting the scene, potted plants refreshed by rain, rain droplets visible in the air, "
            "a cozy cafe window with warm lighting in the background, hanging flower baskets dripping with water, "
            "cobblestone street with water flowing, a bicycle with a basket leaning against a wall, "
            "paper lanterns glowing through the rain, greenery looking vibrant and fresh. "
            "COLOR PALETTE: Rainy day teal, vibrant yellow umbrella, fresh green. Monsoon joy and freshness."
        )
    },
    {
        "id": "women_festive_glam",
        "title": "FESTIVE GLAM",
        "subtitle": "Shine Bright This Season",
        "discountText": "UPTO 75% OFF",
        "ctaText": "CELEBRATE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Ethnic%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A stunning young Indian woman (waist-up to head, face CLEARLY visible with radiant smile and festive joy, beautiful makeup with traditional bindi) "
            "in a gorgeous designer saree with intricate embroidery, statement traditional jewelry (jhumkas, bangles, necklace), and a designer blouse. "
            "She's holding a decorative diya (oil lamp), celebrating in elegant style. Her face glows with festive happiness. "
            "BACKGROUND FILL: The festive setting is opulent — dozens of illuminated diyas arranged in patterns, hanging marigold garlands in layers, "
            "colorful rangoli on the floor with intricate designs, brass traditional vessels and urns, silk cushions with golden tassels, "
            "ornate carved wooden screens, hanging paper lanterns glowing warmly, rose petals scattered everywhere, "
            "traditional torans (door hangings) with mango leaves, mirror work decorations, soft golden lighting, "
            "a decorated puja thali with flowers and incense smoke wisps. "
            "COLOR PALETTE: Festive gold, rich red, deep purple. Diwali celebration grandeur."
        )
    },
    {
        "id": "women_weekend",
        "title": "WEEKEND GETAWAY",
        "subtitle": "Travel Light Look Right",
        "discountText": "BUY 3 GET 20%",
        "ctaText": "PACK STYLE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Western%20Wear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An adventurous young Indian woman (3/4 body, face CLEARLY visible with an excited smile and wanderlust expression) "
            "in chic travel attire — a comfortable maxi dress, denim jacket, sneakers, and a stylish hat. "
            "She's holding a vintage camera, sitting on a suitcase at a picturesque travel location. Her face shows excitement and adventure spirit. "
            "BACKGROUND FILL: The travel setting is rich with wanderlust elements — vintage suitcases and travel bags stacked around, "
            "a world map on the wall with pins marking destinations, hanging polaroid photos of travel memories, "
            "passport and boarding passes peeking from a bag, travel guide books scattered, a backpack with adventure patches, "
            "a portable hammock, sunglasses and sun hat, travel journals, postcards, airport/train station aesthetic in soft focus background, "
            "luggage tags, a rolling suitcase with travel stickers, warm golden hour travel lighting. "
            "COLOR PALETTE: Adventurous teal, warm desert sand, sunset coral. Wanderlust travel vibes."
        )
    },
    {
        "id": "women_yoga",
        "title": "YOGA & WELLNESS",
        "subtitle": "Stretch in Style",
        "discountText": "STARTING Rs.499",
        "ctaText": "NAMASTE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion/Activewear",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A serene young Indian woman (waist-up to head, face CLEARLY visible with peaceful calm expression and gentle smile) "
            "in beautiful yoga activewear — a fitted sports bra with elegant patterns, high-waisted leggings, and her hair in a neat bun. "
            "She's in a graceful yoga pose (tree pose or warrior) on a yoga mat in a peaceful wellness studio. Her face radiates calm and inner peace. "
            "BACKGROUND FILL: The wellness studio is filled with zen elements — large floor-to-ceiling windows with natural light and greenery view outside, "
            "rolled yoga mats in various colors stacked against the wall, blocks and straps, hanging plants (pothos, ferns), "
            "a meditation cushion area with candles, essential oil diffuser releasing gentle mist, bamboo plants in corners, "
            "a water bottle with fruit infusion, a singing bowl, inspirational quotes on wooden signs, "
            "natural wooden floors, woven baskets with towels, soft neutral tones everywhere. "
            "COLOR PALETTE: Zen sage green, soft lavender, warm beige. Peaceful wellness sanctuary."
        )
    },
    {
        "id": "women_sustainable",
        "title": "SUSTAINABLE FASHION",
        "subtitle": "Eco-Friendly Elegance",
        "discountText": "UPTO 40% OFF",
        "ctaText": "GO GREEN",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A conscious young Indian woman (3/4 body, face CLEARLY visible with a genuine warm smile and purpose-driven expression) "
            "in sustainable eco-friendly fashion — organic cotton dress in earthy tones, jute accessories, and minimal natural makeup. "
            "She's in a green urban garden setting, holding a reusable shopping bag with plants. Her face shows ethical style confidence. "
            "BACKGROUND FILL: The eco-conscious scene is lush — vertical garden walls covered in greenery and climbing plants, "
            "recycled wooden furniture and decor, terracotta pots with herbs and flowers, reusable glass bottles, "
            "bamboo elements, a bicycle with a basket full of fresh produce, hanging macrame plant holders, "
            "eco-friendly shopping bags with natural fiber, solar panels visible on a rooftop in background, "
            "composting area with earthy elements, reclaimed wood signs about sustainability, natural sunlight filtering through leaves. "
            "COLOR PALETTE: Earthy green, natural beige, organic brown. Sustainable conscious living."
        )
    },
    {
        "id": "women_luxury",
        "title": "LUXURY COLLECTION",
        "subtitle": "Premium Designer Wear",
        "discountText": "EXTRA 10% OFF",
        "ctaText": "BE EXCLUSIVE",
        "targetGender": "women",
        "linkUrl": "/user/browse/Women%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An elegant young Indian woman (waist-up to head, face CLEARLY visible with sophisticated confident expression and flawless makeup) "
            "in high-fashion luxury designer wear — a structured couture dress with elegant draping, statement diamond-like jewelry, designer handbag. "
            "She's posing gracefully in an ultra-luxurious boutique setting. Her face exudes sophistication and exclusive style. "
            "BACKGROUND FILL: The luxury boutique is opulent — crystal chandeliers casting sparkles, marble floors with high gloss, "
            "gold-trimmed display cases with designer accessories, plush velvet seating in rich jewel tones, "
            "floor-to-ceiling mirrors with ornate gold frames, fresh orchid arrangements in premium vases, "
            "designer shoe displays, luxury branded shopping bags, soft dramatic lighting, "
            "abstract modern art on walls, glass display shelves with premium watches and jewelry, "
            "champagne on a side table in crystal flutes. "
            "COLOR PALETTE: Luxury gold, rich emerald, pristine white. High-end exclusive elegance."
        )
    },

    # ---- KIDS CREATIVE THEMES (4) ----
    {
        "id": "kids_summer_camp",
        "title": "SUMMER CAMP",
        "subtitle": "Fun Ready Outfits",
        "discountText": "UPTO 50% OFF",
        "ctaText": "SHOP NOW",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: Two adorable Indian children (boy and girl, ages 7-9, full bodies but faces CLEARLY visible with big excited smiles) "
            "in colorful summer camp outfits — the boy in a camp tee with fun graphics, shorts, and hiking shoes; the girl in a sporty tank and active shorts with her hair in pigtails. "
            "They're giving high-fives or jumping with pure joy. Their faces show pure childhood excitement. "
            "BACKGROUND FILL: The summer camp setting bursts with activity — colorful tents partially visible, a campfire setup with logs arranged in a circle, "
            "camping backpacks and water bottles, a wooden activity board with camp schedule, hanging rope for climbing, "
            "scattered sports equipment (frisbee, ball, badminton rackets), a butterfly net, binoculars on a wooden bench, "
            "trees with hanging birdhouses, a picnic blanket with snacks, campfire marshmallow sticks, "
            "adventure gear, a map posted on a tree, bright sunny outdoor lighting. "
            "COLOR PALETTE: Sunny yellow, adventure green, sky blue. Summer camp joy and outdoor fun."
        )
    },
    {
        "id": "kids_cartoon",
        "title": "CARTOON COLLECTION",
        "subtitle": "Their Favorite Characters",
        "discountText": "BUY 2 GET 30%",
        "ctaText": "EXPLORE",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An excited Indian child (age 6-8, full body but face CLEARLY visible with the biggest joyful smile and sparkling eyes) "
            "wearing clothes with popular cartoon characters — a graphic tee with superhero or animated character print, comfortable joggers, and fun sneakers. "
            "The child is in a playful dynamic pose (jumping or showing off the outfit). The face shows pure childhood joy and pride. "
            "BACKGROUND FILL: The playful setting is packed with fun — large cartoon character posters/murals on colorful walls, "
            "toy shelves filled with action figures and plushies of popular characters, colorful storage bins, "
            "a mini ball pit corner with colorful balls, building blocks scattered in creative structures, "
            "crayons and coloring books, hanging paper cutouts of cartoon characters, "
            "a cozy reading nook with kids books, bean bag chairs, string lights with cartoon shapes, "
            "playful wall decals, a toy chest overflowing, bright primary colors everywhere. "
            "COLOR PALETTE: Primary red, bright blue, sunshine yellow. Playful cartoon fun energy."
        )
    },
    {
        "id": "kids_sports",
        "title": "SPORTS CHAMPION",
        "subtitle": "Active Kids Happy Kids",
        "discountText": "STARTING Rs.199",
        "ctaText": "SHOP ACTIVE",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An energetic Indian boy (age 8-10, 3/4 body with face CLEARLY visible showing determination and athletic confidence) "
            "in sporty activewear — a team jersey or performance tee, athletic shorts, and sports shoes. "
            "He's in an action pose (kicking a football or shooting a basketball). His face shows athletic determination and joy. "
            "BACKGROUND FILL: The sports setting is vibrant and active — a mini basketball hoop on the wall, sports balls (football, basketball, volleyball) scattered around, "
            "a trophy shelf with medals and awards, motivational sports posters ('NEVER GIVE UP'), "
            "sports water bottles and towels, a yoga mat, gym rope hanging from above, "
            "cones for practice drills, a sports bag with gear, athletic shoes lined up, "
            "dynamic paint strokes suggesting motion, sunlight streaming creating athlete shadows. "
            "COLOR PALETTE: Champion gold, energetic orange, sporty green. Athletic victory vibes."
        )
    },
    {
        "id": "kids_birthday",
        "title": "BIRTHDAY SPECIAL",
        "subtitle": "Make Their Day Extra Special",
        "discountText": "UPTO 60% OFF",
        "ctaText": "CELEBRATE",
        "targetGender": "kids",
        "linkUrl": "/user/browse/Kids%20Fashion",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A delighted Indian child (girl, age 5-7, full body but face CLEARLY visible with pure joy, eyes closed laughing or huge smile, birthday hat on head) "
            "in a beautiful birthday outfit — a sparkly party dress or fancy outfit perfect for celebrations. "
            "The child is mid-celebration (blowing candles or hands raised in joy). The face captures pure birthday happiness. "
            "BACKGROUND FILL: The birthday party scene explodes with celebration — a beautiful tiered birthday cake with lit candles on a dessert table, "
            "colorful balloon arches in rainbow colors, hanging paper decorations and streamers, "
            "wrapped presents in colorful paper with big bows stacked in a corner, party hats and noise makers, "
            "a 'HAPPY BIRTHDAY' banner, confetti and glitter scattered everywhere, "
            "cupcakes and candy jars, party favor bags, fairy lights twinkling, "
            "a pin-the-tail game on the wall, paper lanterns, festive tablecloth. "
            "COLOR PALETTE: Party pink, celebration purple, happy yellow. Birthday magic and joy."
        )
    },

    # ---- UNIVERSAL/ALL THEMES (4) ----
    {
        "id": "all_first_buy",
        "title": "FIRST BUY OFFER",
        "subtitle": "Welcome to ZAMMER Family",
        "discountText": "EXTRA 20% OFF",
        "ctaText": "CLAIM NOW",
        "targetGender": "all",
        "linkUrl": "/user/browse",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A welcoming young Indian person (gender-neutral styling, waist-up to head, face CLEARLY visible with the warmest friendly smile and welcoming expression) "
            "in stylish casual outfit holding shopping bags with excitement. The face shows genuine happiness and welcome energy. "
            "BACKGROUND FILL: A vibrant welcome shopping scene — a modern retail store entrance with automatic glass doors opening, "
            "welcoming neon 'OPEN' sign glowing, colorful shopping bags from various brands, a welcome desk with flowers and a greeting sign, "
            "mannequins displaying trendy outfits on both sides, a digital screen showing 'WELCOME NEW CUSTOMER', "
            "balloons and celebration confetti, a gift box with a ribbon labeled 'WELCOME GIFT', "
            "shopping carts, bright store lighting, fashion displays, a loyalty card being handed over, "
            "potted plants, colorful store interior with merchandise visible. "
            "COLOR PALETTE: Welcome gold, friendly coral, happy turquoise. Warm shopping welcome."
        )
    },
    {
        "id": "all_member_exclusive",
        "title": "MEMBER EXCLUSIVE",
        "subtitle": "Special Perks for You",
        "discountText": "EXTRA 15% OFF",
        "ctaText": "MEMBERS ONLY",
        "targetGender": "all",
        "linkUrl": "/user/browse",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: A confident young Indian person (gender-neutral, waist-up to head, face CLEARLY visible with proud exclusive smile and VIP confidence) "
            "in premium fashion outfit holding a golden membership card prominently. The face shows pride and exclusive membership satisfaction. "
            "BACKGROUND FILL: An exclusive VIP shopping lounge — velvet rope barriers with golden posts marking VIP section, "
            "a champagne bar with crystal glasses, plush leather seating area with gold accents, "
            "a concierge desk with 'MEMBERS ONLY' sign, premium shopping bags with gold handles, "
            "a digital screen showing member benefits and perks, fresh flower arrangements in luxe vases, "
            "private fitting room curtains visible, golden decorative elements, soft ambient luxury lighting, "
            "exclusive merchandise displays, a rewards display board, marble accents. "
            "COLOR PALETTE: Exclusive gold, premium black, VIP red. Luxury membership privilege."
        )
    },
    {
        "id": "all_clearance",
        "title": "CLEARANCE SALE",
        "subtitle": "Last Pieces at Lowest Prices",
        "discountText": "UPTO 90% OFF",
        "ctaText": "FINAL CALL",
        "targetGender": "all",
        "linkUrl": "/user/browse",
        "prompt": CINEMATIC_PREFIX + (
            "SCENE: An excited young Indian person (gender-neutral, 3/4 body, face CLEARLY visible with thrilled bargain-hunter expression and triumphant smile) "
            "surrounded by multiple shopping bags and holding up amazing fashion finds. The face shows deal-finding excitement and satisfaction. "
            "BACKGROUND FILL: A dynamic clearance sale scene — racks overflowing with discounted clothes, large 'SALE' and '90% OFF' signs (without text in the generated image), "
            "shopping baskets full of items, price tag confetti falling, a checkout counter in the background with more bags, "
            "mannequins with 'LAST PIECE' markers, stacked shoe boxes with clearance stickers, "
            "shoppers' hands reaching for items in the background (slightly blurred), a sale clock showing limited time, "
            "discount banners and red promotional elements, shopping carts, bright retail lighting creating urgency, "
            "merchandise displays with varied fashion items. "
            "COLOR PALETTE: Urgent red, clearance orange, final call yellow. Shopping urgency and excitement."
        )
    },
]


OUTPUT_DIR = Path(__file__).parent / "generated_expanded_promo_banners"
RESULTS_FILE = Path(__file__).parent / "expanded_promo_banner_urls.json"


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
    """Upload image to Cloudinary."""
    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            folder="zammer_banners/promo/expanded",
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
    print("ZAMMER EXPANDED Promo Banners — 21 Creative Lifestyle Themes")
    print(f"Banners: {len(EXPANDED_PROMO_THEMES)} | Model: {MODEL}")
    print("=" * 70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Phase 1: Generate Images ---
    print(f"\n[PHASE 1] Generating {len(EXPANDED_PROMO_THEMES)} creative banners...")
    tasks = []
    for theme in EXPANDED_PROMO_THEMES:
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
                if done % 5 == 0:
                    print(f"\n  >>> Progress: {done}/{len(tasks)} banners <<<\n")
    else:
        print("  All banners already generated!")

    # --- Phase 2: Upload to Cloudinary ---
    print(f"\n[PHASE 2] Uploading to Cloudinary...")
    results = []

    upload_tasks = []
    for theme in EXPANDED_PROMO_THEMES:
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
    order = {t["id"]: i for i, t in enumerate(EXPANDED_PROMO_THEMES)}
    results.sort(key=lambda x: order.get(x["cloudinaryPublicId"].split("/")[-1], 999))

    # --- Phase 3: Save JSON ---
    print(f"\n[PHASE 3] Saving to {RESULTS_FILE.name}...")
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'=' * 70}")
    print(f"COMPLETE: {len(results)}/{len(EXPANDED_PROMO_THEMES)} creative banners processed")
    print(f"  Images: {OUTPUT_DIR}")
    print(f"  JSON:   {RESULTS_FILE}")
    print(f"{'=' * 70}")

    if len(results) < len(EXPANDED_PROMO_THEMES):
        print(f"\n[WARN] {len(EXPANDED_PROMO_THEMES) - len(results)} banners failed. Re-run to retry.")

    # Print JSON for easy integration
    print("\n\n// ---- EXPANDED PROMO BANNERS JSON (Add to promoBannerController.js) ----")
    print(json.dumps(results, indent=2))

    return results


if __name__ == "__main__":
    main()
