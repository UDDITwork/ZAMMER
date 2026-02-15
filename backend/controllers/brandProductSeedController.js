/**
 * Brand Product Seed Controller
 * "Insert Tinder" — seeds 52 brand products into the database under a single demo seller.
 * Each product gets proper schema fields matching existing products.
 */
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const path = require('path');
const fs = require('fs');

// Load image URLs
const URLS_PATH = path.join(__dirname, '../../scripts/all_brand_product_urls.json');

// ─── 52 product definitions with full schema fields ───
const PRODUCT_DATA = [
  // ── ADIDAS (3) ──
  { filename: 'streetwear_cargo_neon', brand: 'adidas', name: 'Streetwear Cargo Neon Tee', category: 'Men', subCategory: 'T-shirts', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Black', colorCode: '#1a1a2e', zammerPrice: 1299, mrp: 1999, isTrending: true, description: 'Black oversized drop-shoulder graphic tee with abstract geometric white line art print, paired with olive cargo joggers. Streetwear lookbook quality.' },
  { filename: 'sportswear_tracksuit_stripes', brand: 'adidas', name: 'Classic Track Jacket Stripes', category: 'Men', subCategory: 'Jackets', productCategory: 'Activewear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Sportswear', fabricType: 'Polyester', color: 'Black', colorCode: '#222222', zammerPrice: 2499, mrp: 3499, isTrending: true, description: 'Classic black polyester track jacket with three bold white stripes running down both sleeves, matching track pants. Sports catalog commercial quality.' },
  { filename: 'trendy_genz_bucket_hat', brand: 'adidas', name: 'Gen-Z Cropped Tee & Shorts', category: 'Women', subCategory: 'Tops', productCategory: 'College Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'White', colorCode: '#ffffff', zammerPrice: 999, mrp: 1499, description: 'Cropped fitted white tee with minimal abstract graphic, high-waist paperbag denim shorts, pastel bucket hat. Instagram/TikTok campaign energy.' },

  // ── NIKE (3) ──
  { filename: 'gymwear_muscular_tank', brand: 'NIKE', name: 'Muscle-Fit Gym Tank', category: 'Men', subCategory: 'T-shirts', productCategory: 'Activewear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Sportswear', fabricType: 'Cotton Blend', color: 'Charcoal Grey', colorCode: '#2d2d2d', zammerPrice: 1099, mrp: 1599, isTrending: true, description: 'Fitted charcoal grey muscle-fit sleeveless tank top that hugs every contour, with black compression shorts. Gymshark-level fitness campaign quality.' },
  { filename: 'activewear_athletic_sage', brand: 'NIKE', name: 'Athletic Sage Sports Set', category: 'Women', subCategory: 'Tops', productCategory: 'Activewear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Sage Green', colorCode: '#9caf88', zammerPrice: 1799, mrp: 2499, isTrending: true, description: 'Sage green seamless ribbed sports bra with matching high-waist leggings featuring mesh panel cutouts. Nike/Adidas campaign level realism.' },
  { filename: 'outdoor_adventure_olive_trek', brand: 'NIKE', name: 'Outdoor Trek Windbreaker', category: 'Men', subCategory: 'Jackets', productCategory: 'Travel Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Winter Wear', fabricType: 'Nylon', color: 'Olive Green', colorCode: '#4a7c59', zammerPrice: 2999, mrp: 4499, description: 'Olive green waterproof shell windbreaker jacket with sealed seams, grey moisture-wicking hiking tee. North Face outdoor campaign quality.' },

  // ── GUCCI (3) ──
  { filename: 'bold_cobalt_leather_fierce', brand: 'GUCCI', name: 'Cobalt Leather Biker Set', category: 'Women', subCategory: 'Jackets', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Cobalt Blue', colorCode: '#0047ab', zammerPrice: 8999, mrp: 14999, isLimitedEdition: true, description: 'Electric cobalt blue cropped leather biker jacket with silver hardware over a neon hot pink bodycon midi dress. Versace-level bold campaign quality.' },
  { filename: 'accessories_layered_pearl_glam', brand: 'GUCCI', name: 'Pearl & Crystal Statement Set', category: 'Women', subCategory: 'Dresses', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Satin', color: 'Black', colorCode: '#1a1a1a', zammerPrice: 7999, mrp: 12999, isLimitedEdition: true, description: 'Plain black fitted turtleneck bodycon dress as canvas for layered pearl and gold multi-chain necklaces, crystal chandelier earrings. Swarovski luxury quality.' },
  { filename: 'luxury_evening_gown_black', brand: 'GUCCI', name: 'Black Shimmer Evening Gown', category: 'Women', subCategory: 'Gowns', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Satin', color: 'Black', colorCode: '#1a1a1a', zammerPrice: 11999, mrp: 18999, isLimitedEdition: true, isTrending: true, description: 'Elegant black floor-length form-fitting evening gown with subtle all-over shimmer fabric, crystal statement choker necklace. Cartier luxury campaign quality.' },

  // ── LOUIS VUITTON (3) ──
  { filename: 'equestrian_leather_riding_tan', brand: 'Louis Vuitton', name: 'Equestrian Leather Jacket', category: 'Men', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Tan Cognac', colorCode: '#c68642', zammerPrice: 9999, mrp: 15999, isLimitedEdition: true, description: 'Perfectly structured tan cognac-brown leather jacket with clean lines, fitted black turtleneck underneath. Hermes equestrian campaign quality.' },
  { filename: 'premium_pearl_sharara_ethereal', brand: 'Louis Vuitton', name: 'Pearl Sharara Ethereal Set', category: 'Women', subCategory: 'Sharara', productCategory: 'Wedding Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Georgette', color: 'Powder Blue', colorCode: '#b0d4f1', zammerPrice: 12999, mrp: 19999, isLimitedEdition: true, description: 'Powder sky-blue georgette sharara set with delicate hand-sewn pearl bead embroidery, matching sheer organza dupatta. Anita Dongre luxury quality.' },
  { filename: 'highstreet_camel_overcoat_stride', brand: 'Louis Vuitton', name: 'Camel Wool Overcoat', category: 'Women', subCategory: 'Jackets', productCategory: 'Western Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Winter Wear', fabricType: 'Wool', color: 'Camel Tan', colorCode: '#c19a6b', zammerPrice: 10999, mrp: 16999, isLimitedEdition: true, description: 'Oversized structured camel-tan wool overcoat draped open, all-black underneath with fitted turtleneck and wide-leg trousers. Zara editorial quality.' },

  // ── ZARA (3) ──
  { filename: 'contemporary_linen_power', brand: 'ZARA', name: 'Contemporary Linen Power Blazer', category: 'Women', subCategory: 'Tops', productCategory: 'Office Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Linen', color: 'Cream', colorCode: '#f5f0e0', zammerPrice: 3499, mrp: 4999, description: 'Perfectly tailored cream off-white linen blazer draped over shoulders, rust burnt-orange silk camisole, high-waist wide-leg trousers. Massimo Dutti quality.' },
  { filename: 'minimal_cream_knit_serene', brand: 'ZARA', name: 'Minimal Cream Cable Knit', category: 'Women', subCategory: 'Tops', productCategory: 'Casual Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Winter Wear', fabricType: 'Wool', color: 'Cream White', colorCode: '#faf0e6', zammerPrice: 2499, mrp: 3499, description: 'Soft cream white cable-knit oversized sweater with visible knit texture, camel tan wide-leg wool trousers. COS minimalist quality.' },
  { filename: 'coastal_linen_beach_straw', brand: 'ZARA', name: 'Coastal Linen Beach Shirt', category: 'Women', subCategory: 'Shirts', productCategory: 'Travel Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Linen', color: 'White', colorCode: '#ffffff', zammerPrice: 1999, mrp: 2999, description: 'Breezy white pure linen button-down shirt casually knotted at waist, light stonewash boyfriend jeans, straw tote bag. Mango resort quality.' },

  // ── H&M (3) ──
  { filename: 'accessible_lilac_hoodie_cozy', brand: 'H&M', name: 'Lilac Oversized Hoodie', category: 'Women', subCategory: 'Tops', productCategory: 'College Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Lilac Purple', colorCode: '#c8a2c8', zammerPrice: 999, mrp: 1499, description: 'Oversized pastel lilac purple cotton hoodie with kangaroo pocket, black fitted biker shorts. Accessible relatable fashion.' },
  { filename: 'casual_denim_pop_green', brand: 'H&M', name: 'Washed Denim Pop Jacket', category: 'Men', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Denim', color: 'Light Blue', colorCode: '#a4c8e1', zammerPrice: 1499, mrp: 2299, description: 'Washed light blue oversized denim jacket with brass buttons over plain white crew neck tee, black ripped skinny jeans. Streetwear lookbook quality.' },
  { filename: 'fun_yellow_campus_laugh', brand: 'H&M', name: 'Sunshine Yellow Campus Tee', category: 'Men', subCategory: 'T-shirts', productCategory: 'College Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Sunshine Yellow', colorCode: '#ffd700', zammerPrice: 799, mrp: 1199, description: 'Bright sunshine yellow oversized round-neck cotton t-shirt with small quirky minimal doodle print, blue acid-wash jogger jeans. Bewakoof campaign style.' },

  // ── SUPREME (3) ──
  { filename: 'hypebeast_neon_puffer_cyber', brand: 'SUPREME', name: 'Neon Puffer Cyberpunk Jacket', category: 'Men', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Winter Wear', fabricType: 'Nylon', color: 'Neon Green', colorCode: '#39ff14', zammerPrice: 5999, mrp: 8999, isTrending: true, description: 'Neon acid-green cropped puffer jacket, black mesh tank visible, high-shine leather pants. Off-White/Balenciaga hypebeast quality.' },
  { filename: 'hiphop_tiedye_purple_smoke', brand: 'SUPREME', name: 'Tie-Dye Purple Haze Tee', category: 'Men', subCategory: 'T-shirts', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Purple', colorCode: '#6c5ce7', zammerPrice: 3999, mrp: 5999, description: 'Oversized tie-dye purple and black cotton tee with raw hem, baggy black cargo pants with silver chain detail. BAPE/Palace street brand quality.' },
  { filename: 'desi_hiphop_graffiti_hoodie', brand: 'SUPREME', name: 'Desi Graffiti Hindi Hoodie', category: 'Men', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Black', colorCode: '#222222', zammerPrice: 4499, mrp: 6999, isTrending: true, description: 'Oversized black cotton hoodie with large white abstract graffiti Hindi Devanagari script artwork, distressed ripped jeans. Gully boy street brand quality.' },

  // ── OFF-WHITE (3) ──
  { filename: 'edgy_distressed_hoodie_red', brand: 'OFF-WHITE', name: 'Distressed Raw Edge Hoodie', category: 'Men', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Washed Black', colorCode: '#333333', zammerPrice: 5499, mrp: 8499, isLimitedEdition: true, description: 'Oversized washed black distressed hoodie with raw frayed edges, baggy grey sweatpants, chunky platform combat boots. Supreme/Stussy quality.' },
  { filename: 'winter_icy_blue_puffer', brand: 'OFF-WHITE', name: 'Icy Blue Oversized Puffer', category: 'Men', subCategory: 'Jackets', productCategory: 'Winter Fashion', categoryLevel1: 'Men Fashion', categoryLevel2: 'Winter Wear', fabricType: 'Nylon', color: 'Icy Blue', colorCode: '#a8d8ea', zammerPrice: 6999, mrp: 10999, isLimitedEdition: true, description: 'Icy powder blue oversized long puffer jacket with fur-lined hood, black merino wool turtleneck. Canada Goose/Moncler winter quality.' },
  { filename: 'bold_scarlet_blazer_dress', brand: 'OFF-WHITE', name: 'Scarlet Satin Blazer Dress', category: 'Women', subCategory: 'Dresses', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Satin', color: 'Scarlet Red', colorCode: '#ff2400', zammerPrice: 7999, mrp: 12999, isLimitedEdition: true, description: 'Fiery scarlet red structured satin blazer dress with strong shoulders and plunging neckline, stiletto knee-high boots. Saint Laurent bold quality.' },

  // ── TOMMY HILFIGER (3) ──
  { filename: 'premium_bomber_navy', brand: 'Tommy Hilfiger', name: 'Navy Bomber Jacket', category: 'Men', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Navy Blue', colorCode: '#1b2a4a', zammerPrice: 3999, mrp: 5999, description: 'Structured navy blue bomber jacket with ribbed olive cuffs and collar, heather grey crew neck tee, tan chinos. Ralph Lauren level quality.' },
  { filename: 'smartcasual_linen_blazer_resort', brand: 'Tommy Hilfiger', name: 'Linen Resort Blazer', category: 'Men', subCategory: 'Suits', productCategory: 'Travel Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Linen', color: 'Navy Blue', colorCode: '#1b3a5c', zammerPrice: 4499, mrp: 6999, description: 'Structured navy blue linen blazer with patch pockets, white fitted crew-neck tee, tailored shorts. Weekend resort-wear brunch quality.' },
  { filename: 'premium_white_oxford_polished', brand: 'Tommy Hilfiger', name: 'Premium White Oxford Shirt', category: 'Men', subCategory: 'Shirts', productCategory: 'Office Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'White', colorCode: '#ffffff', zammerPrice: 2999, mrp: 4499, description: 'Crisp pure white slim-fit cotton Oxford shirt with visible premium fabric texture, sleeves rolled to mid-forearm. Brooks Brothers quality.' },

  // ── PUMA (2) ──
  { filename: 'varsity_wool_mauve', brand: 'PUMA', name: 'Wool Varsity Jacket Mauve', category: 'Men', subCategory: 'Jackets', productCategory: 'College Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Wool', color: 'Charcoal Grey', colorCode: '#555555', zammerPrice: 2499, mrp: 3999, description: 'Charcoal grey wool varsity jacket with cream white leather sleeves, chenille letter patches, brass snap buttons. Premium college-wear lookbook quality.' },
  { filename: 'cozy_fleece_grey_mug', brand: 'PUMA', name: 'Cozy Fleece Hoodie Set', category: 'Women', subCategory: 'Nightwear', productCategory: 'Nightwear & Loungewear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Sleepwear & Loungewear', fabricType: 'Cotton Blend', color: 'Heather Grey', colorCode: '#b8b8b8', zammerPrice: 1799, mrp: 2499, description: 'Ultra-soft oversized heather grey teddy-bear fleece hoodie with matching grey fleece joggers. Uniqlo/MUJI cozy loungewear quality.' },

  // ── CALVIN KLEIN (3) ──
  { filename: 'friday_dressing_pink_shirt', brand: 'Calvin Klein', name: 'Friday Dressing Pink Shirt', category: 'Men', subCategory: 'Shirts', productCategory: 'Office Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Pastel Pink', colorCode: '#f0c4c4', zammerPrice: 2499, mrp: 3499, description: 'Smart slim-fit pastel pink cotton shirt with neat button-down collar, sleeves rolled to mid-forearm. Allen Solly Friday Dressing quality.' },
  { filename: 'lingerie_satin_lavender', brand: 'Calvin Klein', name: 'Satin Lavender Robe Set', category: 'Women', subCategory: 'Nightwear', productCategory: 'Nightwear & Loungewear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Sleepwear & Loungewear', fabricType: 'Satin', color: 'Lavender Purple', colorCode: '#b57edc', zammerPrice: 2999, mrp: 4499, description: 'Soft lavender purple satin short robe with matching lace-trimmed satin camisole and shorts set. Clovia/Zivame premium loungewear quality.' },
  { filename: 'loungewear_satin_blush', brand: 'Calvin Klein', name: 'Blush Satin PJ Set', category: 'Women', subCategory: 'Nightwear', productCategory: 'Nightwear & Loungewear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Sleepwear & Loungewear', fabricType: 'Satin', color: 'Blush Pink', colorCode: '#f8c8dc', zammerPrice: 2499, mrp: 3999, description: 'Soft blush pink satin camisole with delicate lace trim at neckline, matching pink satin wide-leg pajama pants. Victoria Secret Sleep quality.' },

  // ── UNIQLO (2) ──
  { filename: 'sustainable_organic_oatmeal', brand: 'UNIQLO', name: 'Organic Oatmeal Sweatshirt', category: 'Women', subCategory: 'Tops', productCategory: 'Casual Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Oatmeal', colorCode: '#d4c5a9', zammerPrice: 1299, mrp: 1999, description: 'Organic cotton oatmeal-colored oversized crewneck sweatshirt with visible soft texture, matching wide-leg lounge pants. Everlane/Muji minimal quality.' },
  { filename: 'sustainable_khadi_shibori', brand: 'UNIQLO', name: 'Khadi Shibori Midi Dress', category: 'Women', subCategory: 'Dresses', productCategory: 'Casual Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Khadi', color: 'Indigo Blue', colorCode: '#3f51b5', zammerPrice: 1499, mrp: 2299, description: 'Handloom off-white khadi midi dress with indigo blue shibori tie-dye organic pattern, woven jute waist belt. Eileen Fisher sustainable quality.' },

  // ── LEVI'S (3) ──
  { filename: 'thrift_vintage_denim_patches', brand: "Levi's", name: 'Vintage Denim Patch Jacket', category: 'Women', subCategory: 'Jackets', productCategory: 'Casual Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Denim', color: 'Washed Denim', colorCode: '#8fa3b0', zammerPrice: 1999, mrp: 2999, description: 'Vintage oversized washed denim jacket covered in eclectic iron-on patches and pins, printed retro graphic band tee. Depop/Beyond Retro quality.' },
  { filename: 'artisanal_indigo_block_tote', brand: "Levi's", name: 'Indigo Block-Print Kurta', category: 'Women', subCategory: 'Kurtis', productCategory: 'Ethnic Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Cotton', color: 'Indigo Blue', colorCode: '#3f51b5', zammerPrice: 1299, mrp: 1999, description: 'Hand-block-printed indigo blue cotton A-line kurta with white geometric dabu print patterns, white cotton palazzo pants. FabIndia quality.' },
  { filename: 'smart_casual_gingham_blue', brand: "Levi's", name: 'Gingham Check Smart Shirt', category: 'Men', subCategory: 'Shirts', productCategory: 'Office Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Blue White Gingham', colorCode: '#87ceeb', zammerPrice: 1499, mrp: 2299, description: 'Slim-fit blue and white gingham checked cotton shirt with sleeves rolled to mid-forearm, navy tailored chinos. Peter England quality.' },

  // ── MANGO (3) ──
  { filename: 'cocktail_coral_ruffle_twirl', brand: 'MANGO', name: 'Coral Ruffle Cocktail Dress', category: 'Women', subCategory: 'Dresses', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Georgette', color: 'Coral Pink', colorCode: '#f88379', zammerPrice: 2999, mrp: 4499, description: 'Coral pink off-shoulder ruffle midi dress with subtle 3D floral applique details on skirt. Self-Portrait cocktail dress quality.' },
  { filename: 'floral_pastel_saree_spring', brand: 'MANGO', name: 'Pastel Floral Spring Saree', category: 'Women', subCategory: 'Sarees', productCategory: 'Festive Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Georgette', color: 'Pastel Pink', colorCode: '#ffc0cb', zammerPrice: 3499, mrp: 5499, description: 'Lightweight georgette saree in soft pastel pink with all-over watercolor-style floral print, matching blouse. Sabyasachi luxury quality.' },
  { filename: 'boho_mirrorwork_terracotta', brand: 'MANGO', name: 'Boho Mirror-Work Anarkali', category: 'Women', subCategory: 'Kurtis', productCategory: 'Ethnic Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Cotton', color: 'Rust Terracotta', colorCode: '#c0956e', zammerPrice: 2499, mrp: 3999, description: 'Rust terracotta hand block-printed Anarkali kurta with circular mirror-work embellishments, oxidized silver jhumka earrings. FabIndia quality.' },

  // ── VAN HEUSEN (2) ──
  { filename: 'formal_threepiece_charcoal', brand: 'Van Heusen', name: 'Charcoal Three-Piece Suit', category: 'Men', subCategory: 'Suits', productCategory: 'Office Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Charcoal Grey', colorCode: '#36454f', zammerPrice: 5999, mrp: 8999, description: 'Charcoal grey three-piece suit with subtle windowpane check, crisp white dress shirt, deep burgundy silk tie. Hugo Boss formal quality.' },
  { filename: 'indowestern_draped_wine', brand: 'Van Heusen', name: 'Indo-Western Draped Kurta', category: 'Women', subCategory: 'Kurtis', productCategory: 'Fusion Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Silk', color: 'Wine Burgundy', colorCode: '#722f37', zammerPrice: 3499, mrp: 5499, description: 'Asymmetric draped kurta in deep wine burgundy with contemporary diagonal hem cuts, dhoti-style draped pants. Abraham & Thakore fusion quality.' },

  // ── ALLEN SOLLY (2) ──
  { filename: 'festive_anarkali_maroon_gold', brand: 'Allen Solly', name: 'Festive Maroon Gold Anarkali', category: 'Women', subCategory: 'Ethnic Sets', productCategory: 'Festive Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Silk', color: 'Maroon Gold', colorCode: '#800020', zammerPrice: 3999, mrp: 5999, description: 'Deep rich maroon and gold floor-length Anarkali suit with heavy zari and resham thread work, matching gold-bordered dupatta. Meena Bazaar quality.' },
  { filename: 'ethnic_chanderi_emerald', brand: 'Allen Solly', name: 'Emerald Chanderi Silk Kurta', category: 'Women', subCategory: 'Kurtis', productCategory: 'Ethnic Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Silk', color: 'Emerald Green', colorCode: '#50c878', zammerPrice: 2499, mrp: 3999, description: 'Emerald green chanderi silk straight-cut kurta with delicate small gold block-print motifs, cream cotton palazzos. W/Aurelia premium ethnic quality.' },

  // ── JACK & JONES (2) ──
  { filename: 'quirky_colorblock_pigtails', brand: 'Jack & Jones', name: 'Color-Block Oversized Sweatshirt', category: 'Women', subCategory: 'Tops', productCategory: 'College Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Pink/Blue/Yellow', colorCode: '#ff69b4', zammerPrice: 1499, mrp: 2299, description: 'Color-blocked oversized sweatshirt in bold pink, sky blue, and yellow geometric panels, high-waist light wash mom jeans. Lazy Oaf quirky quality.' },
  { filename: 'ethnic_fusion_zardozi_blue', brand: 'Jack & Jones', name: 'Royal Blue Zardozi Kurta Set', category: 'Women', subCategory: 'Kurtis', productCategory: 'Ethnic Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Silk', color: 'Royal Blue', colorCode: '#1a3c8b', zammerPrice: 2999, mrp: 4499, description: 'Royal blue raw silk straight-cut kurta with intricate gold zardozi embroidery on neckline and cuffs, white cotton sharara. Luxury Indian ethnic quality.' },

  // ── FOREVER 21 (3) ──
  { filename: 'glamour_red_bodycon_bold', brand: 'Forever 21', name: 'Cherry Red Bodycon Midi', category: 'Women', subCategory: 'Dresses', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Cherry Red', colorCode: '#de3163', zammerPrice: 1499, mrp: 2299, description: 'Fitted cherry red bodycon midi dress with thin straps and small gold hardware detail, pointed-toe leather ankle boots. GUESS campaign quality.' },
  { filename: 'quirky_indian_elephant_twirl', brand: 'Forever 21', name: 'Quirky Elephant Print Kurta', category: 'Women', subCategory: 'Kurtis', productCategory: 'Ethnic Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Cotton', color: 'Orange Multi', colorCode: '#ff7f50', zammerPrice: 1299, mrp: 1999, description: 'Vibrant printed cotton A-line kurta covered in whimsical elephant and peacock motifs in orange, teal, and pink. Chumbak quirky-Indian quality.' },
  { filename: 'plussize_wrap_dress_wine', brand: 'Forever 21', name: 'Plus-Size Wine Wrap Dress', category: 'Women', subCategory: 'Dresses', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Burgundy Wine', colorCode: '#722f37', zammerPrice: 1799, mrp: 2799, description: 'Flowing burgundy wine-red wrap dress with flutter sleeves that drapes elegantly, gold statement hoop earrings. Plus-size fashion catalog quality.' },

  // ── SUPERDRY (2) ──
  { filename: 'party_glam_sequin_gold', brand: 'Superdry', name: 'Gold Sequin Bodycon Mini', category: 'Women', subCategory: 'Dresses', productCategory: 'Party Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Western Wear', fabricType: 'Polyester', color: 'Champagne Gold', colorCode: '#ffd700', zammerPrice: 3499, mrp: 5499, isTrending: true, description: 'Champagne gold sequined bodycon mini dress that catches every light, crystal-encrusted thin-strap stiletto heels. Balmain/Versace party quality.' },
  { filename: 'handloom_banarasi_bridal', brand: 'Superdry', name: 'Banarasi Silk Bridal Saree', category: 'Women', subCategory: 'Sarees', productCategory: 'Wedding Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Silk', color: 'Mustard Yellow', colorCode: '#e0a800', zammerPrice: 4999, mrp: 7999, description: 'Handwoven mustard yellow Banarasi silk saree with deep crimson red border and gold zari patterns, complete gold temple jewelry. Sabyasachi quality.' },

  // ── U.S. POLO (2) ──
  { filename: 'bridal_magenta_lehenga_royal', brand: 'U.S. Polo', name: 'Royal Magenta Bridal Lehenga', category: 'Women', subCategory: 'Lehengas', productCategory: 'Wedding Wear', categoryLevel1: 'Women Fashion', categoryLevel2: 'Ethnic Wear', fabricType: 'Silk', color: 'Deep Magenta', colorCode: '#8b0045', zammerPrice: 5999, mrp: 9999, description: 'Rich deep magenta Banarasi silk lehenga with heavy intricate gold zari and thread work, matching short choli blouse. Manish Malhotra bridal quality.' },
  { filename: 'smart_casual_gingham_blue_2', realFilename: 'smart_casual_gingham_blue', brand: 'U.S. Polo', name: 'Smart Casual Gingham Shirt', category: 'Men', subCategory: 'Shirts', productCategory: 'Office Wear', categoryLevel1: 'Men Fashion', categoryLevel2: 'Western Wear', fabricType: 'Cotton', color: 'Blue White Check', colorCode: '#87ceeb', zammerPrice: 1699, mrp: 2499, description: 'Slim-fit blue and white gingham checked cotton shirt with sleeves rolled to mid-forearm, navy tailored chinos. Peter England catalog quality.' },
];

/**
 * Creates or finds the demo seller "ZAMMER Official Store"
 */
async function getOrCreateDemoSeller() {
  const email = 'official@zammer.in';
  let seller = await Seller.findOne({ email });
  if (seller) return seller;

  seller = new Seller({
    firstName: 'ZAMMER',
    email,
    password: 'ZammerOfficial2024!',
    mobileNumber: '9999900000',
    shop: {
      name: 'ZAMMER Official Store',
      address: 'Fashion Street, Mumbai, Maharashtra 400001',
      category: 'Women',
      phoneNumber: { main: '9999900000' },
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      description: 'Official ZAMMER flagship store featuring curated collections from top global and Indian brands.',
    },
    isVerified: true,
  });
  await seller.save();
  console.log('Created demo seller:', seller._id);
  return seller;
}

/**
 * POST /api/brand-products/seed
 * "Insert Tinder" — seeds 52 brand products
 */
const seedBrandProducts = async (req, res) => {
  try {
    // Load Cloudinary URLs
    if (!fs.existsSync(URLS_PATH)) {
      return res.status(400).json({ success: false, message: 'all_brand_product_urls.json not found. Generate images first.' });
    }
    const imageUrls = JSON.parse(fs.readFileSync(URLS_PATH, 'utf-8'));

    // Get/create seller
    const seller = await getOrCreateDemoSeller();

    // Check if already seeded
    const existingCount = await Product.countDocuments({ seller: seller._id, brand: { $ne: '' } });
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Already seeded ${existingCount} brand products. Clear first before re-seeding.`,
        count: existingCount,
      });
    }

    // Build product documents
    const products = PRODUCT_DATA.map((p) => {
      const fname = p.realFilename || p.filename;
      const imageUrl = imageUrls[fname];
      if (!imageUrl) {
        console.warn(`No image URL for ${fname}, skipping`);
        return null;
      }

      const sizes = ['S', 'M', 'L', 'XL'];
      const variants = sizes.map((size) => ({
        size,
        color: p.color,
        colorCode: p.colorCode,
        quantity: Math.floor(Math.random() * 30) + 10, // 10-39
        images: [imageUrl],
      }));

      const totalQty = variants.reduce((sum, v) => sum + v.quantity, 0);

      return {
        seller: seller._id,
        name: p.name,
        description: p.description,
        category: p.category,
        subCategory: p.subCategory,
        productCategory: p.productCategory || '',
        categoryLevel1: p.categoryLevel1 || '',
        categoryLevel2: p.categoryLevel2 || '',
        categoryLevel3: '',
        categoryLevel4: '',
        categoryPath: p.categoryLevel1 && p.categoryLevel2 ? `${p.categoryLevel1} > ${p.categoryLevel2}` : '',
        zammerPrice: p.zammerPrice,
        mrp: p.mrp,
        brand: p.brand,
        fabricType: p.fabricType || '',
        composition: p.fabricType ? `${p.fabricType} Blend` : 'Cotton 100%',
        material: p.fabricType || 'Cotton',
        images: [imageUrl],
        variants,
        tags: [p.brand.toLowerCase(), p.category.toLowerCase(), (p.productCategory || '').toLowerCase(), 'tinder-collection'].filter(Boolean),
        status: 'active',
        isTrending: p.isTrending || false,
        isLimitedEdition: p.isLimitedEdition || false,
        shipping: 'Standard',
        inventory: {
          totalQuantity: totalQty,
          lowStockThreshold: 5,
          isLowStock: false,
          lastStockUpdate: new Date(),
          reservedQuantity: 0,
          availableQuantity: totalQty,
        },
        inventoryHistory: [{
          action: 'product_created',
          quantity: totalQty,
          previousQuantity: 0,
          newQuantity: totalQty,
          sellerId: seller._id,
          notes: 'Seeded via Insert Tinder',
          timestamp: new Date(),
        }],
        averageRating: +(3.5 + Math.random() * 1.5).toFixed(1), // 3.5-5.0
        numReviews: Math.floor(Math.random() * 50) + 5, // 5-54
      };
    }).filter(Boolean);

    const result = await Product.insertMany(products);

    res.json({
      success: true,
      message: `Successfully seeded ${result.length} brand products under "${seller.shop.name}"`,
      data: {
        count: result.length,
        sellerId: seller._id,
        sellerName: seller.shop.name,
        brands: [...new Set(products.map((p) => p.brand))],
      },
    });
  } catch (error) {
    console.error('Seed brand products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/brand-products/clear
 */
const clearBrandProducts = async (req, res) => {
  try {
    const seller = await Seller.findOne({ email: 'official@zammer.in' });
    if (!seller) {
      return res.json({ success: true, message: 'No demo seller found. Nothing to clear.', count: 0 });
    }
    const result = await Product.deleteMany({ seller: seller._id });
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} brand products`,
      count: result.deletedCount,
    });
  } catch (error) {
    console.error('Clear brand products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/brand-products/status
 */
const getBrandSeedStatus = async (req, res) => {
  try {
    const seller = await Seller.findOne({ email: 'official@zammer.in' });
    if (!seller) {
      return res.json({ success: true, data: { count: 0, sellerExists: false } });
    }
    const count = await Product.countDocuments({ seller: seller._id });
    const brands = await Product.distinct('brand', { seller: seller._id });
    res.json({
      success: true,
      data: {
        count,
        sellerExists: true,
        sellerId: seller._id,
        sellerName: seller.shop.name,
        brands,
      },
    });
  } catch (error) {
    console.error('Brand seed status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { seedBrandProducts, clearBrandProducts, getBrandSeedStatus };
