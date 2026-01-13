/**
 * CategorySelector Component
 * 4-Level cascading category selector for ZAMMER Marketplace
 * Inspired by Meesho Supplier Panel category selection UI
 */

import React from 'react';
import {
  getLevel1Options,
  getLevel2Options,
  getLevel3Options,
  getLevel4Options,
  getCategoryPath
} from '../../data/categoryHierarchy';

const CategorySelector = ({
  values,
  setFieldValue,
  showAllLevels = true,
  compact = false,
  errors = {}
}) => {
  const level1Options = getLevel1Options();
  const level2Options = values.categoryLevel1 ? getLevel2Options(values.categoryLevel1) : [];
  const level3Options = values.categoryLevel1 && values.categoryLevel2
    ? getLevel3Options(values.categoryLevel1, values.categoryLevel2)
    : [];
  const level4Options = values.categoryLevel1 && values.categoryLevel2 && values.categoryLevel3
    ? getLevel4Options(values.categoryLevel1, values.categoryLevel2, values.categoryLevel3)
    : [];

  const handleLevel1Change = (option) => {
    setFieldValue('categoryLevel1', option);
    setFieldValue('categoryLevel2', '');
    setFieldValue('categoryLevel3', '');
    setFieldValue('categoryLevel4', '');
    setFieldValue('categoryPath', option);
  };

  const handleLevel2Change = (option) => {
    setFieldValue('categoryLevel2', option);
    setFieldValue('categoryLevel3', '');
    setFieldValue('categoryLevel4', '');
    setFieldValue('categoryPath', getCategoryPath(values.categoryLevel1, option));
  };

  const handleLevel3Change = (option) => {
    setFieldValue('categoryLevel3', option);
    setFieldValue('categoryLevel4', '');
    setFieldValue('categoryPath', getCategoryPath(values.categoryLevel1, values.categoryLevel2, option));
  };

  const handleLevel4Change = (option) => {
    setFieldValue('categoryLevel4', option);
    setFieldValue('categoryPath', getCategoryPath(values.categoryLevel1, values.categoryLevel2, values.categoryLevel3, option));
  };

  const CategoryColumn = ({ title, options, selectedValue, onSelect, disabled = false }) => (
    <div className={`border rounded-lg ${disabled ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="px-3 py-2 border-b bg-gray-50">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
      </div>
      <div className={`max-h-64 overflow-y-auto ${disabled ? 'opacity-50' : ''}`}>
        {options.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            {disabled ? 'Select previous category' : 'No options available'}
          </div>
        ) : (
          options.map((option) => (
            <div
              key={option}
              onClick={() => !disabled && onSelect(option)}
              className={`px-3 py-2.5 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                selectedValue === option
                  ? 'bg-purple-600 text-white font-medium'
                  : disabled
                    ? 'cursor-not-allowed'
                    : 'hover:bg-purple-50 text-gray-700 hover:text-purple-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{option}</span>
                {selectedValue === option && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (compact) {
    // Compact dropdown version for smaller spaces
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Category*
            </label>
            <select
              value={values.categoryLevel1 || ''}
              onChange={(e) => handleLevel1Change(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            >
              <option value="">Select Category</option>
              {level1Options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.categoryLevel1 && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryLevel1}</p>
            )}
          </div>

          {/* Level 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Type*
            </label>
            <select
              value={values.categoryLevel2 || ''}
              onChange={(e) => handleLevel2Change(e.target.value)}
              disabled={!values.categoryLevel1}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Select Type</option>
              {level2Options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.categoryLevel2 && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryLevel2}</p>
            )}
          </div>

          {/* Level 3 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Group*
            </label>
            <select
              value={values.categoryLevel3 || ''}
              onChange={(e) => handleLevel3Change(e.target.value)}
              disabled={!values.categoryLevel2}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Select Group</option>
              {level3Options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.categoryLevel3 && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryLevel3}</p>
            )}
          </div>

          {/* Level 4 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Type
            </label>
            <select
              value={values.categoryLevel4 || ''}
              onChange={(e) => handleLevel4Change(e.target.value)}
              disabled={!values.categoryLevel3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Select Type (Optional)</option>
              {level4Options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Path Display */}
        {values.categoryPath && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-600 font-medium mb-1">Selected Category Path:</p>
            <p className="text-sm text-purple-800 font-semibold">{values.categoryPath}</p>
          </div>
        )}
      </div>
    );
  }

  // Full 4-column grid version (Meesho style)
  return (
    <div className="space-y-4">
      {/* Category Selection Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Select Category</h3>
          <p className="text-sm text-gray-500">Choose the appropriate category for your product</p>
        </div>
        {values.categoryPath && (
          <div className="text-right">
            <span className="text-xs text-gray-500">Selected:</span>
            <p className="text-sm font-medium text-purple-600">{values.categoryPath}</p>
          </div>
        )}
      </div>

      {/* 4-Column Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <CategoryColumn
          title="Main Category"
          options={level1Options}
          selectedValue={values.categoryLevel1}
          onSelect={handleLevel1Change}
        />
        <CategoryColumn
          title="Category Type"
          options={level2Options}
          selectedValue={values.categoryLevel2}
          onSelect={handleLevel2Change}
          disabled={!values.categoryLevel1}
        />
        <CategoryColumn
          title="Product Group"
          options={level3Options}
          selectedValue={values.categoryLevel3}
          onSelect={handleLevel3Change}
          disabled={!values.categoryLevel2}
        />
        <CategoryColumn
          title="Product Type"
          options={level4Options}
          selectedValue={values.categoryLevel4}
          onSelect={handleLevel4Change}
          disabled={!values.categoryLevel3}
        />
      </div>

      {/* Validation Errors */}
      {(errors.categoryLevel1 || errors.categoryLevel2 || errors.categoryLevel3) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {errors.categoryLevel1 || errors.categoryLevel2 || errors.categoryLevel3}
          </p>
        </div>
      )}

      {/* Selected Category Confirmation */}
      {values.categoryLevel3 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Category Selected</p>
              <p className="text-sm text-green-700 mt-1">{values.categoryPath}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
