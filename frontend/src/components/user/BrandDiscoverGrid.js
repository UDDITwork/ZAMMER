import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

// All brands with Cloudinary URLs
const ALL_BRANDS = [
  { id: 'gucci', name: 'GUCCI', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127953/zammer_banners/brand_logos/gucci.png', tag: 'LUXURY' },
  { id: 'louis_vuitton', name: 'Louis Vuitton', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127960/zammer_banners/brand_logos/louis_vuitton.svg', tag: 'LUXURY' },
  { id: 'nike', name: 'NIKE', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657448/zammer_banners/brand_logos/nike.jpg' },
  { id: 'adidas', name: 'adidas', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/adidas.jpg' },
  { id: 'zara', name: 'ZARA', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/zara.jpg' },
  { id: 'hm', name: 'H&M', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/hm.jpg' },
  { id: 'supreme', name: 'SUPREME', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127954/zammer_banners/brand_logos/supreme.svg', tag: 'NEW' },
  { id: 'offwhite', name: 'OFF-WHITE', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127956/zammer_banners/brand_logos/offwhite.png', tag: 'NEW' },
  { id: 'tommy', name: 'Tommy Hilfiger', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127957/zammer_banners/brand_logos/tommy_hilfiger.png' },
  { id: 'puma', name: 'PUMA', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657448/zammer_banners/brand_logos/puma.jpg' },
  { id: 'calvinklein', name: 'Calvin Klein', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/calvinklein.jpg' },
  { id: 'uniqlo', name: 'UNIQLO', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127962/zammer_banners/brand_logos/uniqlo_new.png' },
  { id: 'levis', name: "Levi's", logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/levis.jpg' },
  { id: 'mango', name: 'MANGO', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657452/zammer_banners/brand_logos/mango.jpg' },
  { id: 'vanheusen', name: 'Van Heusen', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127959/zammer_banners/brand_logos/vanheusen_new.jpg' },
  { id: 'allensolly', name: 'Allen Solly', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657451/zammer_banners/brand_logos/allensolly.jpg' },
  { id: 'jackjones', name: 'Jack & Jones', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/jackjones.jpg' },
  { id: 'forever21', name: 'Forever 21', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657452/zammer_banners/brand_logos/forever21.jpg' },
  { id: 'superdry', name: 'Superdry', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657454/zammer_banners/brand_logos/superdry.jpg', tag: 'NEW' },
  { id: 'uspolo', name: 'U.S. Polo', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/uspolo.jpg' },
];

// Cloudinary brand product image helper (auto-format, quality, portrait crop)
const bp = (name) => `https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto,w_480/zammer_banners/brand_products/${name}.png`;

// Brand lookbook: 52 product images mapped across 20 brands
const BRAND_LOOKBOOK = {
  gucci: [bp('bold_cobalt_leather_fierce'), bp('accessories_layered_pearl_glam'), bp('luxury_evening_gown_black')],
  louis_vuitton: [bp('equestrian_leather_riding_tan'), bp('premium_pearl_sharara_ethereal'), bp('highstreet_camel_overcoat_stride')],
  nike: [bp('gymwear_muscular_tank'), bp('activewear_athletic_sage'), bp('outdoor_adventure_olive_trek')],
  adidas: [bp('streetwear_cargo_neon'), bp('sportswear_tracksuit_stripes'), bp('trendy_genz_bucket_hat')],
  zara: [bp('contemporary_linen_power'), bp('minimal_cream_knit_serene'), bp('coastal_linen_beach_straw')],
  hm: [bp('accessible_lilac_hoodie_cozy'), bp('casual_denim_pop_green'), bp('fun_yellow_campus_laugh')],
  supreme: [bp('hypebeast_neon_puffer_cyber'), bp('hiphop_tiedye_purple_smoke'), bp('desi_hiphop_graffiti_hoodie')],
  offwhite: [bp('edgy_distressed_hoodie_red'), bp('winter_icy_blue_puffer'), bp('bold_scarlet_blazer_dress')],
  tommy: [bp('premium_bomber_navy'), bp('smartcasual_linen_blazer_resort'), bp('premium_white_oxford_polished')],
  puma: [bp('varsity_wool_mauve'), bp('cozy_fleece_grey_mug')],
  calvinklein: [bp('friday_dressing_pink_shirt'), bp('lingerie_satin_lavender'), bp('loungewear_satin_blush')],
  uniqlo: [bp('sustainable_organic_oatmeal'), bp('sustainable_khadi_shibori')],
  levis: [bp('thrift_vintage_denim_patches'), bp('artisanal_indigo_block_tote'), bp('smart_casual_gingham_blue')],
  mango: [bp('cocktail_coral_ruffle_twirl'), bp('floral_pastel_saree_spring'), bp('boho_mirrorwork_terracotta')],
  vanheusen: [bp('formal_threepiece_charcoal'), bp('indowestern_draped_wine')],
  allensolly: [bp('festive_anarkali_maroon_gold'), bp('ethnic_chanderi_emerald')],
  jackjones: [bp('quirky_colorblock_pigtails'), bp('ethnic_fusion_zardozi_blue')],
  forever21: [bp('glamour_red_bodycon_bold'), bp('quirky_indian_elephant_twirl'), bp('plussize_wrap_dress_wine')],
  superdry: [bp('party_glam_sequin_gold'), bp('handloom_banarasi_bridal')],
  uspolo: [bp('bridal_magenta_lehenga_royal'), bp('smart_casual_gingham_blue')],
};

const ITEMS_PER_PAGE = 12; // 4 cols × 3 rows
const totalPages = Math.ceil(ALL_BRANDS.length / ITEMS_PER_PAGE);

const BrandDiscoverGrid = () => {
  const [page, setPage] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const pageStart = page * ITEMS_PER_PAGE;
  const currentBrands = ALL_BRANDS.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const nextPage = useCallback(() => setPage(p => Math.min(p + 1, totalPages - 1)), []);
  const prevPage = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Discover Brands</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Shop from your favourite labels</p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={prevPage} disabled={page === 0}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button onClick={nextPage} disabled={page === totalPages - 1}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          <AnimatePresence mode="wait">
            {currentBrands.map((brand, i) => (
              <motion.button
                key={brand.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => setSelectedBrand(brand)}
                className="group relative flex flex-col items-center"
                style={{ perspective: '600px' }}
              >
                {/* Tag badge */}
                {brand.tag && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10">
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-sm ${
                      brand.tag === 'LUXURY' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                      brand.tag === 'NEW' ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                      'bg-gradient-to-r from-rose-500 to-pink-500'
                    }`}>
                      {brand.tag}
                    </span>
                  </div>
                )}

                {/* Card */}
                <div className="w-full aspect-square rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-3 sm:p-4 overflow-hidden transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-lg group-hover:shadow-black/[0.06]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    draggable="false"
                  />
                </div>

                {/* Brand name */}
                <p className="mt-1.5 text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 group-hover:text-black transition-colors">
                  {brand.name}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination dots + See All */}
        <div className="flex items-center justify-center mt-5 gap-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded-full transition-all duration-400 ${
                    i === page ? 'w-5 h-2 bg-black' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}
          <Link
            to="/user/products"
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-black transition-colors"
          >
            See all Brands <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Brand Lookbook Modal */}
      <AnimatePresence>
        {selectedBrand && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedBrand(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="relative bg-gradient-to-br from-gray-50 to-white p-8 flex flex-col items-center border-b border-gray-100">
                <button
                  onClick={() => setSelectedBrand(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-200 transition-all"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
                <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 flex items-center justify-center p-3 shadow-sm mb-4">
                  <img src={selectedBrand.logo} alt={selectedBrand.name} className="w-full h-full object-contain" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{selectedBrand.name}</h3>
                {selectedBrand.tag && (
                  <span className={`mt-1 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${
                    selectedBrand.tag === 'LUXURY' ? 'bg-amber-500' :
                    selectedBrand.tag === 'NEW' ? 'bg-violet-500' : 'bg-rose-500'
                  }`}>{selectedBrand.tag}</span>
                )}
              </div>

              {/* Lookbook images */}
              <div className="p-5">
                {BRAND_LOOKBOOK[selectedBrand.id] ? (
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {BRAND_LOOKBOOK[selectedBrand.id].map((img, idx) => {
                      const images = BRAND_LOOKBOOK[selectedBrand.id];
                      const isLastOdd = images.length % 2 === 1 && idx === images.length - 1;
                      return (
                        <div key={idx} className={`aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 ${isLastOdd ? 'col-span-2 aspect-[3/2]' : ''}`}>
                          <img src={img} alt={`${selectedBrand.name} lookbook`} className="w-full h-full object-cover object-top" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                      <img src={selectedBrand.logo} alt="" className="w-10 h-10 object-contain opacity-40" />
                    </div>
                    <p className="text-sm text-gray-400">Lookbook coming soon</p>
                  </div>
                )}

                <Link
                  to={`/user/products?brand=${encodeURIComponent(selectedBrand.name)}`}
                  onClick={() => setSelectedBrand(null)}
                  className="block w-full text-center bg-black text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Shop {selectedBrand.name}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BrandDiscoverGrid;
