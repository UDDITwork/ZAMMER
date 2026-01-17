// frontend/src/services/categoryService.js - Dynamic Category Management with 4-Level Hierarchy Support

import api from './api';
import {
  CATEGORY_HIERARCHY,
  getLevel1Options,
  getLevel2Options,
  getLevel3Options,
  getLevel4Options,
  getCategoryPath,
  isValidCategoryCombination
} from '../data/categoryHierarchy';

// 🎯 ENHANCED: Gender-appropriate category definitions (legacy support)
const GENDER_SPECIFIC_CATEGORIES = {
  Men: {
    title: 'Men',
    description: 'Find trendy, comfortable men fashion...',
    subCategories: [
      { id: 'T-shirts', name: 'T-shirts', image: '/placeholders/men-tshirts.jpg' },
      { id: 'Shirts', name: 'Shirts', image: '/placeholders/men-shirts.jpg' },
      { id: 'Jeans', name: 'Jeans', image: '/placeholders/men-jeans.jpg' },
      { id: 'Ethnic Wear', name: 'Ethnic Wear', image: '/placeholders/men-ethnic.jpg' },
      { id: 'Jackets', name: 'Jackets', image: '/placeholders/men-jackets.jpg' },
      { id: 'Tops', name: 'Tops', image: '/placeholders/men-tops.jpg' },
      { id: 'Tees', name: 'Tees', image: '/placeholders/men-tees.jpg' },
      { id: 'Sleepwear', name: 'Sleepwear', image: '/placeholders/men-sleepwear.jpg' },
      { id: 'Top Wear', name: 'Top Wear', image: '/placeholders/men-topwear.jpg' }
    ]
  },
  Women: {
    title: 'Women',
    description: 'Find stylish, trendy women fashion...',
    subCategories: [
      { id: 'Kurtis', name: 'Kurtis', image: '/placeholders/women-kurtis.jpg' },
      { id: 'Tops', name: 'Tops', image: '/placeholders/women-tops.jpg' },
      { id: 'T-shirts', name: 'T-shirts', image: '/placeholders/women-tshirts.jpg' },
      { id: 'Dresses', name: 'Dresses', image: '/placeholders/women-dresses.jpg' },
      { id: 'Jeans', name: 'Jeans', image: '/placeholders/women-jeans.jpg' },
      { id: 'Sarees', name: 'Sarees', image: '/placeholders/women-sarees.jpg' },
      { id: 'Blouses', name: 'Blouses', image: '/placeholders/women-blouses.jpg' },
      { id: 'Petticoats', name: 'Petticoats', image: '/placeholders/women-petticoats.jpg' },
      { id: 'Leggings', name: 'Leggings', image: '/placeholders/women-leggings.jpg' },
      { id: 'Palazzos', name: 'Palazzos', image: '/placeholders/women-palazzos.jpg' },
      { id: 'Nightwear', name: 'Nightwear', image: '/placeholders/women-nightwear.jpg' },
      { id: 'Sleepwear', name: 'Sleepwear', image: '/placeholders/women-sleepwear.jpg' },
      { id: 'Lehengas', name: 'Lehengas', image: '/placeholders/women-lehengas.jpg' },
      { id: 'Ethnic Sets', name: 'Ethnic Sets', image: '/placeholders/women-ethnicsets.jpg' },
      { id: 'Co-ord Sets', name: 'Co-ord Sets', image: '/placeholders/women-coordsets.jpg' },
      { id: 'Gowns', name: 'Gowns', image: '/placeholders/women-gowns.jpg' },
      { id: 'Shrugs', name: 'Shrugs', image: '/placeholders/women-shrugs.jpg' },
      { id: 'Tunics', name: 'Tunics', image: '/placeholders/women-tunics.jpg' },
      { id: 'Skirts', name: 'Skirts', image: '/placeholders/women-skirts.jpg' },
      { id: 'Jumpsuits', name: 'Jumpsuits', image: '/placeholders/women-jumpsuits.jpg' },
      { id: 'Sharara', name: 'Sharara', image: '/placeholders/women-sharara.jpg' },
      { id: 'Dupatta', name: 'Dupatta', image: '/placeholders/women-dupatta.jpg' }
    ]
  },
  Kids: {
    title: 'Kids',
    description: 'Find cute, comfortable kids styles...',
    subCategories: [
      { id: 'T-shirts', name: 'T-shirts', image: '/placeholders/kids-tshirts.jpg' },
      { id: 'Shirts', name: 'Shirts', image: '/placeholders/kids-shirts.jpg' },
      { id: 'Boys Sets', name: 'Boys Sets', image: '/placeholders/kids-boys.jpg' },
      { id: 'Top Wear', name: 'Top Wear', image: '/placeholders/kids-topwear.jpg' },
      { id: 'Nightwear', name: 'Nightwear', image: '/placeholders/kids-nightwear.jpg' },
      { id: 'Sleepwear', name: 'Sleepwear', image: '/placeholders/kids-sleepwear.jpg' }
    ]
  }
};

