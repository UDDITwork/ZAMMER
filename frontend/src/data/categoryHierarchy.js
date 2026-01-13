/**
 * 4-Level Category Hierarchy for ZAMMER Marketplace
 * Structure: Level 1 (Main) > Level 2 (Category Type) > Level 3 (Product Group) > Level 4 (Specific Product)
 * Inspired by Meesho Supplier Panel category structure
 */

export const CATEGORY_HIERARCHY = {
  'Men Fashion': {
    'Ethnic Wear': {
      'Kurtas & Kurta Sets': ['Cotton Kurta', 'Silk Kurta', 'Printed Kurta', 'Plain Kurta', 'Designer Kurta', 'Festive Kurta'],
      'Sherwanis': ['Wedding Sherwani', 'Reception Sherwani', 'Party Sherwani', 'Indo-Western Sherwani'],
      'Nehru Jackets': ['Silk Nehru Jacket', 'Cotton Nehru Jacket', 'Brocade Nehru Jacket', 'Printed Nehru Jacket'],
      'Ethnic Sets': ['Kurta Pajama Set', 'Pathani Suit', 'Dhoti Kurta Set'],
      'Dhotis & Mundus': ['Cotton Dhoti', 'Silk Dhoti', 'Mundu', 'Angavastram']
    },
    'Western Wear': {
      'T-Shirts': ['Round Neck', 'V-Neck', 'Polo', 'Printed T-Shirt', 'Plain T-Shirt', 'Graphic T-Shirt', 'Oversized T-Shirt'],
      'Shirts': ['Casual Shirts', 'Formal Shirts', 'Denim Shirts', 'Printed Shirts', 'Plain Shirts', 'Linen Shirts'],
      'Jeans': ['Slim Fit', 'Regular Fit', 'Skinny', 'Straight Fit', 'Bootcut', 'Ripped Jeans'],
      'Trousers': ['Formal Trousers', 'Casual Trousers', 'Chinos', 'Cargo Pants'],
      'Shorts': ['Casual Shorts', 'Sports Shorts', 'Denim Shorts', 'Bermuda Shorts']
    },
    'Winter Wear': {
      'Jackets': ['Bomber Jacket', 'Denim Jacket', 'Leather Jacket', 'Puffer Jacket', 'Windcheater'],
      'Sweaters & Sweatshirts': ['Pullover Sweater', 'Cardigan', 'Hoodie', 'Sweatshirt', 'Fleece Jacket'],
      'Thermals': ['Thermal Top', 'Thermal Bottom', 'Thermal Set']
    },
    'Sportswear': {
      'Track Pants': ['Joggers', 'Track Pants', 'Sports Pants'],
      'Sports T-Shirts': ['Gym T-Shirt', 'Running T-Shirt', 'Training T-Shirt'],
      'Sports Shorts': ['Gym Shorts', 'Running Shorts', 'Training Shorts']
    },
    'Sleepwear & Loungewear': {
      'Night Suits': ['Cotton Night Suit', 'Printed Night Suit', 'Plain Night Suit'],
      'Pyjamas': ['Cotton Pyjama', 'Checked Pyjama', 'Printed Pyjama'],
      'Lounge Pants': ['Track Pants', 'Lounge Pants', 'Joggers']
    }
  },

  'Women Fashion': {
    'Ethnic Wear': {
      'Sarees, Blouses & Petticoats': ['Sarees', 'Blouses', 'Petticoats', 'Ready To Wear Sarees', 'Silk Sarees', 'Cotton Sarees', 'Georgette Sarees', 'Printed Sarees'],
      'Kurtis, Sets & Fabrics': ['Anarkali Kurtis', 'Straight Kurtis', 'A-Line Kurtis', 'Kurta Sets', 'Palazzo Sets', 'Sharara Sets', 'Unstitched Fabric'],
      'Suits & Dress Material': ['Salwar Suits', 'Unstitched Suits', 'Dress Material', 'Churidar Suits', 'Patiala Suits'],
      'Lehengas': ['Bridal Lehengas', 'Party Lehengas', 'Semi-Stitched Lehenga', 'Ready-to-Wear Lehenga', 'Designer Lehenga'],
      'Dupattas & Stoles': ['Cotton Dupatta', 'Silk Dupatta', 'Chiffon Dupatta', 'Printed Dupatta', 'Embroidered Dupatta']
    },
    'Western Wear': {
      'Tops & T-Shirts': ['Crop Tops', 'Tank Tops', 'Blouses', 'T-Shirts', 'Tunics', 'Shirts', 'Peplum Tops'],
      'Dresses': ['Maxi Dress', 'Mini Dress', 'Bodycon Dress', 'A-Line Dress', 'Shift Dress', 'Wrap Dress', 'Party Dress'],
      'Jeans & Jeggings': ['Skinny Jeans', 'Straight Jeans', 'Boyfriend Jeans', 'High Rise Jeans', 'Jeggings'],
      'Pants & Palazzos': ['Palazzo Pants', 'Culottes', 'Cigarette Pants', 'Formal Trousers', 'Wide Leg Pants'],
      'Skirts': ['A-Line Skirt', 'Pencil Skirt', 'Pleated Skirt', 'Maxi Skirt', 'Mini Skirt'],
      'Jumpsuits & Playsuits': ['Jumpsuits', 'Playsuits', 'Dungarees', 'Co-ord Sets']
    },
    'Winter Wear': {
      'Sweaters & Cardigans': ['Pullover', 'Cardigan', 'Poncho', 'Shrug', 'Cape'],
      'Jackets & Coats': ['Denim Jacket', 'Bomber Jacket', 'Puffer Jacket', 'Long Coat', 'Blazer'],
      'Sweatshirts & Hoodies': ['Sweatshirt', 'Hoodie', 'Fleece Top']
    },
    'Sleepwear & Loungewear': {
      'Night Suits': ['Cotton Night Suit', 'Satin Night Suit', 'Printed Night Suit'],
      'Nighties & Nightgowns': ['Cotton Nighty', 'Satin Nighty', 'Kaftan', 'Maxi Gown'],
      'Loungewear Sets': ['Lounge Set', 'Kaftan Set', 'Co-ord Set']
    },
    'Bottom Wear': {
      'Leggings': ['Cotton Leggings', 'Printed Leggings', 'Ankle Leggings', 'Churidar Leggings'],
      'Palazzos': ['Printed Palazzo', 'Plain Palazzo', 'Wide Leg Palazzo'],
      'Capris': ['Cotton Capri', 'Denim Capri', 'Printed Capri']
    },
    'Lingerie & Innerwear': {
      'Bras': ['T-Shirt Bra', 'Sports Bra', 'Padded Bra', 'Non-Padded Bra'],
      'Panties': ['Bikini', 'Hipster', 'Brief', 'Thong'],
      'Shapewear': ['Body Shaper', 'Tummy Tucker', 'Waist Cincher']
    }
  },

  'Kids Fashion': {
    'Boys Wear': {
      'T-Shirts & Polos': ['Printed T-Shirt', 'Plain T-Shirt', 'Character T-Shirt', 'Polo T-Shirt', 'Sports T-Shirt'],
      'Shirts': ['Casual Shirt', 'Party Shirt', 'School Shirt', 'Denim Shirt'],
      'Jeans & Pants': ['Denim Jeans', 'Cargo Pants', 'Joggers', 'Shorts', 'Track Pants'],
      'Ethnic Wear': ['Kurta Set', 'Dhoti Kurta', 'Sherwani', 'Nehru Jacket Set'],
      'Sets & Outfits': ['T-Shirt & Shorts Set', 'Shirt & Pants Set', 'Party Outfit', 'Casual Set']
    },
    'Girls Wear': {
      'Dresses & Frocks': ['Party Dress', 'Casual Dress', 'Ethnic Dress', 'Gown', 'Maxi Dress'],
      'Tops & T-Shirts': ['Printed Top', 'Embroidered Top', 'Character T-Shirt', 'Casual T-Shirt'],
      'Lehengas & Ethnic': ['Lehenga Choli', 'Salwar Suit', 'Anarkali', 'Sharara Set', 'Ghagra'],
      'Jeans & Pants': ['Denim Jeans', 'Jeggings', 'Leggings', 'Palazzo'],
      'Skirts': ['A-Line Skirt', 'Pleated Skirt', 'Denim Skirt', 'Tutu Skirt']
    },
    'Infant Wear': {
      'Rompers & Bodysuits': ['Cotton Romper', 'Printed Bodysuit', 'Sleepsuit', 'Onesie'],
      'Sets': ['Jhabla Set', 'Top & Bottom Set', 'Night Suit Set'],
      'Essentials': ['Bibs', 'Mittens', 'Caps', 'Booties']
    },
    'School Uniforms': {
      'Shirts & Blouses': ['White Shirt', 'School Blouse', 'Checked Shirt'],
      'Pants & Skirts': ['School Pants', 'School Skirt', 'Pinafore'],
      'Accessories': ['School Ties', 'Belts', 'Socks']
    }
  }
};

