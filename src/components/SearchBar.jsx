import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search books by title, author, or ISBN..."
          className="w-full px-5 py-4 pl-14 text-gray-700 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all duration-300 shadow-lg hover:shadow-xl"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search size={24} />
        </div>
        <button
          type="submit"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors duration-300 font-medium"
        >
          Search
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
