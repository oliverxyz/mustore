// =============================================
// MuStore API Client
// Модуль для работы с backend API
// =============================================

const API_BASE_URL = 'http://localhost:3001/api';

// Класс для работы с API
class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
        this.sessionId = this.getOrCreateSessionId();
    }

    // Получение или создание ID сессии для гостей
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Базовый метод для выполнения запросов
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': this.sessionId,
                ...options.headers,
            },
        };

        // Добавляем токен авторизации, если есть
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            // Обработка ошибок
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Сохранение токена
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // =============================================
    // Методы аутентификации
    // =============================================

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        this.setToken(null);
        localStorage.removeItem('currentUser');
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // =============================================
    // Методы для работы с категориями
    // =============================================

    async getCategories() {
        return await this.request('/categories');
    }

    async getCategory(slug) {
        return await this.request(`/categories/${slug}`);
    }

    // =============================================
    // Методы для работы с брендами
    // =============================================

    async getBrands(category = null) {
        const params = category ? `?category=${category}` : '';
        return await this.request(`/brands${params}`);
    }

    // =============================================
    // Методы для работы с товарами
    // =============================================

    async getProducts(filters = {}) {
        const params = new URLSearchParams();
        
        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined) {
                if (Array.isArray(filters[key])) {
                    params.append(key, filters[key].join(','));
                } else {
                    params.append(key, filters[key]);
                }
            }
        });

        return await this.request(`/products?${params.toString()}`);
    }

    async getProduct(identifier) {
        return await this.request(`/products/${identifier}`);
    }

    async getSimilarProducts(productId) {
        return await this.request(`/products/${productId}/similar`);
    }

    // =============================================
    // Методы для работы с корзиной
    // =============================================

    async getCart() {
        return await this.request('/cart');
    }

    async addToCart(productId, quantity = 1) {
        return await this.request('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity }),
        });
    }

    async updateCartItem(itemId, quantity) {
        return await this.request(`/cart/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
    }

    async removeFromCart(itemId) {
        return await this.request(`/cart/items/${itemId}`, {
            method: 'DELETE',
        });
    }

    async clearCart() {
        return await this.request('/cart', {
            method: 'DELETE',
        });
    }

    // =============================================
    // Методы для работы с избранным
    // =============================================

    async getFavorites() {
        return await this.request('/favorites');
    }

    async addToFavorites(productId) {
        return await this.request('/favorites', {
            method: 'POST',
            body: JSON.stringify({ productId }),
        });
    }

    async removeFromFavorites(productId) {
        return await this.request(`/favorites/${productId}`, {
            method: 'DELETE',
        });
    }

     // =============================================
    // Методы для работы с категориями
    // =============================================

    async getCategories() {
        return await this.request('/categories');
    }

    async getCategory(slug) {
        return await this.request(`/categories/${slug}`);
    }

    // =============================================
    // Методы для работы с брендами
    // =============================================

    async getBrands(category = null) {
        const params = category ? `?category=${category}` : '';
        return await this.request(`/brands${params}`);
    }

    // =============================================
    // Методы для работы с товарами
    // =============================================

    async getProducts(filters = {}) {
        const params = new URLSearchParams();
        
        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined) {
                if (Array.isArray(filters[key])) {
                    params.append(key, filters[key].join(','));
                } else {
                    params.append(key, filters[key]);
                }
            }
        });

        return await this.request(`/products?${params.toString()}`);
    }

    async getProduct(identifier) {
        return await this.request(`/products/${identifier}`);
    }

    async getSimilarProducts(productId) {
        return await this.request(`/products/${productId}/similar`);
    }

    // =============================================
    // Методы для работы с заказами
    // =============================================

    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async getOrders(params = {}) {
        const queryParams = new URLSearchParams(params);
        return await this.request(`/orders?${queryParams.toString()}`);
    }

    async getOrder(orderId) {
        return await this.request(`/orders/${orderId}`);
    }

    // =============================================
    // Административные методы
    // =============================================

    async getAdminStats() {
        return await this.request('/admin/stats');
    }

    async updateOrder(orderId, data) {
        return await this.request(`/admin/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async createProduct(productData) {
        const formData = new FormData();
        
        // Добавляем текстовые поля
        Object.keys(productData).forEach(key => {
            if (key !== 'images') {
                formData.append(key, productData[key]);
            }
        });

        // Добавляем изображения
        if (productData.images) {
            productData.images.forEach(image => {
                formData.append('images', image);
            });
        }

        return await this.request('/admin/products', {
            method: 'POST',
            headers: {
                // Не устанавливаем Content-Type, чтобы браузер сам установил boundary для multipart/form-data
            },
            body: formData,
        });
    }
}

// Создаем экземпляр API клиента
const apiClient = new ApiClient();

// Экспортируем для использования в других модулях
window.MuStoreAPI = apiClient;