// Helper function to get Level 1 (Main Categories)
export const getLevel1Options = () => Object.keys(CATEGORY_HIERARCHY);

// Helper function to get Level 2 options based on Level 1 selection
export const getLevel2Options = (level1) => {
  if (!level1 || !CATEGORY_HIERARCHY[level1]) return [];
  return Object.keys(CATEGORY_HIERARCHY[level1]);
};

// Helper function to get Level 3 options based on Level 1 and Level 2 selections
export const getLevel3Options = (level1, level2) => {
  if (!level1 || !level2 || !CATEGORY_HIERARCHY[level1] || !CATEGORY_HIERARCHY[level1][level2]) return [];
  return Object.keys(CATEGORY_HIERARCHY[level1][level2]);
};

// Helper function to get Level 4 options based on Level 1, Level 2, and Level 3 selections
export const getLevel4Options = (level1, level2, level3) => {
  if (!level1 || !level2 || !level3 ||
      !CATEGORY_HIERARCHY[level1] ||
      !CATEGORY_HIERARCHY[level1][level2] ||
      !CATEGORY_HIERARCHY[level1][level2][level3]) return [];
  return CATEGORY_HIERARCHY[level1][level2][level3];
};

// Helper function to get full category path as a string
export const getCategoryPath = (level1, level2, level3, level4) => {
  const parts = [level1, level2, level3, level4].filter(Boolean);
  return parts.join(' > ');
};

