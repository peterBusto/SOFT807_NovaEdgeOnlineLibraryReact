import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Star, Calendar, User, FileText, Tag, Heart, Check, ShoppingCart } from 'lucide-react';
import api from '../services/auth';

const BookDetail = ({ book, onBack, addToCart, categories }) => {
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingWishlist, setLoadingWishlist] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoadingCover, setIsLoadingCover] = useState(true);

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

  // Fetch cover image when book changes
  useEffect(() => {
    const fetchCoverImage = async () => {
      setIsLoadingCover(true);
      setImageError(false);
      
      // First, try to use the cover_image from the API response
      if (book.cover_image || book.cover_image_url) {
        setCoverUrl(book.cover_image || book.cover_image_url);
        setIsLoadingCover(false);
        return;
      }

      // Check cache for previously successful cover URLs
      const cacheKey = `book_cover_${book.id}_${book.isbn}_${book.title}`;
      const cachedUrl = localStorage.getItem(cacheKey);
      if (cachedUrl) {
        setCoverUrl(cachedUrl);
        setIsLoadingCover(false);
        return;
      }

      // If no cover from API, try Open Library API using ISBN
      if (book.isbn) {
        const isbn = book.isbn.replace(/[^0-9X]/g, ''); // Clean ISBN
        const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        
        try {
          const img = new Image();
          const timeout = setTimeout(() => {
            // If image takes too long, show fallback
            setIsLoadingCover(false);
          }, 3000); // 3 second timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            setCoverUrl(openLibraryUrl);
            // Cache the successful URL
            localStorage.setItem(cacheKey, openLibraryUrl);
            setIsLoadingCover(false);
          };
          img.onerror = () => {
            clearTimeout(timeout);
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
      if (book.title && book.author) {
        const titleEncoded = encodeURIComponent(book.title);
        const openLibraryTitleUrl = `https://covers.openlibrary.org/b/title/${titleEncoded}-L.jpg`;
        
        try {
          const img = new Image();
          const timeout = setTimeout(() => {
            // If image takes too long, show fallback
            setIsLoadingCover(false);
          }, 3000); // 3 second timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            setCoverUrl(openLibraryTitleUrl);
            // Cache the successful URL
            const cacheKey = `book_cover_${book.id}_${book.isbn}_${book.title}`;
            localStorage.setItem(cacheKey, openLibraryTitleUrl);
            setIsLoadingCover(false);
          };
          img.onerror = () => {
            clearTimeout(timeout);
            setCoverUrl(null);
            setIsLoadingCover(false);
          };
          img.src = openLibraryTitleUrl;
        } catch (error) {
          setCoverUrl(null);
          setIsLoadingCover(false);
        }
      } else {
        setCoverUrl(null);
        setIsLoadingCover(false);
      }
    };

    if (book) {
      fetchCoverImage();
    }
  }, [book?.id, book?.isbn, book?.title, book?.author, book?.cover_image, book?.cover_image_url]);

  const handleImageError = () => {
    setImageError(true);
    setCoverUrl(null);
  };

  // Check if book is in wishlist when component loads
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!book?.id) return;
      
      try {
        const response = await api.get('/api/books/wishlist/');
        console.log('=== Wishlist Check ===');
        console.log('Current book ID:', book.id);
        console.log('Current book ID type:', typeof book.id);
        console.log('Wishlist API response:', response.data);
        
        // Check if current book is in the wishlist
        const wishlistBooks = response.data?.results || response.data || [];
        console.log('Wishlist books array:', wishlistBooks);
        console.log('Number of wishlist items:', wishlistBooks.length);
        
        let foundMatch = false;
        wishlistBooks.forEach((wb, index) => {
          console.log(`Wishlist item ${index}:`, wb);
          console.log(`  - wb.id: ${wb.id}`);
          console.log(`  - wb.book: ${wb.book} (type: ${typeof wb.book})`);
          
          // Compare current book ID directly with wb.book field
          if (wb.book == book.id) {
            console.log(`  -> MATCH FOUND! wb.book (${wb.book}) == book.id (${book.id})`);
            foundMatch = true;
          }
        });
        
        console.log('Final result - Is in wishlist:', foundMatch);
        setInWishlist(foundMatch);
      } catch (error) {
        // 404 means endpoint doesn't exist
        // We'll assume not in wishlist for now - no error logging needed
        console.log('Wishlist check failed, assuming not in wishlist');
      } finally {
        setLoadingWishlist(false);
      }
    };

    checkWishlistStatus();
  }, [book?.id]);

  const handleBorrowBook = async () => {
    if (addToCart) {
      const success = await addToCart(book);
      if (success) {
        setAddedToCart(true);
        setMessage('Added to cart!');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const handleAddToWishlist = async () => {
    setAddingToWishlist(true);
    setMessage('');
    try {
      const response = await api.post(`/api/books/${book.id}/wishlist/add/`);
      console.log('Added to wishlist successfully:', response.data);
      setInWishlist(true);
      setMessage('Added to wishlist!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      // Handle 404 gracefully - endpoint may not exist
      if (error.response?.status === 404) {
        setMessage('Wishlist feature is not available.');
      } else if (error.response?.status === 401) {
        setMessage('You must be logged in to add to wishlist.');
      } else {
        console.error('Error adding to wishlist:', error);
        setMessage('Failed to add to wishlist. Please try again.');
      }
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setAddingToWishlist(false);
    }
  };

  if (!book) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 font-medium transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Library
      </button>

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="h-64 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center relative overflow-hidden">
          {isLoadingCover ? (
            <div className="animate-pulse bg-white/20 w-full h-full" />
          ) : coverUrl && !imageError ? (
            <img 
              src={coverUrl} 
              alt={book.title || 'Book cover'} 
              className="w-full h-full object-cover"
              onError={handleImageError}
              onLoad={() => setIsLoadingCover(false)}
            />
          ) : (
            <BookOpen className="text-white opacity-80" size={96} />
          )}
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{book.title || 'Untitled'}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <User size={20} />
                <span className="text-lg">{book.author || 'Unknown Author'}</span>
              </div>
            </div>
            {book.rating && (
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
                <Star className="text-yellow-500" size={24} fill="currentColor" />
                <span className="text-xl font-bold text-yellow-600">{book.rating}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Calendar className="text-primary-600" size={24} />
              <div>
                <p className="text-sm text-gray-500">Published</p>
                <p className="font-semibold text-gray-800">
                  {book.publication_date 
                    ? new Date(book.publication_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Tag className="text-primary-600" size={24} />
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-semibold text-gray-800">{getCategoryName()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <FileText className="text-primary-600" size={24} />
              <div>
                <p className="text-sm text-gray-500">Genre</p>
                <p className="font-semibold text-gray-800">{book.genre || '-'}</p>
              </div>
            </div>
            {book.isbn && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <FileText className="text-primary-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">ISBN</p>
                  <p className="font-semibold text-gray-800">{book.isbn}</p>
                </div>
              </div>
            )}
          </div>

          {book.description && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Description</h2>
              <p className="text-gray-600 leading-relaxed">{book.description}</p>
            </div>
          )}

          {message && (
            <div className={`mb-6 p-4 rounded-xl text-center font-medium ${
              message.includes('success') || message.includes('Added') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleBorrowBook}
              disabled={addedToCart}
              className={`flex-1 py-4 rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center gap-2 ${
                addedToCart 
                  ? 'bg-blue-600 text-white cursor-default' 
                  : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200'
              }`}
            >
              {addedToCart ? (
                <>
                  <ShoppingCart size={20} />
                  Added to Cart
                </>
              ) : (
                'Borrow Book'
              )}
            </button>
            <button
              onClick={handleAddToWishlist}
              disabled={addingToWishlist || inWishlist || loadingWishlist}
              className={`px-8 py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                inWishlist 
                  ? 'bg-red-50 border-2 border-red-600 text-red-600 cursor-default' 
                  : 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50'
              } ${(addingToWishlist || loadingWishlist) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingWishlist ? (
                'Loading...'
              ) : addingToWishlist ? (
                'Adding...'
              ) : inWishlist ? (
                <>
                  <Heart size={20} fill="currentColor" />
                  In Wishlist
                </>
              ) : (
                <>
                  <Heart size={20} />
                  Add to Wishlist
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