// Map Level 1 to legacy category names
const LEVEL1_TO_LEGACY = {
  'Men Fashion': 'Men',
  'Women Fashion': 'Women',
  'Kids Fashion': 'Kids'
};

const LEGACY_TO_LEVEL1 = {
  'Men': 'Men Fashion',
  'Women': 'Women Fashion',
  'Kids': 'Kids Fashion'
};

class CategoryService {
  // Get category information by gender
  getCategoryInfo(gender) {
    const normalizedGender = this.normalizeGender(gender);
    return GENDER_SPECIFIC_CATEGORIES[normalizedGender] || GENDER_SPECIFIC_CATEGORIES['Men'];
  }

  // Get all available categories
  getAllCategories() {
    return GENDER_SPECIFIC_CATEGORIES;
  }

  // Get subcategories for a specific gender
  getSubCategories(gender) {
    const categoryInfo = this.getCategoryInfo(gender);
    return categoryInfo.subCategories || [];
  }

  // Normalize gender input (handle case variations)
  normalizeGender(gender) {
    if (!gender) return 'Men';
    
    const normalized = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
    return ['Men', 'Women', 'Kids'].includes(normalized) ? normalized : 'Men';
  }

  // Check if a subcategory is appropriate for a gender
  isSubCategoryAppropriateForGender(subCategory, gender) {
    const subCategories = this.getSubCategories(gender);
    return subCategories.some(sub => sub.id === subCategory);
  }

  // Get product count for a specific category and subcategory (future enhancement)
  async getProductCount(category, subCategory) {
    try {
      const response = await api.get(`/api/products/count`, {
        params: { category, subCategory }
      });
      return response.data.count || 0;
    } catch (error) {
      console.error('Error fetching product count:', error);
      return 0;
    }
  }

  // Get available subcategories from backend (future enhancement)
  async getSubCategoriesFromBackend(category) {
    try {
      const response = await api.get(`/api/categories/${category}/subcategories`);
      return response.data.subCategories || [];
    } catch (error) {
      console.error('Error fetching subcategories from backend:', error);
      // Fallback to static data
      return this.getSubCategories(category);
    }
  }

  // Validate category and subcategory combination
  validateCategorySubCategory(category, subCategory) {
    const normalizedCategory = this.normalizeGender(category);
    return this.isSubCategoryAppropriateForGender(subCategory, normalizedCategory);
  }

  // Get category display name
  getCategoryDisplayName(gender) {
    const categoryInfo = this.getCategoryInfo(gender);
    return categoryInfo.title;
  }

  // Get category description
  getCategoryDescription(gender) {
    const categoryInfo = this.getCategoryInfo(gender);
    return categoryInfo.description;
  }

  // ==========================================
  // 🎯 NEW: 4-Level Hierarchy Methods
  // ==========================================

  // Get all Level 1 categories (Men Fashion, Women Fashion, Kids Fashion)
  getLevel1Categories() {
    return getLevel1Options().map(level1 => ({
      id: level1,
      name: level1,
      legacyName: LEVEL1_TO_LEGACY[level1] || level1,
      image: `/placeholders/${LEVEL1_TO_LEGACY[level1]?.toLowerCase() || 'default'}-category.jpg`
    }));
  }

  // Get Level 2 categories for a given Level 1 (e.g., Ethnic Wear, Western Wear for Men Fashion)
  getLevel2Categories(level1) {
    const level2Options = getLevel2Options(level1);
    return level2Options.map(level2 => ({
      id: level2,
      name: level2,
      parentLevel1: level1,
      image: `/placeholders/${level2.toLowerCase().replace(/\s+/g, '-')}.jpg`
    }));
  }

  // Get Level 3 categories for given Level 1 and Level 2 (e.g., T-Shirts, Shirts for Western Wear)
  getLevel3Categories(level1, level2) {
    const level3Options = getLevel3Options(level1, level2);
    return level3Options.map(level3 => ({
      id: level3,
      name: level3,
      parentLevel1: level1,
      parentLevel2: level2,
      image: `/placeholders/${level3.toLowerCase().replace(/\s+/g, '-')}.jpg`
    }));
  }

  // Get Level 4 categories for given Level 1, Level 2, and Level 3
  getLevel4Categories(level1, level2, level3) {
    const level4Options = getLevel4Options(level1, level2, level3);
    return level4Options.map(level4 => ({
      id: level4,
      name: level4,
      parentLevel1: level1,
      parentLevel2: level2,
      parentLevel3: level3
    }));
  }

