const Banner = require('../models/Banner');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Embedded banner data (AI-generated images from Cloudinary)
const BANNER_DATA = {"level1":[{"categoryLevel1":"Men Fashion","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088702/zammer_banners/level1/men_fashion.jpg","cloudinaryPublicId":"zammer_banners/level1/men_fashion"},{"categoryLevel1":"Kids Fashion","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088702/zammer_banners/level1/kids_fashion.jpg","cloudinaryPublicId":"zammer_banners/level1/kids_fashion"},{"categoryLevel1":"Women Fashion","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088702/zammer_banners/level1/women_fashion.jpg","cloudinaryPublicId":"zammer_banners/level1/women_fashion"}],"level2":[{"categoryLevel1":"Men Fashion","categoryLevel2":"Western Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579466/zammer_banners/level2/zammer_banners/level2/men_fashion_western_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/men_fashion_western_wear","title":"Western Wear","subtitle":"Explore Western Wear"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sleepwear & Loungewear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579466/zammer_banners/level2/zammer_banners/level2/men_fashion_sleepwear_loungewear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/men_fashion_sleepwear_loungewear","title":"Sleepwear & Loungewear","subtitle":"Explore Sleepwear & Loungewear"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Ethnic Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579466/zammer_banners/level2/zammer_banners/level2/men_fashion_ethnic_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/men_fashion_ethnic_wear","title":"Ethnic Wear","subtitle":"Explore Ethnic Wear"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sportswear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579466/zammer_banners/level2/zammer_banners/level2/men_fashion_sportswear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/men_fashion_sportswear","title":"Sportswear","subtitle":"Explore Sportswear"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Winter Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579466/zammer_banners/level2/zammer_banners/level2/men_fashion_winter_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/men_fashion_winter_wear","title":"Winter Wear","subtitle":"Explore Winter Wear"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579466/zammer_banners/level2/zammer_banners/level2/women_fashion_western_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/women_fashion_western_wear","title":"Western Wear","subtitle":"Explore Western Wear"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Ethnic Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579467/zammer_banners/level2/zammer_banners/level2/women_fashion_ethnic_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/women_fashion_ethnic_wear","title":"Ethnic Wear","subtitle":"Explore Ethnic Wear"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Lingerie & Innerwear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579467/zammer_banners/level2/zammer_banners/level2/women_fashion_lingerie_innerwear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/women_fashion_lingerie_innerwear","title":"Lingerie & Innerwear","subtitle":"Explore Lingerie & Innerwear"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Sleepwear & Loungewear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579467/zammer_banners/level2/zammer_banners/level2/women_fashion_sleepwear_loungewear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/women_fashion_sleepwear_loungewear","title":"Sleepwear & Loungewear","subtitle":"Explore Sleepwear & Loungewear"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Boys Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579467/zammer_banners/level2/zammer_banners/level2/kids_fashion_boys_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/kids_fashion_boys_wear","title":"Boys Wear","subtitle":"Explore Boys Wear"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Girls Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579468/zammer_banners/level2/zammer_banners/level2/kids_fashion_girls_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/kids_fashion_girls_wear","title":"Girls Wear","subtitle":"Explore Girls Wear"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Infant Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579468/zammer_banners/level2/zammer_banners/level2/kids_fashion_infant_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/kids_fashion_infant_wear","title":"Infant Wear","subtitle":"Explore Infant Wear"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Bottom Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579468/zammer_banners/level2/zammer_banners/level2/women_fashion_bottom_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/women_fashion_bottom_wear","title":"Bottom Wear","subtitle":"Explore Bottom Wear"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"School Uniforms","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579468/zammer_banners/level2/zammer_banners/level2/kids_fashion_school_uniforms.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/kids_fashion_school_uniforms","title":"School Uniforms","subtitle":"Explore School Uniforms"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Winter Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770579469/zammer_banners/level2/zammer_banners/level2/women_fashion_winter_wear.jpg","cloudinaryPublicId":"zammer_banners/level2/zammer_banners/level2/women_fashion_winter_wear","title":"Winter Wear","subtitle":"Explore Winter Wear"}],"level3":[{"categoryLevel1":"Men Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Kurtas & Kurta Sets","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088707/zammer_banners/level3/men_fashion_ethnic_wear_kurtas_and_kurta_sets.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_ethnic_wear_kurtas_and_kurta_sets"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Ethnic Sets","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088707/zammer_banners/level3/men_fashion_ethnic_wear_ethnic_sets.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_ethnic_wear_ethnic_sets"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Sherwanis","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088707/zammer_banners/level3/men_fashion_ethnic_wear_sherwanis.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_ethnic_wear_sherwanis"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Dhotis & Mundus","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088708/zammer_banners/level3/men_fashion_ethnic_wear_dhotis_and_mundus.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_ethnic_wear_dhotis_and_mundus"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Jeans","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088708/zammer_banners/level3/men_fashion_western_wear_jeans.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_western_wear_jeans"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Western Wear","categoryLevel3":"T-Shirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088709/zammer_banners/level3/men_fashion_western_wear_t-shirts.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_western_wear_t-shirts"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Trousers","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088709/zammer_banners/level3/men_fashion_western_wear_trousers.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_western_wear_trousers"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Shorts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088709/zammer_banners/level3/men_fashion_western_wear_shorts.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_western_wear_shorts"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Shirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088708/zammer_banners/level3/men_fashion_western_wear_shirts.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_western_wear_shirts"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Nehru Jackets","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088710/zammer_banners/level3/men_fashion_ethnic_wear_nehru_jackets.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_ethnic_wear_nehru_jackets"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Winter Wear","categoryLevel3":"Jackets","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088710/zammer_banners/level3/men_fashion_winter_wear_jackets.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_winter_wear_jackets"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Winter Wear","categoryLevel3":"Thermals","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088710/zammer_banners/level3/men_fashion_winter_wear_thermals.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_winter_wear_thermals"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sportswear","categoryLevel3":"Sports T-Shirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088711/zammer_banners/level3/men_fashion_sportswear_sports_t-shirts.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_sportswear_sports_t-shirts"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Winter Wear","categoryLevel3":"Sweaters & Sweatshirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088710/zammer_banners/level3/men_fashion_winter_wear_sweaters_and_sweatshirts.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_winter_wear_sweaters_and_sweatshirts"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sportswear","categoryLevel3":"Track Pants","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088711/zammer_banners/level3/men_fashion_sportswear_track_pants.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_sportswear_track_pants"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sportswear","categoryLevel3":"Sports Shorts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088711/zammer_banners/level3/men_fashion_sportswear_sports_shorts.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_sportswear_sports_shorts"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sleepwear & Loungewear","categoryLevel3":"Night Suits","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088712/zammer_banners/level3/men_fashion_sleepwear_and_loungewear_night_suits.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_sleepwear_and_loungewear_night_suits"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sleepwear & Loungewear","categoryLevel3":"Pyjamas","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088712/zammer_banners/level3/men_fashion_sleepwear_and_loungewear_pyjamas.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_sleepwear_and_loungewear_pyjamas"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Sarees, Blouses & Petticoats","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088712/zammer_banners/level3/women_fashion_ethnic_wear_sarees_blouses_and_petticoats.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_ethnic_wear_sarees_blouses_and_petticoats"},{"categoryLevel1":"Men Fashion","categoryLevel2":"Sleepwear & Loungewear","categoryLevel3":"Lounge Pants","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088712/zammer_banners/level3/men_fashion_sleepwear_and_loungewear_lounge_pants.jpg","cloudinaryPublicId":"zammer_banners/level3/men_fashion_sleepwear_and_loungewear_lounge_pants"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Lehengas","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088713/zammer_banners/level3/women_fashion_ethnic_wear_lehengas.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_ethnic_wear_lehengas"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Kurtis, Sets & Fabrics","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088713/zammer_banners/level3/women_fashion_ethnic_wear_kurtis_sets_and_fabrics.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_ethnic_wear_kurtis_sets_and_fabrics"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Suits & Dress Material","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088713/zammer_banners/level3/women_fashion_ethnic_wear_suits_and_dress_material.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_ethnic_wear_suits_and_dress_material"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Ethnic Wear","categoryLevel3":"Dupattas & Stoles","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088713/zammer_banners/level3/women_fashion_ethnic_wear_dupattas_and_stoles.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_ethnic_wear_dupattas_and_stoles"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Dresses","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088713/zammer_banners/level3/women_fashion_western_wear_dresses.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_western_wear_dresses"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Skirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088714/zammer_banners/level3/women_fashion_western_wear_skirts.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_western_wear_skirts"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Jeans & Jeggings","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088715/zammer_banners/level3/women_fashion_western_wear_jeans_and_jeggings.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_western_wear_jeans_and_jeggings"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Winter Wear","categoryLevel3":"Sweaters & Cardigans","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088715/zammer_banners/level3/women_fashion_winter_wear_sweaters_and_cardigans.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_winter_wear_sweaters_and_cardigans"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Jumpsuits & Playsuits","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088716/zammer_banners/level3/women_fashion_western_wear_jumpsuits_and_playsuits.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_western_wear_jumpsuits_and_playsuits"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Winter Wear","categoryLevel3":"Jackets & Coats","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088716/zammer_banners/level3/women_fashion_winter_wear_jackets_and_coats.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_winter_wear_jackets_and_coats"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Pants & Palazzos","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088716/zammer_banners/level3/women_fashion_western_wear_pants_and_palazzos.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_western_wear_pants_and_palazzos"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Winter Wear","categoryLevel3":"Sweatshirts & Hoodies","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088717/zammer_banners/level3/women_fashion_winter_wear_sweatshirts_and_hoodies.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_winter_wear_sweatshirts_and_hoodies"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Sleepwear & Loungewear","categoryLevel3":"Nighties & Nightgowns","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088717/zammer_banners/level3/women_fashion_sleepwear_and_loungewear_nighties_and_nightgowns.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_sleepwear_and_loungewear_nighties_and_nightgowns"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Western Wear","categoryLevel3":"Tops & T-Shirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088716/zammer_banners/level3/women_fashion_western_wear_tops_and_t-shirts.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_western_wear_tops_and_t-shirts"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Sleepwear & Loungewear","categoryLevel3":"Loungewear Sets","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088717/zammer_banners/level3/women_fashion_sleepwear_and_loungewear_loungewear_sets.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_sleepwear_and_loungewear_loungewear_sets"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Bottom Wear","categoryLevel3":"Leggings","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088718/zammer_banners/level3/women_fashion_bottom_wear_leggings.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_bottom_wear_leggings"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Bottom Wear","categoryLevel3":"Palazzos","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088718/zammer_banners/level3/women_fashion_bottom_wear_palazzos.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_bottom_wear_palazzos"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Sleepwear & Loungewear","categoryLevel3":"Night Suits","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088718/zammer_banners/level3/women_fashion_sleepwear_and_loungewear_night_suits.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_sleepwear_and_loungewear_night_suits"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Bottom Wear","categoryLevel3":"Capris","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088718/zammer_banners/level3/women_fashion_bottom_wear_capris.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_bottom_wear_capris"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Lingerie & Innerwear","categoryLevel3":"Panties","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088718/zammer_banners/level3/women_fashion_lingerie_and_innerwear_panties.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_lingerie_and_innerwear_panties"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Lingerie & Innerwear","categoryLevel3":"Shapewear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088719/zammer_banners/level3/women_fashion_lingerie_and_innerwear_shapewear.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_lingerie_and_innerwear_shapewear"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Boys Wear","categoryLevel3":"T-Shirts & Polos","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088719/zammer_banners/level3/kids_fashion_boys_wear_t-shirts_and_polos.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_boys_wear_t-shirts_and_polos"},{"categoryLevel1":"Women Fashion","categoryLevel2":"Lingerie & Innerwear","categoryLevel3":"Bras","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088719/zammer_banners/level3/women_fashion_lingerie_and_innerwear_bras.jpg","cloudinaryPublicId":"zammer_banners/level3/women_fashion_lingerie_and_innerwear_bras"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Boys Wear","categoryLevel3":"Jeans & Pants","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088720/zammer_banners/level3/kids_fashion_boys_wear_jeans_and_pants.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_boys_wear_jeans_and_pants"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Boys Wear","categoryLevel3":"Ethnic Wear","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088720/zammer_banners/level3/kids_fashion_boys_wear_ethnic_wear.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_boys_wear_ethnic_wear"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Girls Wear","categoryLevel3":"Dresses & Frocks","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088720/zammer_banners/level3/kids_fashion_girls_wear_dresses_and_frocks.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_girls_wear_dresses_and_frocks"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Girls Wear","categoryLevel3":"Tops & T-Shirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088721/zammer_banners/level3/kids_fashion_girls_wear_tops_and_t-shirts.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_girls_wear_tops_and_t-shirts"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Boys Wear","categoryLevel3":"Shirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088721/zammer_banners/level3/kids_fashion_boys_wear_shirts.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_boys_wear_shirts"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Girls Wear","categoryLevel3":"Lehengas & Ethnic","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088721/zammer_banners/level3/kids_fashion_girls_wear_lehengas_and_ethnic.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_girls_wear_lehengas_and_ethnic"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Girls Wear","categoryLevel3":"Jeans & Pants","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088721/zammer_banners/level3/kids_fashion_girls_wear_jeans_and_pants.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_girls_wear_jeans_and_pants"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Girls Wear","categoryLevel3":"Skirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088722/zammer_banners/level3/kids_fashion_girls_wear_skirts.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_girls_wear_skirts"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Boys Wear","categoryLevel3":"Sets & Outfits","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088722/zammer_banners/level3/kids_fashion_boys_wear_sets_and_outfits.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_boys_wear_sets_and_outfits"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Infant Wear","categoryLevel3":"Sets","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088722/zammer_banners/level3/kids_fashion_infant_wear_sets.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_infant_wear_sets"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Infant Wear","categoryLevel3":"Rompers & Bodysuits","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088722/zammer_banners/level3/kids_fashion_infant_wear_rompers_and_bodysuits.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_infant_wear_rompers_and_bodysuits"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"Infant Wear","categoryLevel3":"Essentials","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088722/zammer_banners/level3/kids_fashion_infant_wear_essentials.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_infant_wear_essentials"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"School Uniforms","categoryLevel3":"Pants & Skirts","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088723/zammer_banners/level3/kids_fashion_school_uniforms_pants_and_skirts.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_school_uniforms_pants_and_skirts"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"School Uniforms","categoryLevel3":"Accessories","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088724/zammer_banners/level3/kids_fashion_school_uniforms_accessories.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_school_uniforms_accessories"},{"categoryLevel1":"Kids Fashion","categoryLevel2":"School Uniforms","categoryLevel3":"Shirts & Blouses","imageUrl":"https://res.cloudinary.com/dr17ap4sb/image/upload/v1770088725/zammer_banners/level3/kids_fashion_school_uniforms_shirts_and_blouses.jpg","cloudinaryPublicId":"zammer_banners/level3/kids_fashion_school_uniforms_shirts_and_blouses"}]};