// Helper function to validate if a category combination is valid
export const isValidCategoryCombination = (level1, level2, level3, level4) => {
  if (!level1) return false;
  if (!CATEGORY_HIERARCHY[level1]) return false;

  if (level2 && !CATEGORY_HIERARCHY[level1][level2]) return false;

  if (level3 && (!level2 || !CATEGORY_HIERARCHY[level1][level2][level3])) return false;

  if (level4) {
    if (!level3 || !CATEGORY_HIERARCHY[level1][level2][level3]) return false;
    return CATEGORY_HIERARCHY[level1][level2][level3].includes(level4);
  }

  return true;
};

// Helper function to get category suggestions based on partial input
export const getCategorySuggestions = (searchTerm) => {
  const suggestions = [];
  const term = searchTerm.toLowerCase();

  Object.entries(CATEGORY_HIERARCHY).forEach(([level1, level2Data]) => {
    if (level1.toLowerCase().includes(term)) {
      suggestions.push({ level1, type: 'level1' });
    }

    Object.entries(level2Data).forEach(([level2, level3Data]) => {
      if (level2.toLowerCase().includes(term)) {
        suggestions.push({ level1, level2, type: 'level2' });
      }

      Object.entries(level3Data).forEach(([level3, level4Array]) => {
        if (level3.toLowerCase().includes(term)) {
          suggestions.push({ level1, level2, level3, type: 'level3' });
        }

        level4Array.forEach(level4 => {
          if (level4.toLowerCase().includes(term)) {
            suggestions.push({ level1, level2, level3, level4, type: 'level4' });
          }
        });
      });
    });
  });

  return suggestions.slice(0, 10); // Return top 10 suggestions
};

export default CATEGORY_HIERARCHY;
