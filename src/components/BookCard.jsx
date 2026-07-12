import React from 'react';
import { BookOpen, Star, Calendar, User } from 'lucide-react';

const BookCard = ({ book, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-primary-200 transform hover:-translate-y-2"
    >
      <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center relative overflow-hidden">
        {book.cover_image ? (
          <img 
            src={book.cover_image} 
            alt={book.title || 'Book cover'} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.querySelector('.fallback-icon').style.display = 'flex';
            }}
          />
        ) : null}
        <BookOpen className={`text-white opacity-80 fallback-icon ${book.cover_image ? 'hidden' : 'flex'}`} size={64} />
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {book.title || 'Untitled'}
        </h3>
        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <User size={16} />
          <span className="text-sm">{book.author || 'Unknown Author'}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 mb-3">
          <Calendar size={16} />
          <span className="text-sm">{book.published_year || 'N/A'}</span>
        </div>
        {book.rating && (
          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={16} fill="currentColor" />
            <span className="text-sm font-medium">{book.rating}</span>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
            {book.category || 'General'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