// GET /api/banners - Public: fetch banners by level and category filters
const getBanners = async (req, res) => {
  try {
    const { level, categoryLevel1, categoryLevel2, categoryLevel3, categoryLevel4 } = req.query;
    const filter = { isActive: true };

    if (level) filter.level = parseInt(level);
    if (categoryLevel1) filter.categoryLevel1 = categoryLevel1;
    if (categoryLevel2) filter.categoryLevel2 = categoryLevel2;
    if (categoryLevel3) filter.categoryLevel3 = categoryLevel3;
    if (categoryLevel4) filter.categoryLevel4 = categoryLevel4;

    const banners = await Banner.find(filter).sort({ displayOrder: 1, createdAt: -1 });

    res.json({ success: true, data: banners });
  } catch (error) {
    console.error('[BannerController] getBanners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// GET /api/banners/admin/all - Admin: fetch all banners grouped by level
const getAllBannersAdmin = async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ level: 1, displayOrder: 1, createdAt: -1 });

    const grouped = {
      level1: banners.filter(b => b.level === 1),
      level2: banners.filter(b => b.level === 2),
      level3: banners.filter(b => b.level === 3),
      level4: banners.filter(b => b.level === 4),
    };

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('[BannerController] getAllBannersAdmin error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// POST /api/banners - Admin: create a new banner
const createBanner = async (req, res) => {
  try {
    const { level, categoryLevel1, categoryLevel2, categoryLevel3, categoryLevel4, title, subtitle, image, imageUrl, cloudinaryPublicId, displayOrder } = req.body;

    // Validate level-specific required fields
    if (!level || !categoryLevel1) {
      return res.status(400).json({ success: false, message: 'level and categoryLevel1 are required' });
    }
    if (level >= 2 && !categoryLevel2) {
      return res.status(400).json({ success: false, message: 'categoryLevel2 is required for level 2+ banners' });
    }
    if (level >= 3 && !categoryLevel3) {
      return res.status(400).json({ success: false, message: 'categoryLevel3 is required for level 3+ banners' });
    }
    if (level === 4 && !categoryLevel4) {
      return res.status(400).json({ success: false, message: 'categoryLevel4 is required for level 4 banners' });
    }

    let finalImageUrl = imageUrl;
    let finalPublicId = cloudinaryPublicId;

    // If base64 image provided, upload to Cloudinary
    if (image && !imageUrl) {
      const uploadResult = await uploadToCloudinary(image, 'zammer_banners');
      finalImageUrl = uploadResult.url;
      finalPublicId = uploadResult.public_id;
    }

    if (!finalImageUrl || !finalPublicId) {
      return res.status(400).json({ success: false, message: 'Image is required (provide image as base64 or imageUrl + cloudinaryPublicId)' });
    }

    const banner = await Banner.create({
      level: parseInt(level),
      categoryLevel1,
      categoryLevel2: categoryLevel2 || null,
      categoryLevel3: categoryLevel3 || null,
      categoryLevel4: categoryLevel4 || null,
      imageUrl: finalImageUrl,
      cloudinaryPublicId: finalPublicId,
      title: title || '',
      subtitle: subtitle || '',
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error('[BannerController] createBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
};

// PUT /api/banners/:id - Admin: update a banner
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const { title, subtitle, image, isActive, displayOrder } = req.body;

    // If new image provided, upload and delete old
    if (image) {
      const uploadResult = await uploadToCloudinary(image, 'zammer_banners');
      // Delete old image
      if (banner.cloudinaryPublicId) {
        await deleteFromCloudinary(banner.cloudinaryPublicId);
      }
      banner.imageUrl = uploadResult.url;
      banner.cloudinaryPublicId = uploadResult.public_id;
    }

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (isActive !== undefined) banner.isActive = isActive;
    if (displayOrder !== undefined) banner.displayOrder = displayOrder;

    await banner.save();

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error('[BannerController] updateBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
};

// DELETE /api/banners/:id - Admin: delete a banner
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Delete from Cloudinary
    if (banner.cloudinaryPublicId) {
      await deleteFromCloudinary(banner.cloudinaryPublicId);
    }

    await Banner.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('[BannerController] deleteBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
};

// POST /api/banners/seed - Admin: seed banners from embedded data
const seedBanners = async (req, res) => {
  try {
    // Use embedded banner data (no file system dependency)
    const bannerData = BANNER_DATA;

    // Clear existing banners (optional - controlled by query param)
    const clearExisting = req.query.clear === 'true';
    let deletedCount = 0;

    if (clearExisting) {
      const deleteResult = await Banner.deleteMany({});
      deletedCount = deleteResult.deletedCount;
    }

    // Prepare banner documents
    const bannerDocuments = [];

    // Level 1 banners
    (bannerData.level1 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 1,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: null,
        categoryLevel3: null,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel1,
        subtitle: banner.subtitle || `Explore ${banner.categoryLevel1} collection`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Level 2 banners
    (bannerData.level2 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 2,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: banner.categoryLevel2,
        categoryLevel3: null,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel2,
        subtitle: banner.subtitle || `Discover ${banner.categoryLevel2}`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Level 3 banners
    (bannerData.level3 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 3,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: banner.categoryLevel2,
        categoryLevel3: banner.categoryLevel3,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel3,
        subtitle: banner.subtitle || `Shop ${banner.categoryLevel3}`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Level 4 banners
    (bannerData.level4 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 4,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: banner.categoryLevel2,
        categoryLevel3: banner.categoryLevel3,
        categoryLevel4: banner.categoryLevel4,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel4,
        subtitle: banner.subtitle || `Browse ${banner.categoryLevel4}`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Insert all banners
    let insertedBanners = [];
    if (bannerDocuments.length > 0) {
      insertedBanners = await Banner.insertMany(bannerDocuments);
    }

    // Verify counts
    const counts = {
      level1: await Banner.countDocuments({ level: 1, isActive: true }),
      level2: await Banner.countDocuments({ level: 2, isActive: true }),
      level3: await Banner.countDocuments({ level: 3, isActive: true }),
      level4: await Banner.countDocuments({ level: 4, isActive: true }),
    };

    res.json({
      success: true,
      message: 'Banners seeded successfully',
      data: {
        deletedCount,
        insertedCount: insertedBanners.length,
        counts,
        source: {
          level1: (bannerData.level1 || []).length,
          level2: (bannerData.level2 || []).length,
          level3: (bannerData.level3 || []).length,
          level4: (bannerData.level4 || []).length,
        }
      }
    });
  } catch (error) {
    console.error('[BannerController] seedBanners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed banners',
      error: error.message
    });
  }
};

module.exports = {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  seedBanners,
};
