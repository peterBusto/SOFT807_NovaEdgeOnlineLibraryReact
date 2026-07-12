import React from 'react';
import BookCard from './BookCard';
import { Loader2 } from 'lucide-react';

const BookList = ({ books, loading, onBookClick }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary-600" size={48} />
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 text-lg">No books found</div>
        <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onClick={() => onBookClick(book)} />
      ))}
    </div>
  );
};

export default BookList;
