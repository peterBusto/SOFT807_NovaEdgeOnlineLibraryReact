import React, { useState, useEffect } from 'react';
import { BookOpen, Star, Calendar, User } from 'lucide-react';

const BookCard = ({ book, onClick, categories }) => {
  const [coverUrl, setCoverUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryName = () => {
    if (!book.category) return '-';
    if (typeof book.category === 'object') return book.category.name || '-';
    if (categories && categories.length > 0) {
      const categoryObj = categories.find(cat => {
        const catId = typeof cat === 'object' ? cat.id : cat;
        return catId === book.category;
      });
      if (categoryObj) {
        return typeof categoryObj === 'object' ? categoryObj.name : categoryObj;
      }
    }
    return '-';
  };

  useEffect(() => {
    const fetchCoverImage = () => {
      setIsLoading(true);
      setImageError(false);
      
      // First, try to use the cover_image from the API response
      if (book.cover_image || book.cover_image_url) {
        setCoverUrl(book.cover_image || book.cover_image_url);
        setIsLoading(false);
        return;
      }

      // Check cache for previously successful cover URLs
      const cacheKey = `book_cover_${book.id}_${book.isbn}_${book.title}`;
      const cachedUrl = localStorage.getItem(cacheKey);
      if (cachedUrl) {
        setCoverUrl(cachedUrl);
        setIsLoading(false);
        return;
      }

      // If no cover from API, try Open Library API using ISBN
      if (book.isbn) {
        const isbn = book.isbn.replace(/[^0-9X]/g, ''); // Clean ISBN
        const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-S.jpg`; // Use small size
        setCoverUrl(openLibraryUrl);
        localStorage.setItem(cacheKey, openLibraryUrl);
        setIsLoading(false);
        return;
      }

      // No ISBN, try title/author search
      if (book.title && book.author) {
        const titleEncoded = encodeURIComponent(book.title);
        const openLibraryTitleUrl = `https://covers.openlibrary.org/b/title/${titleEncoded}-S.jpg`; // Use small size
        setCoverUrl(openLibraryTitleUrl);
        localStorage.setItem(cacheKey, openLibraryTitleUrl);
        setIsLoading(false);
        return;
      }

      // No cover available
      setCoverUrl(null);
      setIsLoading(false);
    };

    fetchCoverImage();
  }, [book.id, book.isbn, book.title, book.author, book.cover_image, book.cover_image_url]);

  const handleImageError = () => {
    setImageError(true);
    setCoverUrl(null);
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-primary-200 transform hover:-translate-y-2"
    >
      <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center relative overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse bg-white/20 w-full h-full" />
        ) : coverUrl && !imageError ? (
          <img 
            src={coverUrl} 
            alt={book.title || 'Book cover'} 
            className="w-full h-full object-cover"
            onError={handleImageError}
            onLoad={() => setIsLoading(false)}
            loading="lazy"
            fetchPriority="low"
          />
        ) : null}
        <BookOpen className={`text-white opacity-80 fallback-icon ${coverUrl && !imageError ? 'hidden' : 'flex'}`} size={64} />
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
          <span className="text-sm">
            {book.publication_date 
              ? new Date(book.publication_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : 'N/A'}
          </span>
        </div>
        {book.rating && (
          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={16} fill="currentColor" />
            <span className="text-sm font-medium">{book.rating}</span>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
            {getCategoryName()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
