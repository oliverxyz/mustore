// =============================================
// MuStore API Client
// Модуль для работы с backend API
// =============================================

// Определяем правильный базовый URL для API
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Если мы на порту 8080 (ручная разработка) - идем напрямую к backend
    if (port === '8080' || hostname !== 'localhost') {
        return 'http://localhost:3001/api';
    }
    
    // Если через Docker (localhost:80) - идем через Nginx
    return '/api';
})();

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
                'X-Session-ID': this.sessionId,
                ...options.headers,
            },
        };

        // Добавляем Content-Type только если это не FormData
        if (!(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        // Добавляем токен авторизации, если есть
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            // Если ответ не JSON, возвращаем текст
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            // Обработка ошибок
            if (!response.ok) {
                const errorMessage = data.error || data || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            return data;
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
            if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                if (Array.isArray(filters[key])) {
                    params.append(key, filters[key].join(','));
                } else {
                    params.append(key, filters[key]);
                }
            }
        });

        const queryString = params.toString();
        const endpoint = queryString ? `/products?${queryString}` : '/products';
        
        return await this.request(endpoint);
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
    // Методы для работы с заказами
    // =============================================

    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async getOrders(params = {}) {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });
        
        const queryString = queryParams.toString();
        const endpoint = queryString ? `/orders?${queryString}` : '/orders';
        
        return await this.request(endpoint);
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
            body: formData, // FormData не нужно stringify
        });
    }

    // =============================================
    // Утилитарные методы
    // =============================================

    // Проверка состояния API
    async healthCheck() {
        try {
            return await this.request('/health');
        } catch (error) {
            throw new Error('API недоступен');
        }
    }

    // Получение изображения товара с fallback
    getProductImageUrl(imageUrl) {
        if (!imageUrl) {
            return '/images/placeholder.jpg';
        }
        
        // Если это полный URL, возвращаем как есть
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        // Если это относительный путь, добавляем базовый URL
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Для ручной разработки
        if (port === '8080' || hostname !== 'localhost') {
            return `http://localhost:3001${imageUrl}`;
        }
        
        // Для Docker (через Nginx)
        return imageUrl;
    }

    // Форматирование цены
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    // Debounce для поиска
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Создаем экземпляр API клиента
const apiClient = new ApiClient();

// Проверяем доступность API при загрузке
apiClient.healthCheck().then(() => {
    console.log('✅ API connection established');
}).catch((error) => {
    console.error('❌ API connection failed:', error);
});

// Экспортируем для использования в других модулях
window.MuStoreAPI = apiClient;

// Также экспортируем через module.exports для совместимости
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiClient;
}