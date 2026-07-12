import React from 'react';
import { Filter } from 'lucide-react';

const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Filter className="text-primary-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-800">Filter by Category</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
            selectedCategory === 'all'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50'
          }`}
        >
          All Books
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
              selectedCategory === category
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
