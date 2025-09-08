// frontend/src/services/categoryService.js - Dynamic Category Management

import api from './api';

// 🎯 ENHANCED: Gender-appropriate category definitions
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
      { id: 'Kurties', name: 'Kurties', image: '/placeholders/women-kurties.jpg' },
      { id: 'Dresses', name: 'Dresses', image: '/placeholders/women-dresses.jpg' },
      { id: 'Lehengass', name: 'Lehenga', image: '/placeholders/women-lehenga.jpg' },
      { id: 'Tops', name: 'Tops', image: '/placeholders/women-tops.jpg' },
      { id: 'Tees', name: 'Tees', image: '/placeholders/women-tees.jpg' },
      { id: 'Jeans', name: 'Jeans', image: '/placeholders/women-jeans.jpg' },
      { id: 'Nightwear', name: 'Nightwear', image: '/placeholders/women-nightwear.jpg' },
      { id: 'Sleepwear', name: 'Sleepwear', image: '/placeholders/women-sleepwear.jpg' },
      { id: 'Rayon', name: 'Rayon', image: '/placeholders/women-rayon.jpg' },
      { id: 'Shrugs', name: 'Shrugs', image: '/placeholders/women-shrugs.jpg' }
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
}

// Create and export singleton instance
const categoryService = new CategoryService();

export default categoryService;
