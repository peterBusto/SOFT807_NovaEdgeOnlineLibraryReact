import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, Library, LogOut, User, Heart, ShoppingCart, History, ChevronDown } from 'lucide-react';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import BookList from './components/BookList';
import BookDetail from './components/BookDetail';
import Login from './components/Login';
import Register from './components/Register';
import PopularBookItem from './components/PopularBookItem';
import { bookService } from './services/api';
import { authService } from './services/auth';
import api from './services/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('login'); // 'login' or 'register'
  const [user, setUser] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      fetchBooks();
      fetchCategories();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        authService.setAuthToken(token);
        const userData = await authService.getCurrentUser();
        if (userData) {
          setIsAuthenticated(true);
          const isAdmin = userData.is_staff || userData.is_superuser || userData.is_admin || userData.role === 'admin';
          setUser({ 
            name: userData.name || 'User', 
            email: userData.email || 'user@example.com',
            role: userData.role || (isAdmin ? 'admin' : 'user')
          });
          setIsAdminUser(isAdmin);
        } else {
          // Token is invalid or expired or user endpoint doesn't exist
          // Keep the token and allow user to continue (user endpoint is optional)
          setIsAuthenticated(true);
          const storedEmail = localStorage.getItem('userEmail');
          // Extract first name from email
          const firstName = storedEmail ? storedEmail.split('@')[0].split('.')[0].split('-')[0].split('_')[0] : 'User';
          const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
          setUser({ name: formattedName || 'User', email: storedEmail || 'user@example.com' });
          // Check admin status via API since we don't have user data
          await checkAdminStatus();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        authService.setAuthToken(null);
        setIsAuthenticated(false);
        setUser(null);
        setIsAdminUser(false);
      }
    }
    
    // Check admin status if authenticated and not already set
    if (isAuthenticated && !isAdminUser) {
      checkAdminStatus();
    }
  };

  const handleLogin = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await authService.login(email, password);
      console.log('Login response:', response);
      
      // Login successful - set authentication state
      if (response.token) {
        authService.setAuthToken(response.token, email);
        localStorage.setItem('token', response.token);
        localStorage.setItem('userEmail', email);
        console.log('Token stored successfully:', response.token);
      } else {
        console.error('No token in login response:', response);
        throw new Error('Login response missing token');
      }
      
      setIsAuthenticated(true);
      // Extract first name from email if not provided in response
      const userName = response.user?.name || email.split('@')[0].split('.')[0].split('-')[0].split('_')[0];
      const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
      
      console.log('=== Login Response ===');
      console.log('Full response:', response);
      console.log('User data:', response.user);
      console.log('User role:', response.user?.role || response.user?.is_admin || response.user?.isAdmin);
      
      const isAdmin = response.user?.is_staff || response.user?.is_superuser || response.user?.is_admin || response.user?.role === 'admin';
      setUser({ 
        name: formattedName, 
        email: response.user?.email || email,
        role: response.user?.role || (isAdmin ? 'admin' : 'user')
      });
      
      // Set admin status based on login response
      setIsAdminUser(isAdmin);
      
      // Also verify with admin API (but don't override if login response says admin)
      const apiAdminCheck = await checkAdminStatus();
      if (!apiAdminCheck && isAdmin) {
        console.log('Login response indicates admin, but API check failed. Using login response.');
        setIsAdminUser(true);
      }
      
      console.log('User authenticated successfully');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleRegister = async (userData) => {
    try {
      console.log('Attempting registration for:', userData.email);
      const response = await authService.register(userData);
      console.log('Registration response:', response);
      
      // Registration successful - automatically log the user in
      try {
        const loginResponse = await authService.login(userData.email, userData.password);
        console.log('Auto-login after registration successful:', loginResponse);
        
        if (loginResponse.token) {
          authService.setAuthToken(loginResponse.token, userData.email);
          localStorage.setItem('token', loginResponse.token);
          localStorage.setItem('userEmail', userData.email);
        }
        
        setIsAuthenticated(true);
        const userName = loginResponse.user?.name || userData.first_name || userData.email.split('@')[0].split('.')[0].split('-')[0].split('_')[0];
        const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
        setUser({ name: formattedName, email: loginResponse.user?.email || userData.email });
        console.log('User registered and auto-logged in successfully');
      } catch (loginError) {
        console.error('Auto-login failed after registration, redirecting to login:', loginError);
        // If auto-login fails, redirect to login page
        setCurrentView('login');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    authService.setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setIsAdminUser(false);
    setCurrentView('login');
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await bookService.getAllBooks();
      setBooks(data);
      setFilteredBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
      setFilteredBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await bookService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      filterByCategory(selectedCategory);
      return;
    }

    // Client-side search filtering
    const lowerQuery = query.toLowerCase();
    const filtered = books.filter(book => {
      const title = book.title?.toLowerCase() || '';
      const author = book.author?.toLowerCase() || '';
      const category = book.category?.toLowerCase() || book.genre?.toLowerCase() || '';
      return title.includes(lowerQuery) || 
             author.includes(lowerQuery) || 
             category.includes(lowerQuery);
    });
    setFilteredBooks(filtered);
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    setSearchQuery('');

    if (category === 'all') {
      setFilteredBooks(books);
      return;
    }

    try {
      setLoading(true);
      const data = await bookService.getBooksByCategory(category);
      setFilteredBooks(data);
    } catch (error) {
      console.error('Error filtering by category:', error);
      setFilteredBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = (category) => {
    if (category === 'all') {
      setFilteredBooks(books);
    } else {
      const filtered = books.filter(book => book.category === category);
      setFilteredBooks(filtered);
    }
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setSelectedBook(null);
  };

  // Helper function to check if user is admin by calling admin API
  const checkAdminStatus = async () => {
    try {
      const response = await api.get('/api/admin/users/');
      console.log('Admin API response:', response);
      // If the request succeeds, the user has admin access
      setIsAdminUser(true);
      return true;
    } catch (error) {
      console.log('User is not admin or admin API failed:', error);
      setIsAdminUser(false);
      return false;
    }
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return isAdminUser;
  };

  const [currentMainView, setCurrentMainView] = useState('library'); // 'library', 'wishlist', 'cart', 'history', 'dashboard', 'admin-books', 'admin-users', 'admin-reports'
  const [wishlistBooks, setWishlistBooks] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [cart, setCart] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const notificationTimeoutRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const PRIMARY_ADMIN_EMAIL = 'admin@novaedge.com';
  
  // Admin state
  const [adminBooks, setAdminBooks] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdminBooks, setLoadingAdminBooks] = useState(false);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookFormData, setBookFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    description: '',
    cover_image_url: '',
    publication_date: '',
    total_copies: 1,
    available_copies: 1
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    is_admin: false
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showBookDeleteModal, setShowBookDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  const showNotification = (message, type = 'success') => {
    console.log('showNotification called with:', message, type);
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    console.log('Setting notification to show:', message);
    setNotification({ show: true, message, type });
    
    notificationTimeoutRef.current = setTimeout(() => {
      console.log('Hiding notification after timeout');
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Debug notification state changes
  useEffect(() => {
    console.log('Notification state changed:', notification);
  }, [notification]);

  const addToCart = async (book) => {
    try {
      const response = await api.post(`/api/books/${book.id}/cart/add/`);
      console.log('Added to cart:', response.data);
      // Refresh cart
      await fetchCart();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.detail || error.response.data?.error || 'Failed to add to cart';
        showNotification(errorMessage, 'error');
      } else {
        showNotification('Failed to add to cart. Please try again.', 'error');
      }
      return false;
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      await api.post(`/api/books/${cartItemId}/cart/remove/`);
      console.log('Removed from cart');
      // Refresh cart
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      showNotification('Failed to remove from cart. Please try again.', 'error');
    }
  };

  const clearCart = async () => {
    try {
      // Remove all items individually since clear endpoint might not exist
      const removePromises = cart.map(item => 
        api.post(`/api/books/${item.book?.id || item.id}/cart/remove/`)
      );
      await Promise.all(removePromises);
      console.log('Cart cleared');
      setCart([]);
      // Refresh cart to ensure it's actually cleared
      await fetchCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
      showNotification('Failed to clear cart. Please try removing items individually.', 'error');
    }
  };

  const fetchCart = async () => {
    try {
      const response = await api.get('/api/books/cart/');
      console.log('=== Cart API Response ===');
      console.log('Full response:', response.data);
      const cartItems = response.data?.results || response.data || [];
      console.log('Number of cart items:', cartItems.length);
      
      // Transform cart items to extract book details with comprehensive field mapping
      const transformedCart = await Promise.all(cartItems.map(async (item, index) => {
        console.log(`\n--- Cart Item ${index} ---`);
        console.log('Full item:', JSON.stringify(item, null, 2));
        
        let bookData = null;
        let bookId = null;
        
        // Check for nested 'book' object
        if (item.book) {
          if (typeof item.book === 'object' && item.book.title) {
            bookData = item.book;
            console.log('Found nested book object with details:', bookData);
          } else {
            // book is just an ID, fetch full details
            bookId = item.book;
            console.log('book is an ID, will fetch details:', bookId);
          }
        }
        // Check for nested 'Book' object (capitalized)
        else if (item.Book) {
          if (typeof item.Book === 'object' && item.Book.title) {
            bookData = item.Book;
            console.log('Found nested Book object with details:', bookData);
          } else {
            bookId = item.Book;
            console.log('Book is an ID, will fetch details:', bookId);
          }
        }
        // Check if item itself has book-like fields
        else if (item.title || item.Title) {
          bookData = item;
          console.log('Using item directly as book');
        }
        // Check for book_id field
        else if (item.book_id) {
          bookId = item.book_id;
          console.log('book_id found, will fetch details:', bookId);
        }
        
        // If we have a book ID but no book data, fetch full details
        if (bookId && !bookData) {
          try {
            console.log('Fetching book details for ID:', bookId);
            const bookResponse = await api.get(`/api/books/${bookId}/`);
            bookData = bookResponse.data;
            console.log('Fetched book details:', bookData);
          } catch (error) {
            console.error('Error fetching book details:', error);
          }
        }
        
        // Create standardized book object with fallbacks
        const standardizedBook = {
          id: bookData?.id || bookData?.book_id || item.id || bookId,
          title: bookData?.title || bookData?.Title || bookData?.name || bookData?.Name || 'Untitled',
          author: bookData?.author || bookData?.Author || bookData?.authors || bookData?.Authors || 'Unknown Author',
          genre: bookData?.genre || bookData?.Genre || bookData?.category || bookData?.Category || 'General',
          cover_image: bookData?.cover_image || bookData?.coverImage || bookData?.image || bookData?.Image || null,
          available_copies: bookData?.available_copies || bookData?.copies_available || bookData?.availableCopies || 'N/A'
        };
        
        console.log('Standardized book:', standardizedBook);
        
        return {
          id: item.id,
          book: standardizedBook
        };
      }));
      
      console.log('\n=== Transformed Cart ===');
      transformedCart.forEach((item, index) => {
        console.log(`Cart item ${index}:`, item);
      });
      
      setCart(transformedCart);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart([]);
    }
  };

  const fetchTransactions = async (options = {}) => {
    setLoadingTransactions(true);
    try {
      const response = await api.get('/api/borrowing-history/', { params: options.params || {} });
      console.log('=== Transactions API Response ===');
      console.log('Full response:', response.data);
      
      // Extract borrowing_history array from the response
      const transactionData = response.data?.borrowing_history || response.data?.results || response.data || [];
      console.log('Transaction data type:', typeof transactionData);
      console.log('Transaction data:', transactionData);
      console.log('Is array?', Array.isArray(transactionData));
      
      // Ensure we always have an array
      let transactionsArray = [];
      if (Array.isArray(transactionData)) {
        transactionsArray = transactionData;
      } else if (typeof transactionData === 'object' && transactionData !== null) {
        transactionsArray = [transactionData];
      }
      
      // Transform transactions to extract book details
      const transformedTransactions = await Promise.all(transactionsArray.map(async (transaction, index) => {
        console.log(`\n--- Transaction ${index} ---`);
        console.log('Full transaction:', JSON.stringify(transaction, null, 2));
        
        // Helper function to format date to dd/MM/yyyy
        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          const date = new Date(dateString);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };
        
        // Build the book reference from whatever the API returns (nested object, ID, or separate fields)
        const rawBook = transaction.book && typeof transaction.book === 'object' ? transaction.book : null;
        const bookId = rawBook
          ? rawBook.id
          : (transaction.book_id || (typeof transaction.book === 'number' || typeof transaction.book === 'string' ? transaction.book : null));

        // Build the user reference from whatever the API returns (nested object, ID, or separate fields)
        const rawUser = transaction.user && typeof transaction.user === 'object' ? transaction.user : null;
        const userId = rawUser
          ? rawUser.id
          : (transaction.user_id || (typeof transaction.user === 'number' || typeof transaction.user === 'string' ? transaction.user : null));
        const userName = rawUser
          ? (rawUser.name ||
             (rawUser.first_name && rawUser.last_name ? `${rawUser.first_name} ${rawUser.last_name}` : null) ||
             rawUser.first_name ||
             rawUser.username ||
             null)
          : (transaction.user_name || transaction.username || transaction.user_email || null);
        const userEmail = rawUser
          ? (rawUser.email || transaction.user_email || null)
          : (transaction.user_email || null);

        // Use the direct book_title and book_author fields from the API response
        const standardizedTransaction = {
          id: transaction.id,
          book: {
            id: bookId || null,
            title: rawBook?.title || transaction.book_title || 'Unknown Book',
            author: rawBook?.author || transaction.book_author || 'Unknown Author',
            cover_image: rawBook?.cover_image || null
          },
          user: {
            id: userId || null,
            name: userName,
            email: userEmail
          },
          user_email: userEmail,
          borrowed_date: formatDate(transaction.borrowed_date),
          due_date: formatDate(transaction.due_date),
          status: transaction.is_returned ? 'Returned' : 'Borrowed'
        };
        
        console.log('Standardized transaction:', standardizedTransaction);
        
        return standardizedTransaction;
      }));
      
      console.log('\n=== Transformed Transactions ===');
      transformedTransactions.forEach((item, index) => {
        console.log(`Transaction ${index}:`, item);
      });
      
      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await api.post('/api/books/cart/checkout/');
      console.log('Checkout response:', response.data);
      
      // Handle checkout results
      const results = response.data;
      let message = '';
      
      if (results.successful && results.successful.length > 0) {
        message += `Successfully borrowed ${results.successful.length} book(s). Please collect them from the library.`;
      }
      
      if (results.failed && results.failed.length > 0) {
        message += ` Failed to borrow ${results.failed.length} book(s).`;
      }
      
      console.log('About to show notification:', message);
      showNotification(message || 'Checkout completed. Please collect your books from the library.', results.failed?.length > 0 ? 'error' : 'success');
      console.log('Notification should be shown now');
      
      // Clear cart after checkout
      setCart([]);
      
      // Refresh transactions
      await fetchTransactions();
    } catch (error) {
      console.error('Checkout error:', error);
      if (error.response?.data?.detail) {
        showNotification(error.response.data.detail, 'error');
      } else {
        showNotification('Failed to checkout. Please try again.', 'error');
      }
    }
  };

  const fetchWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const response = await api.get('/api/books/wishlist/');
      console.log('=== Wishlist API Response ===');
      console.log('Full response:', response.data);
      const wishlistItems = response.data?.results || response.data || [];
      console.log('Number of wishlist items:', wishlistItems.length);
      
      // Transform wishlist items to book format
      const transformedBooks = await Promise.all(wishlistItems.map(async (item, index) => {
        console.log(`\n--- Wishlist Item ${index} ---`);
        console.log('Full item:', JSON.stringify(item, null, 2));
        
        let bookData = null;
        let bookId = null;
        
        // Check for nested 'book' object
        if (item.book) {
          if (typeof item.book === 'object' && item.book.title) {
            bookData = item.book;
            console.log('Using nested book object with details');
          } else {
            // book is just an ID, fetch full details
            bookId = item.book;
            console.log('book is an ID, will fetch details:', bookId);
          }
        }
        // Check for nested 'Book' object (capitalized)
        else if (item.Book) {
          if (typeof item.Book === 'object' && item.Book.title) {
            bookData = item.Book;
            console.log('Using nested Book object with details');
          } else {
            bookId = item.Book;
            console.log('Book is an ID, will fetch details:', bookId);
          }
        }
        // Check if item itself is the book
        else if (item.title || item.Title) {
          bookData = item;
          console.log('Using item directly as book');
        }
        // Check for book_id field
        else if (item.book_id) {
          bookId = item.book_id;
          console.log('book_id found, will fetch details:', bookId);
        }
        
        // If we have a book ID but no book data, fetch full details
        if (bookId && !bookData) {
          try {
            console.log('Fetching book details for ID:', bookId);
            const bookResponse = await api.get(`/api/books/${bookId}/`);
            bookData = bookResponse.data;
            console.log('Fetched book details:', bookData);
          } catch (error) {
            console.error('Error fetching book details:', error);
          }
        }
        
        if (bookData) {
          console.log('Book data found:', bookData);
          // Comprehensive field mapping with fallbacks
          return {
            id: bookData.id || bookData.book_id || item.id || bookId,
            title: bookData.title || bookData.Title || bookData.name || bookData.Name || 'Untitled',
            author: bookData.author || bookData.Author || bookData.authors || bookData.Authors || 'Unknown Author',
            category: bookData.category || bookData.Category || bookData.genre || bookData.Genre || 'General',
            published_year: bookData.published_year || bookData.publishedYear || bookData.year || bookData.Year || bookData.publication_date || 'N/A',
            rating: bookData.rating || bookData.Rating || bookData.stars || bookData.Stars || null,
            isbn: bookData.isbn || bookData.ISBN || bookData.isbn13 || bookData.ISBN13 || null,
            description: bookData.description || bookData.Description || bookData.summary || bookData.Summary || bookData.about || '',
            wishlistId: item.id
          };
        }
        
        // Fallback: return item as-is with defaults
        console.log('No book data found, using fallback');
        return {
          id: item.id || item.book_id || bookId,
          title: item.title || item.Title || 'Untitled',
          author: item.author || item.Author || 'Unknown Author',
          category: item.category || item.Category || 'General',
          published_year: item.published_year || item.publishedYear || 'N/A',
          rating: item.rating || item.Rating || null,
          isbn: item.isbn || item.ISBN || null,
          description: item.description || item.Description || '',
          wishlistId: item.id
        };
      }));
      
      console.log('\n=== Transformed Books ===');
      console.log('Number of transformed books:', transformedBooks.length);
      transformedBooks.forEach((book, index) => {
        console.log(`Book ${index}:`, book);
      });
      
      setWishlistBooks(transformedBooks);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setWishlistBooks([]);
    } finally {
      setLoadingWishlist(false);
    }
  };

  // Fetch wishlist books when switching to wishlist view
  useEffect(() => {
    if (currentMainView === 'wishlist') {
      fetchWishlist();
    }
  }, [currentMainView]);

  // Fetch cart on initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated]);

  // Fetch cart when switching to cart view
  useEffect(() => {
    if (currentMainView === 'cart') {
      fetchCart();
    }
  }, [currentMainView]);

  // Fetch wishlist when switching to dashboard view
  useEffect(() => {
    if (currentMainView === 'dashboard') {
      fetchWishlist();
    }
  }, [currentMainView]);

  // Reset page when switching views or changing filters
  useEffect(() => {
    setCurrentPage(1);
  }, [currentMainView, selectedCategory, searchQuery]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Calculate paginated books for library view
  const getPaginatedBooks = (booksToPaginate) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return booksToPaginate.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

  // Calculate the most-borrowed books from actual transaction history
  const getPopularBooks = (txns, allBooks) => {
    const counts = {};
    txns.forEach((t) => {
      const book = t.book || {};
      const id = book.id != null ? book.id : null;
      const title = book.title || 'Unknown Book';
      const author = book.author || 'Unknown Author';
      const key = id != null ? `id-${id}` : `${title}::${author}`;

      if (!counts[key]) {
        counts[key] = {
          id,
          title,
          author,
          isbn: book.isbn || null,
          cover_image: book.cover_image || null,
          count: 0
        };
      }
      counts[key].count++;
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => {
        if (item.cover_image || item.title === 'Unknown Book') {
          return item;
        }
        const catalogBook = allBooks.find((b) =>
          (item.id != null && String(b.id) === String(item.id)) ||
          (b.title === item.title && b.author === item.author)
        );
        if (catalogBook) {
          return {
            ...item,
            isbn: catalogBook.isbn || item.isbn,
            cover_image: catalogBook.cover_image || catalogBook.cover_image_url || null
          };
        }
        return item;
      });
  };

  const popularBooks = useMemo(() => getPopularBooks(transactions, books), [transactions, books]);

  // Resolve a transaction's user name, preferring the admin users list for
  // full names but falling back to any user details carried by the transaction.
  const getTransactionUserName = (transaction) => {
    if (transaction.user?.id && adminUsers.length) {
      const found = adminUsers.find((u) => String(u.id) === String(transaction.user.id));
      if (found) {
        return found.name ||
          (found.first_name && found.last_name ? `${found.first_name} ${found.last_name}` : null) ||
          found.first_name ||
          found.username ||
          found.email ||
          'Unknown User';
      }
    }

    return transaction.user?.name ||
      transaction.user?.username ||
      transaction.username ||
      transaction.user_email ||
      'Unknown User';
  };

  // Fetch transactions when switching to dashboard view
  useEffect(() => {
    if (currentMainView === 'dashboard') {
      fetchTransactions();
    }
  }, [currentMainView]);

  // Fetch transactions when switching to history view
  useEffect(() => {
    if (currentMainView === 'history') {
      fetchTransactions();
    }
  }, [currentMainView]);

  // Admin functions
  const fetchAdminBooks = async () => {
    try {
      setLoadingAdminBooks(true);
      // Ensure token is set before making admin API call
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage for admin books fetch');
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      authService.setAuthToken(token);
      const data = await bookService.getAllBooks();
      setAdminBooks(data);
    } catch (error) {
      console.error('Error fetching admin books:', error);
      showNotification('Failed to fetch books', 'error');
    } finally {
      setLoadingAdminBooks(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      setLoadingAdminUsers(true);
      // Ensure token is set before making admin API call
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage for admin users fetch');
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      authService.setAuthToken(token);
      const data = await bookService.getAllUsers();
      setAdminUsers(data);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      showNotification('Failed to fetch users', 'error');
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  const fetchBookCover = async () => {
    const { isbn, title } = bookFormData;
    
    if (!isbn && !title) {
      showNotification('Please enter ISBN or title to fetch cover', 'error');
      return;
    }

    let coverUrl = null;

    // Try ISBN first
    if (isbn) {
      const cleanIsbn = isbn.replace(/[^0-9X]/g, '');
      const isbnUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
      
      try {
        const response = await fetch(isbnUrl, { method: 'HEAD' });
        if (response.ok) {
          coverUrl = isbnUrl;
        }
      } catch (error) {
        console.log('ISBN fetch failed, trying title');
      }
    }

    // Fallback to title search
    if (!coverUrl && title) {
      const titleEncoded = encodeURIComponent(title);
      const titleUrl = `https://covers.openlibrary.org/b/title/${titleEncoded}-L.jpg`;
      
      try {
        const response = await fetch(titleUrl, { method: 'HEAD' });
        if (response.ok) {
          coverUrl = titleUrl;
        }
      } catch (error) {
        console.log('Title fetch failed');
      }
    }

    if (coverUrl) {
      setBookFormData({ ...bookFormData, cover_image_url: coverUrl });
      showNotification('Book cover fetched successfully!', 'success');
    } else {
      showNotification('No cover found for this book', 'error');
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedData = {
        ...bookFormData,
        isbn: bookFormData.isbn || null,
        publication_date: bookFormData.publication_date || null,
        genre: bookFormData.genre || null,
        description: bookFormData.description || null,
        cover_image_url: bookFormData.cover_image_url || null,
      };
      
      await bookService.createBook(cleanedData);
      showNotification('Book created successfully', 'success');
      setShowBookForm(false);
      setBookFormData({
        title: '',
        author: '',
        isbn: '',
        genre: '',
        description: '',
        cover_image_url: '',
        publication_date: '',
        total_copies: 1,
        available_copies: 1
      });
      fetchAdminBooks();
      fetchBooks(); // Refresh main books list
    } catch (error) {
      console.error('Error creating book:', error);
      showNotification('Failed to create book', 'error');
    }
  };

  const handleUpdateBook = async (e) => {
    e.preventDefault();
    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedData = {
        ...bookFormData,
        isbn: bookFormData.isbn || null,
        publication_date: bookFormData.publication_date || null,
        genre: bookFormData.genre || null,
        description: bookFormData.description || null,
        cover_image_url: bookFormData.cover_image_url || null,
      };
      
      await bookService.updateBook(editingBook.id, cleanedData);
      showNotification('Book updated successfully', 'success');
      setShowBookForm(false);
      setEditingBook(null);
      setBookFormData({
        title: '',
        author: '',
        isbn: '',
        genre: '',
        description: '',
        cover_image_url: '',
        publication_date: '',
        total_copies: 1,
        available_copies: 1
      });
      fetchAdminBooks();
      fetchBooks(); // Refresh main books list
    } catch (error) {
      console.error('Error updating book:', error);
      showNotification('Failed to update book', 'error');
    }
  };

  const handleDeleteBook = async (bookId) => {
    setBookToDelete(bookId);
    setShowBookDeleteModal(true);
  };

  const confirmDeleteBook = async () => {
    try {
      await bookService.deleteBook(bookToDelete);
      showNotification('Book deleted successfully', 'success');
      setShowBookDeleteModal(false);
      setBookToDelete(null);
      fetchAdminBooks();
      fetchBooks(); // Refresh main books list
    } catch (error) {
      console.error('Error deleting book:', error);
      showNotification('Failed to delete book', 'error');
    }
  };

  const cancelDeleteBook = () => {
    setShowBookDeleteModal(false);
    setBookToDelete(null);
  };

  const handleEditBookClick = (book) => {
    setEditingBook(book);
    setBookFormData({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      genre: book.genre || '',
      description: book.description || '',
      cover_image_url: book.cover_image_url || '',
      publication_date: book.publication_date || '',
      total_copies: book.total_copies || 1,
      available_copies: book.available_copies || 1
    });
    setShowBookForm(true);
  };

  const handleDeleteUser = async (user) => {
    if (user.email === PRIMARY_ADMIN_EMAIL) {
      showNotification('The default administrator account cannot be deleted', 'error');
      return;
    }
    setUserToDelete(user.id);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      await bookService.deleteUser(userToDelete);
      showNotification('User deleted successfully', 'success');
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Failed to delete user', 'error');
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Get password and password_confirm from form
      const formData = new FormData(e.target);
      const password = formData.get('password');
      const password_confirm = formData.get('password_confirm');
      
      // Validate passwords
      if (password !== password_confirm) {
        showNotification('Passwords do not match', 'error');
        return;
      }
      
      if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
      }
      
      const isAdmin = userFormData.role === 'admin';
      const userDataToSend = {
        ...userFormData,
        password: password,
        password_confirm: password_confirm,
        is_staff: isAdmin,
        is_superuser: isAdmin
      };
      delete userDataToSend.role;
      delete userDataToSend.is_admin;
      console.log('Creating user with data:', userDataToSend);
      await bookService.createUser(userDataToSend);
      showNotification('User created successfully', 'success');
      setShowUserForm(false);
      setUserFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        is_admin: false
      });
      fetchAdminUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Error response data:', error.response?.data);
      // Show specific error message
      const errorMessage = error.response?.data?.password?.[0] || 
                         error.response?.data?.username?.[0] ||
                         error.response?.data?.email?.[0] ||
                         'Failed to create user';
      showNotification(errorMessage, 'error');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (editingUser?.email === PRIMARY_ADMIN_EMAIL && userFormData.role !== 'admin') {
      showNotification('The default administrator must always have admin privileges', 'error');
      return;
    }
    try {
      const isAdmin = userFormData.role === 'admin';
      const userDataToSend = {
        ...userFormData,
        is_staff: isAdmin,
        is_superuser: isAdmin
      };
      delete userDataToSend.role;
      delete userDataToSend.is_admin;
      await bookService.updateUser(editingUser.id, userDataToSend);
      showNotification('User updated successfully', 'success');
      setShowUserForm(false);
      setEditingUser(null);
      setUserFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        is_admin: false
      });
      fetchAdminUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Failed to update user', 'error');
    }
  };

  const handleEditUserClick = (user) => {
    setEditingUser(user);
    const isPrimaryAdmin = user.email === PRIMARY_ADMIN_EMAIL;
    const isAdmin = isPrimaryAdmin || user.is_staff || user.is_superuser || user.is_admin || user.role === 'admin';
    setUserFormData({
      username: user.username || user.email || '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: isAdmin ? 'admin' : 'user'
    });
    setShowUserForm(true);
  };

  // Fetch admin data when switching to admin views
  useEffect(() => {
    if (currentMainView === 'admin-books') {
      fetchAdminBooks();
    }
  }, [currentMainView]);

  useEffect(() => {
    if (currentMainView === 'admin-users') {
      fetchAdminUsers();
    }
  }, [currentMainView]);

  useEffect(() => {
    if (currentMainView === 'admin-reports') {
      // Admins need the full borrowing history for the reports view
      fetchTransactions({ params: { all: 'true' } });
      fetchAdminUsers();
    }
  }, [currentMainView]);

  // Show Login/Register pages if not authenticated
  if (!isAuthenticated) {
    return currentView === 'login' ? (
      <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentView('register')} />
    ) : (
      <Register onRegister={handleRegister} onSwitchToLogin={() => setCurrentView('login')} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-4 z-[9999] px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 animate-bounce ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <span className="text-2xl">✓</span>
            ) : (
              <span className="text-2xl">✕</span>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-3 rounded-xl">
                <Library className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Nova Edge</h1>
                <p className="text-sm text-gray-500">Online Library</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedBook(null);
                  setCurrentMainView('library');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentMainView === 'library' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BookOpen size={24} />
                <span className="font-semibold">{filteredBooks.length} Books</span>
              </button>
              <button
                onClick={() => {
                  setSelectedBook(null);
                  setCurrentMainView('dashboard');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentMainView === 'dashboard' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">Dashboard</span>
              </button>
              {isAdmin() && (
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setCurrentMainView('admin-books');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentMainView === 'admin-books' || currentMainView === 'admin-users' || currentMainView === 'admin-reports'
                      ? 'bg-purple-50 text-purple-600' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">Admin Panel</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedBook(null);
                  setCurrentMainView(currentMainView === 'cart' ? 'library' : 'cart');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                  currentMainView === 'cart' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShoppingCart size={20} />
                <span className="font-medium">My Cart</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                >
                  <User size={20} />
                  <span className="font-medium">{user?.name || 'User'}</span>
                  <ChevronDown size={16} className={`transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setSelectedBook(null);
                        setCurrentMainView('wishlist');
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                        currentMainView === 'wishlist' 
                          ? 'bg-red-50 text-red-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Heart size={18} />
                      <span>My Wishlist</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBook(null);
                        setCurrentMainView('history');
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                        currentMainView === 'history' 
                          ? 'bg-green-50 text-green-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <History size={18} />
                      <span>History</span>
                    </button>
                    {isAdmin() && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => {
                            setSelectedBook(null);
                            setCurrentMainView('admin-books');
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                            currentMainView === 'admin-books' 
                              ? 'bg-purple-50 text-purple-600' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <BookOpen size={18} />
                          <span>Manage Books</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBook(null);
                            setCurrentMainView('admin-users');
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                            currentMainView === 'admin-users' 
                              ? 'bg-purple-50 text-purple-600' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <User size={18} />
                          <span>Manage Users</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBook(null);
                            setCurrentMainView('admin-reports');
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                            currentMainView === 'admin-reports' 
                              ? 'bg-purple-50 text-purple-600' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <History size={18} />
                          <span>Borrow Reports</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedBook ? (
          <BookDetail book={selectedBook} onBack={handleBack} addToCart={addToCart} />
        ) : currentMainView === 'wishlist' ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">My Wishlist</h2>
              <p className="text-gray-600">Books you've saved for later</p>
            </div>
            {loadingWishlist ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading wishlist...</p>
              </div>
            ) : wishlistBooks.length === 0 ? (
              <div className="text-center py-12">
                <Heart size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Your wishlist is empty</h3>
                <p className="text-gray-500 mb-6">Start adding books you love!</p>
                <button
                  onClick={() => setCurrentMainView('library')}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  Browse Books
                </button>
              </div>
            ) : (
              <BookList
                books={wishlistBooks}
                loading={loadingWishlist}
                onBookClick={handleBookClick}
              />
            )}
          </>
        ) : currentMainView === 'cart' ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">My Cart</h2>
              <p className="text-gray-600">Books you want to borrow</p>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-6">Add books to borrow them!</p>
                <button
                  onClick={() => setCurrentMainView('library')}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  Browse Books
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {cart.map((cartItem) => {
                    const book = cartItem.book || cartItem;
                    return (
                      <div key={cartItem.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {book.cover_image && (
                            <img 
                              src={book.cover_image} 
                              alt={book.title} 
                              className="w-16 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{book.title}</h3>
                            <p className="text-sm text-gray-600">{book.author}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>{book.genre || book.category || 'General'}</span>
                              <span>Available: {book.available_copies || book.copies_available || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(book.id)}
                          className="text-red-600 hover:text-red-700 font-medium ml-4"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={clearCart}
                    className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Borrow All ({cart.length})
                  </button>
                </div>
              </>
            )}
          </>
        ) : currentMainView === 'dashboard' ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
              <p className="text-gray-600">Welcome back, {user?.name || 'User'}!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <ShoppingCart size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cart Items</p>
                    <p className="text-2xl font-bold text-gray-800">{cart.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Heart size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Wishlist</p>
                    <p className="text-2xl font-bold text-gray-800">{wishlistBooks.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <History size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Borrowed</p>
                    <p className="text-2xl font-bold text-gray-800">{transactions.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Due for Return Section */}
            {(() => {
              console.log('=== Dashboard Due Date Debug ===');
              console.log('Transactions:', transactions);
              console.log('Transaction sample:', transactions[0]);
              
              const today = new Date();
              const dueSoon = transactions.filter(t => {
                console.log('Checking transaction:', t);
                console.log('Has due_date:', !!t.due_date);
                console.log('Has dueDate:', !!t.dueDate);
                console.log('Has return_date:', !!t.return_date);
                console.log('Has returnDate:', !!t.returnDate);
                
                const dueDateField = t.due_date || t.dueDate || t.return_date || t.returnDate;
                if (!dueDateField) return false;
                
                const dueDate = new Date(dueDateField);
                const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                console.log('Days until due:', daysUntilDue);
                
                return daysUntilDue <= 7 && daysUntilDue >= -30; // Due within 7 days or overdue up to 30 days
              }).sort((a, b) => new Date(a.due_date || a.dueDate || a.return_date || a.returnDate) - new Date(b.due_date || b.dueDate || b.return_date || b.returnDate));
              
              console.log('Due soon items:', dueSoon);
              
              // Show all transactions with due dates for debugging
              const allWithDueDates = transactions.filter(t => t.due_date || t.dueDate || t.return_date || t.returnDate);
              console.log('All transactions with due dates:', allWithDueDates);
              
              if (allWithDueDates.length === 0) return null;
              
              return (
                <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⏰</span>
                    Due for Return ({allWithDueDates.length})
                  </h3>
                  <div className="space-y-3">
                    {allWithDueDates.map((t, index) => {
                      console.log(`=== Transaction ${index} ===`);
                      console.log('Full transaction object:', JSON.stringify(t, null, 2));
                      console.log('All keys in transaction:', Object.keys(t));
                      
                      const dueDateField = t.due_date || t.dueDate || t.return_date || t.returnDate;
                      
                      // Parse dd/MM/yyyy format
                      let dueDate;
                      if (dueDateField && typeof dueDateField === 'string' && dueDateField.includes('/')) {
                        const parts = dueDateField.split('/');
                        if (parts.length === 3) {
                          dueDate = new Date(parts[2], parts[1] - 1, parts[0]); // year, month-1, day
                        } else {
                          dueDate = new Date(dueDateField);
                        }
                      } else {
                        dueDate = new Date(dueDateField);
                      }
                      
                      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntilDue < 0;
                      const isDueToday = daysUntilDue === 0;
                      
                      // Comprehensive field mapping for book title and author
                      const bookTitle = t.book?.title || t.book_title || t.title || t.Title || t.bookTitle || t.book_name || t.bookName || 'Unknown Book';
                      const bookAuthor = t.book?.author || t.book_author || t.author || t.Author || t.bookAuthor || t.authors || t.Authors || 'Unknown Author';
                      
                      console.log('Extracted title:', bookTitle);
                      console.log('Extracted author:', bookAuthor);
                      
                      return (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                          isOverdue ? 'bg-red-50 border border-red-200' : 
                          isDueToday ? 'bg-orange-50 border border-orange-200' : 
                          'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{bookTitle}</p>
                            <p className="text-sm text-gray-600">{bookAuthor}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`font-bold ${
                              isOverdue ? 'text-red-600' : 
                              isDueToday ? 'text-orange-600' : 
                              'text-yellow-600'
                            }`}>
                              {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                               isDueToday ? 'Due today' : 
                               `Due in ${daysUntilDue} days`}
                            </p>
                            <p className="text-xs text-gray-500">{dueDate.toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setCurrentMainView('library')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-lg">
                    <BookOpen size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Browse Books</h3>
                    <p className="text-sm text-gray-500">Explore our collection</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setCurrentMainView('cart')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <ShoppingCart size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">My Cart</h3>
                    <p className="text-sm text-gray-500">View items to borrow</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setCurrentMainView('wishlist')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Heart size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">My Wishlist</h3>
                    <p className="text-sm text-gray-500">Books you've saved</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setCurrentMainView('history')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <History size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Transaction History</h3>
                    <p className="text-sm text-gray-500">View borrowing history</p>
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : currentMainView === 'history' ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Transaction History</h2>
              <p className="text-gray-600">Your borrowing history</p>
            </div>
            {loadingTransactions ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <History size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No transactions yet</h3>
                <p className="text-gray-500 mb-6">Start borrowing books to see your history!</p>
                <button
                  onClick={() => setCurrentMainView('library')}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  Browse Books
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {transaction.book?.title || transaction.book_title || 'Book'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {transaction.book?.author || transaction.book_author || 'Unknown Author'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Borrowed: {transaction.borrowed_date || transaction.created_at || 'Date not available'}
                        </p>
                        {transaction.due_date && (
                          <p className="text-xs text-gray-500">
                            Due: {transaction.due_date}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'returned' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {transaction.status || 'Borrowed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : currentMainView === 'admin-books' ? (
          <>
            {/* Admin Navigation Tabs */}
            <div className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
              <button
                onClick={() => setCurrentMainView('admin-books')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-books'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Books
              </button>
              <button
                onClick={() => setCurrentMainView('admin-users')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-users'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Users
              </button>
              <button
                onClick={() => setCurrentMainView('admin-reports')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-reports'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Borrow Reports
              </button>
            </div>

            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Manage Books</h2>
                <p className="text-gray-600">Add, edit, or remove books from the library</p>
              </div>
              <button
                onClick={() => {
                  setEditingBook(null);
                  setBookFormData({
                    title: '',
                    author: '',
                    isbn: '',
                    category: '',
                    genre: '',
                    description: '',
                    cover_image: '',
                    publication_date: '',
                    total_copies: 1,
                    available_copies: 1
                  });
                  setShowBookForm(true);
                }}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Add New Book
              </button>
            </div>

            {showBookForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {editingBook ? 'Edit Book' : 'Add New Book'}
                  </h3>
                  <form onSubmit={editingBook ? handleUpdateBook : handleCreateBook} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={bookFormData.title}
                          onChange={(e) => setBookFormData({...bookFormData, title: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input
                          type="text"
                          value={bookFormData.author}
                          onChange={(e) => setBookFormData({...bookFormData, author: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ISBN (Optional)</label>
                        <input
                          type="text"
                          value={bookFormData.isbn}
                          onChange={(e) => setBookFormData({...bookFormData, isbn: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter ISBN for cover fetching"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Genre (Optional)</label>
                        <input
                          type="text"
                          value={bookFormData.genre}
                          onChange={(e) => setBookFormData({...bookFormData, genre: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date (Optional)</label>
                        <input
                          type="date"
                          value={bookFormData.publication_date}
                          onChange={(e) => setBookFormData({...bookFormData, publication_date: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
                        <input
                          type="number"
                          value={bookFormData.total_copies}
                          onChange={(e) => setBookFormData({...bookFormData, total_copies: parseInt(e.target.value) || 1})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Copies</label>
                        <input
                          type="number"
                          value={bookFormData.available_copies}
                          onChange={(e) => setBookFormData({...bookFormData, available_copies: parseInt(e.target.value) || 1})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={bookFormData.cover_image_url}
                          onChange={(e) => setBookFormData({...bookFormData, cover_image_url: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter URL or click 'Fetch Cover'"
                        />
                        <button
                          type="button"
                          onClick={fetchBookCover}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Fetch Cover
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Auto-fetches cover from Open Library using ISBN or title</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={bookFormData.description}
                        onChange={(e) => setBookFormData({...bookFormData, description: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows="3"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                      >
                        {editingBook ? 'Update Book' : 'Create Book'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookForm(false);
                          setEditingBook(null);
                          setBookFormData({
                            title: '',
                            author: '',
                            isbn: '',
                            genre: '',
                            description: '',
                            cover_image_url: '',
                            publication_date: '',
                            total_copies: 1,
                            available_copies: 1
                          });
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {loadingAdminBooks ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading books...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {book.cover_image && (
                              <img src={book.cover_image} alt={book.title} className="h-10 w-10 rounded object-cover mr-3" />
                            )}
                            <div className="text-sm font-medium text-gray-900">{book.title}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.author}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.category || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.total_copies || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.available_copies || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditBookClick(book)}
                            className="text-purple-600 hover:text-purple-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminBooks.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No books found</p>
                  </div>
                )}
              </div>
            )}

            {showBookDeleteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full mx-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Delete Book</h3>
                  <p className="text-gray-600 mb-6">Are you sure you want to delete this book? This action cannot be undone.</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={cancelDeleteBook}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteBook}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : currentMainView === 'admin-users' ? (
          <>
            {/* Admin Navigation Tabs */}
            <div className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
              <button
                onClick={() => setCurrentMainView('admin-books')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-books'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Books
              </button>
              <button
                onClick={() => setCurrentMainView('admin-users')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-users'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Users
              </button>
              <button
                onClick={() => setCurrentMainView('admin-reports')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-reports'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Borrow Reports
              </button>
            </div>

            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Manage Users</h2>
                <p className="text-gray-600">View and manage user accounts</p>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserFormData({
                    username: '',
                    email: '',
                    first_name: '',
                    last_name: '',
                    role: 'user',
                    is_admin: false
                  });
                  setShowUserForm(true);
                }}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Add New User
              </button>
            </div>

            {showUserForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h3>
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          value={userFormData.username}
                          onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                          type="text"
                          value={userFormData.first_name}
                          onChange={(e) => setUserFormData({...userFormData, first_name: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={userFormData.last_name}
                          onChange={(e) => setUserFormData({...userFormData, last_name: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                          value={userFormData.role}
                          onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                          disabled={editingUser?.email === PRIMARY_ADMIN_EMAIL}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        {editingUser?.email === PRIMARY_ADMIN_EMAIL && (
                          <p className="mt-1 text-xs text-amber-600">The default administrator role cannot be changed.</p>
                        )}
                      </div>
                    </div>
                    {!editingUser && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input
                            type="password"
                            name="password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                          <input
                            type="password"
                            name="password_confirm"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                      >
                        {editingUser ? 'Update User' : 'Create User'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserForm(false);
                          setEditingUser(null);
                          setUserFormData({
                            username: '',
                            email: '',
                            first_name: '',
                            last_name: '',
                            role: 'user',
                            is_admin: false
                          });
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showDeleteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full mx-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Delete User</h3>
                  <p className="text-gray-600 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={cancelDeleteUser}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteUser}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingAdminUsers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(user.is_staff || user.is_superuser || user.is_admin || user.role === 'admin') ? (user.email === PRIMARY_ADMIN_EMAIL ? 'Admin (Primary)' : 'Admin') : 'User'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditUserClick(user)}
                            className="text-purple-600 hover:text-purple-900 mr-4"
                          >
                            Edit
                          </button>
                          {user.email !== PRIMARY_ADMIN_EMAIL && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminUsers.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No users found</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : currentMainView === 'admin-reports' ? (
          <>
            {/* Admin Navigation Tabs */}
            <div className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
              <button
                onClick={() => setCurrentMainView('admin-books')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-books'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Books
              </button>
              <button
                onClick={() => setCurrentMainView('admin-users')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-users'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Users
              </button>
              <button
                onClick={() => setCurrentMainView('admin-reports')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentMainView === 'admin-reports'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Borrow Reports
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Borrow Reports</h2>
              <p className="text-gray-600">View borrowing statistics and reports</p>
            </div>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Books</p>
                    <p className="text-3xl font-bold text-gray-800">{books.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <BookOpen size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-gray-800">{adminUsers.length}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <User size={24} className="text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
                    <p className="text-3xl font-bold text-gray-800">{transactions.length}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <History size={24} className="text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Active Borrows</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {transactions.filter(t => t.status?.toLowerCase() !== 'returned').length}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <ShoppingCart size={24} className="text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
              </div>
              {loadingTransactions ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrowed Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions.slice(0, 10).map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.book?.title || transaction.book_title || 'Unknown Book'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.book?.author || transaction.book_author || 'Unknown Author'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getTransactionUserName(transaction)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.borrowed_date || transaction.created_at || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.due_date || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              transaction.status?.toLowerCase() === 'returned'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {transaction.status || 'Borrowed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Popular Books */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Popular Books</h3>
                <p className="text-sm text-gray-500">Top 5 most borrowed books</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {loadingTransactions ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
                      <p className="mt-2 text-gray-600">Loading popular books...</p>
                    </div>
                  ) : popularBooks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No borrowing data available</p>
                    </div>
                  ) : (
                    popularBooks.map((book) => (
                      <PopularBookItem key={book.id ? `book-${book.id}` : `${book.title}-${book.author}`} book={book} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search Section */}
            <div className="mb-8">
              <SearchBar onSearch={handleSearch} />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
              />
            )}

            {/* Book List */}
            <BookList
              books={getPaginatedBooks(filteredBooks)}
              loading={loading}
              onBookClick={handleBookClick}
            />

            {/* Pagination */}
            {filteredBooks.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 Nova Edge Online Library. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
