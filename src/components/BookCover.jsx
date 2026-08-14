import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

const BookCover = ({ book, size = 'medium', className = '' }) => {
  const [coverUrl, setCoverUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    small: 'h-12 w-12',
    medium: 'h-48 w-full',
    large: 'h-64 w-full'
  };

  useEffect(() => {
    const fetchCoverImage = async () => {
      setIsLoading(true);
      setImageError(false);
      
      // First, try to use the cover_image from the API response
      if (book.cover_image || book.cover_image_url) {
        setCoverUrl(book.cover_image || book.cover_image_url);
        setIsLoading(false);
        return;
      }

      // If no cover from API, try Open Library API using ISBN
      if (book.isbn) {
        const isbn = book.isbn.replace(/[^0-9X]/g, ''); // Clean ISBN
        const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        
        try {
          const img = new Image();
          img.onload = () => {
            setCoverUrl(openLibraryUrl);
            setIsLoading(false);
          };
          img.onerror = () => {
            fetchCoverByTitleAuthor();
          };
          img.src = openLibraryUrl;
        } catch (error) {
          fetchCoverByTitleAuthor();
        }
      } else {
        fetchCoverByTitleAuthor();
      }
    };

    const fetchCoverByTitleAuthor = () => {
      if (book.title) {
        const titleEncoded = encodeURIComponent(book.title);
        const openLibraryTitleUrl = `https://covers.openlibrary.org/b/title/${titleEncoded}-L.jpg`;
        
        try {
          const img = new Image();
          img.onload = () => {
            setCoverUrl(openLibraryTitleUrl);
            setIsLoading(false);
          };
          img.onerror = () => {
            setCoverUrl(null);
            setIsLoading(false);
          };
          img.src = openLibraryTitleUrl;
        } catch (error) {
          setCoverUrl(null);
          setIsLoading(false);
        }
      } else {
        setCoverUrl(null);
        setIsLoading(false);
      }
    };

    if (book) {
      fetchCoverImage();
    }
  }, [book?.isbn, book?.title, book?.author, book?.cover_image, book?.cover_image_url]);

  const handleImageError = () => {
    setImageError(true);
    setCoverUrl(null);
  };

  return (
    <div className={`bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center relative overflow-hidden ${sizeClasses[size]} ${className}`}>
      {isLoading ? (
        <div className="animate-pulse bg-white/20 w-full h-full" />
      ) : coverUrl && !imageError ? (
        <img 
          src={coverUrl} 
          alt={book.title || 'Book cover'} 
          className="w-full h-full object-cover"
          onError={handleImageError}
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <BookOpen className="text-white opacity-80" size={size === 'small' ? 24 : 64} />
      )}
    </div>
  );
};

export default BookCover;
