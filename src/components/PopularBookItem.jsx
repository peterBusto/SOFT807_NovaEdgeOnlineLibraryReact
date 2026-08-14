import React from 'react';
import BookCover from './BookCover';

const PopularBookItem = ({ book }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <BookCover 
          book={book} 
          size="small" 
          className="h-12 w-12 rounded object-cover mr-4 flex-shrink-0"
        />
        <div>
          <p className="font-medium text-gray-900">{book.title}</p>
          <p className="text-sm text-gray-500">{book.author}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">Borrowed</p>
        <p className="font-semibold text-gray-800">{book.count} times</p>
      </div>
    </div>
  );
};

export default PopularBookItem;
