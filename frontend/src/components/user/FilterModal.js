import React, { useState, useEffect } from 'react';

const FilterModal = ({ isOpen, onClose, filters, initialFilters = {}, onApplyFilters }) => {
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState(filters[0]?.key || '');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleSelect = (key, value) => {
    setActiveFilters({
      ...activeFilters,
      [key]: value
    });
  };

  const handleApply = () => {
    onApplyFilters(activeFilters);
    onClose();
  };

  if (!isOpen) return null;

  // Find the active filter group
  const activeFilterGroup = filters.find(filter => filter.key === activeTab) || {};

  return (
    <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex justify-center items-center">
      <div className="bg-white w-full max-w-md mx-auto rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-medium">Filter</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex h-96">
          {/* Left sidebar - filter categories */}
          <div className="w-1/3 bg-gray-50 overflow-y-auto p-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveTab(filter.key)}
                className={`block w-full text-left py-3 px-2 text-sm rounded-md ${
                  activeTab === filter.key
                    ? 'bg-orange-50 text-orange-500 border-l-4 border-orange-500'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter.label}
                {activeFilters[filter.key] && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                    {activeFilters[filter.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Right side - filter options */}
          <div className="w-2/3 p-4 overflow-y-auto">
            <div className="space-y-6">
              {activeFilterGroup.options && (
                <div>
                  {activeFilterGroup.options.map((option) => (
                    <div key={option.value} className="py-2">
                      <button
                        onClick={() => handleSelect(activeFilterGroup.key, option.value)}
                        className={`flex items-center w-full text-left py-2 px-3 rounded-md ${
                          activeFilters[activeFilterGroup.key] === option.value
                            ? 'bg-orange-50 text-orange-500'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex-grow">{option.label}</span>
                        {activeFilters[activeFilterGroup.key] === option.value && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer with apply button */}
        <div className="p-4 border-t">
          <button
            onClick={handleApply}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-md text-sm font-medium hover:bg-orange-600"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal; 