  // Get the full hierarchy path as a string
  getHierarchyPath(level1, level2, level3, level4) {
    return getCategoryPath(level1, level2, level3, level4);
  }

  // Validate if a category combination is valid
  validateHierarchy(level1, level2, level3, level4) {
    return isValidCategoryCombination(level1, level2, level3, level4);
  }

  // Convert legacy category (Men/Women/Kids) to Level 1
  legacyToLevel1(legacyCategory) {
    return LEGACY_TO_LEVEL1[legacyCategory] || legacyCategory;
  }

  // Convert Level 1 to legacy category
  level1ToLegacy(level1) {
    return LEVEL1_TO_LEGACY[level1] || level1;
  }

  // Get complete hierarchy structure for a Level 1 category
  getFullHierarchyForLevel1(level1) {
    const hierarchy = {};
    const level2Options = getLevel2Options(level1);

    level2Options.forEach(level2 => {
      hierarchy[level2] = {};
      const level3Options = getLevel3Options(level1, level2);

      level3Options.forEach(level3 => {
        hierarchy[level2][level3] = getLevel4Options(level1, level2, level3);
      });
    });

    return hierarchy;
  }

  // Get breadcrumb data for navigation
  getBreadcrumbs(level1, level2, level3, level4) {
    const breadcrumbs = [];

    if (level1) {
      breadcrumbs.push({
        level: 1,
        name: level1,
        legacyName: LEVEL1_TO_LEGACY[level1],
        path: `/user/categories/${encodeURIComponent(level1)}`
      });
    }

    if (level2) {
      breadcrumbs.push({
        level: 2,
        name: level2,
        path: `/user/categories/${encodeURIComponent(level1)}/${encodeURIComponent(level2)}`
      });
    }

    if (level3) {
      breadcrumbs.push({
        level: 3,
        name: level3,
        path: `/user/categories/${encodeURIComponent(level1)}/${encodeURIComponent(level2)}/${encodeURIComponent(level3)}`
      });
    }

    if (level4) {
      breadcrumbs.push({
        level: 4,
        name: level4,
        path: `/user/products?level1=${encodeURIComponent(level1)}&level2=${encodeURIComponent(level2)}&level3=${encodeURIComponent(level3)}&level4=${encodeURIComponent(level4)}`
      });
    }

    return breadcrumbs;
  }

  // Build filter params for API from hierarchy levels
  buildFilterParams(level1, level2, level3, level4) {
    const params = {};

    if (level1) {
      // Use legacy category for backward compatibility
      params.category = LEVEL1_TO_LEGACY[level1] || level1;
      params.categoryLevel1 = level1;
    }

    if (level2) {
      params.categoryLevel2 = level2;
    }

    if (level3) {
      params.categoryLevel3 = level3;
      // Also set subCategory for backward compatibility
      params.subCategory = level3;
    }

    if (level4) {
      params.categoryLevel4 = level4;
    }

    return params;
  }

  // Search within hierarchy
  searchCategories(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];

    const results = [];
    const term = searchTerm.toLowerCase();

    Object.entries(CATEGORY_HIERARCHY).forEach(([level1, level2Data]) => {
      // Search in Level 1
      if (level1.toLowerCase().includes(term)) {
        results.push({
          type: 'level1',
          level1,
          displayName: level1,
          path: this.getHierarchyPath(level1)
        });
      }

      Object.entries(level2Data).forEach(([level2, level3Data]) => {
        // Search in Level 2
        if (level2.toLowerCase().includes(term)) {
          results.push({
            type: 'level2',
            level1,
            level2,
            displayName: `${level2} (${level1})`,
            path: this.getHierarchyPath(level1, level2)
          });
        }

        Object.entries(level3Data).forEach(([level3, level4Array]) => {
          // Search in Level 3
          if (level3.toLowerCase().includes(term)) {
            results.push({
              type: 'level3',
              level1,
              level2,
              level3,
              displayName: `${level3} in ${level2}`,
              path: this.getHierarchyPath(level1, level2, level3)
            });
          }

          // Search in Level 4
          level4Array.forEach(level4 => {
            if (level4.toLowerCase().includes(term)) {
              results.push({
                type: 'level4',
                level1,
                level2,
                level3,
                level4,
                displayName: `${level4} (${level3})`,
                path: this.getHierarchyPath(level1, level2, level3, level4)
              });
            }
          });
        });
      });
    });

    return results.slice(0, 15); // Return top 15 results
  }

  // Get the complete hierarchy data
  getCompleteHierarchy() {
    return CATEGORY_HIERARCHY;
  }
}

// Create and export singleton instance
const categoryService = new CategoryService();

export default categoryService;
