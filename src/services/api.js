import api from './auth';

export const bookService = {
  getAllBooks: async () => {
    try {
      const response = await api.get('/api/books/');
      console.log('Get all books successful with /api/books/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Get all books failed with /api/books/ endpoint');
      throw new Error('Unable to fetch books. Please check your connection or try again later.');
    }
  },

  getBookById: async (id) => {
    try {
      const response = await api.get(`/api/books/${id}/`);
      console.log('Get book by id successful with /api/books/${id}/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Get book by id failed with /api/books/${id}/ endpoint');
      throw new Error('Unable to fetch book details. Please check your connection or try again later.');
    }
  },

  searchBooks: async (query) => {
    try {
      const response = await api.get(`/api/books/search/?q=${query}`);
      console.log('Search books successful with /api/books/search/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Search books failed with /api/books/search/ endpoint');
      throw new Error('Unable to search books. Please check your connection or try again later.');
    }
  },

  getBooksByCategory: async (category) => {
    try {
      const response = await api.get(`/api/books/?category=${category}`);
      console.log('Get books by category successful with /api/books/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Get books by category failed with /api/books/ endpoint');
      throw new Error('Unable to fetch books by category. Please check your connection or try again later.');
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/api/categories/');
      console.log('Get categories successful with /api/categories/ endpoint');
      return response.data;
    } catch (error) {
      // Don't log 404 errors - we handle them gracefully
      if (error.response?.status !== 404) {
        console.error('Get categories failed with /api/categories/ endpoint');
      }
      return []; // Return empty array instead of throwing error
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/api/categories/', categoryData);
      console.log('Create category successful with /api/categories/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Create category failed with /api/categories/ endpoint');
      throw error;
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      console.log('Updating category with ID:', id);
      console.log('Category data being sent:', categoryData);
      const response = await api.put(`/api/categories/${id}/`, categoryData);
      console.log('Update category successful with /api/categories/${id}/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Update category failed with /api/categories/${id}/ endpoint');
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      console.log('Deleting category with ID:', id);
      const response = await api.delete(`/api/categories/${id}/`);
      console.log('Delete category successful with /api/categories/${id}/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Delete category failed with /api/categories/${id}/ endpoint');
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // Admin Book Operations
  createBook: async (bookData) => {
    try {
      const response = await api.post('/api/books/admin/create/', bookData);
      console.log('Create book successful with /api/books/admin/create/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Create book failed with /api/books/admin/create/ endpoint');
      throw error;
    }
  },

  updateBook: async (id, bookData) => {
    try {
      console.log('Updating book with ID:', id);
      console.log('Book data being sent:', bookData);
      const response = await api.put(`/api/books/admin/${id}/update/`, bookData);
      console.log('Update book successful with /api/books/admin/${id}/update/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Update book failed with /api/books/admin/${id}/update/ endpoint');
      console.error('Error response:', error.response?.data);
      console.error('Full error:', error);
      if (error.response?.data) {
        Object.keys(error.response.data).forEach(field => {
          console.error(`Field "${field}" errors:`, error.response.data[field]);
        });
      }
      throw error;
    }
  },

  deleteBook: async (id) => {
    try {
      const response = await api.delete(`/api/books/admin/${id}/delete/`);
      console.log('Delete book successful with /api/books/admin/${id}/delete/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Delete book failed with /api/books/admin/${id}/delete/ endpoint');
      throw error;
    }
  },

  // Admin User Operations
  getAllUsers: async () => {
    try {
      const response = await api.get('/api/admin/users/');
      console.log('Get all users successful with /api/admin/users/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Get all users failed with /api/admin/users/ endpoint');
      throw error;
    }
  },

  createUser: async (userData) => {
    try {
      console.log('Creating user with data:', userData);
      const response = await api.post('/api/register/', userData);
      console.log('Create user successful with /api/register/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Create user failed with /api/register/ endpoint');
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  updateUser: async (id, userData) => {
    try {
      console.log('Updating user with ID:', id);
      console.log('User data being sent:', userData);
      const response = await api.put(`/api/admin/users/${id}/`, userData);
      console.log('Update user successful with /api/admin/users/${id}/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Update user failed with /api/admin/users/${id}/ endpoint');
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  deleteUser: async (id) => {
    try {
      console.log('Deleting user with ID:', id);
      const response = await api.delete(`/api/admin/users/${id}/delete/`);
      console.log('Delete user successful with /api/admin/users/${id}/delete/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Delete user failed with /api/admin/users/${id}/delete/ endpoint');
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },
};

export const adminService = {
  createBook: async (bookData) => bookService.createBook(bookData),
  updateBook: async (id, bookData) => bookService.updateBook(id, bookData),
  deleteBook: async (id) => bookService.deleteBook(id),
  getAllUsers: async () => bookService.getAllUsers(),
  createUser: async (userData) => bookService.createUser(userData),
  updateUser: async (id, userData) => bookService.updateUser(id, userData),
  deleteUser: async (id) => bookService.deleteUser(id),
  createCategory: async (categoryData) => bookService.createCategory(categoryData),
  updateCategory: async (id, categoryData) => bookService.updateCategory(id, categoryData),
  deleteCategory: async (id) => bookService.deleteCategory(id),
};

export default api;
