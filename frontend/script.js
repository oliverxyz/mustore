// ====================================
// MuStore - Главный модуль приложения
// ====================================

const API = window.MuStoreAPI;

const App = {
    // Инициализация приложения
    async init() {
        try {
            // Инициализируем подмодули
            this.Router.init();
            this.Auth.init();
            await this.Cart.init();
            await this.Favorites.init();
            this.UI.init();
            
            // Загружаем начальную страницу
            this.Router.handleRoute();
            
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.UI.showNotification('Ошибка инициализации приложения', 'error');
        }
    },

    // Глобальное состояние приложения
    state: {
        currentUser: null,
        cart: [],
        favorites: [],
        categories: [],
        filters: {
            category: null,
            subcategory: null,
            brands: [],
            priceMin: null,
            priceMax: null,
            search: ''
        }
    },

    // Закрытие модального окна
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    // Открытие модального окна
    openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }
};

// ====================================
// Модуль маршрутизации (Router)
// ====================================

App.Router = {
    routes: {
        'home': () => App.Pages.showHome(),
        'category/:category': (params) => App.Pages.showCategory(params.category),
        'category/:category/:subcategory': (params) => App.Pages.showCategory(params.category, params.subcategory),
        'product/:id': (params) => App.Pages.showProduct(params.id),
        'search': () => App.Pages.showSearch(),
        'cart': () => App.Pages.showCart(),
        'checkout': () => App.Pages.showCheckout(),
        'favorites': () => App.Pages.showFavorites(),
        'orders': () => App.Pages.showOrders(),
        'admin': () => App.Pages.showAdmin(),
        'about': () => App.Pages.showInfo('about'),
        'delivery': () => App.Pages.showInfo('delivery'),
        'returns': () => App.Pages.showInfo('returns'),
        'warranty': () => App.Pages.showInfo('warranty'),
        'service': () => App.Pages.showInfo('service'),
        'advantages': () => App.Pages.showInfo('advantages'),
        'reviews': () => App.Pages.showInfo('reviews'),
        'careers': () => App.Pages.showInfo('careers'),
        'sale': () => App.Pages.showSale()
    },

    init() {
        // Обработка кликов по ссылкам с data-link
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-link]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-link');
                this.navigate(route);
            }
        });

        // Обработка изменения истории браузера
        window.addEventListener('popstate', () => this.handleRoute());
    },

    navigate(route) {
        window.history.pushState(null, null, `#${route}`);
        this.handleRoute();
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        
        // Поиск подходящего маршрута
        let routeFound = false;
        for (const [pattern, handler] of Object.entries(this.routes)) {
            const regex = this.createRouteRegex(pattern);
            const match = hash.match(regex);
            
            if (match) {
                const params = this.extractParams(pattern, hash);
                handler(params);
                routeFound = true;
                break;
            }
        }
        
        if (!routeFound) {
            this.navigate('home');
        }
    },

    createRouteRegex(pattern) {
        const regexPattern = pattern
            .replace(/\//g, '\\/')
            .replace(/:([^\/]+)/g, '([^\/]+)');
        return new RegExp(`^${regexPattern}$`);
    },

    extractParams(pattern, path) {
        const params = {};
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');
        
        patternParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.slice(1);
                params[paramName] = pathParts[index];
            }
        });
        
        return params;
    }
};

// ====================================
// Модуль аутентификации
// ====================================

App.Auth = {
    init() {
        // Проверяем сохраненный токен
        const token = localStorage.getItem('authToken');
        if (token) {
            this.checkAuth();
        }

        // Обработчики форм
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Обработчики кнопок
        document.getElementById('loginBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (App.state.currentUser) {
                App.Router.navigate('orders');
            } else {
                App.openModal('authModal');
            }
        });

        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        document.getElementById('ordersBtn').addEventListener('click', (e) => {
            e.preventDefault();
            App.Router.navigate('orders');
        });

        document.getElementById('adminBtn').addEventListener('click', (e) => {
            e.preventDefault();
            App.Router.navigate('admin');
        });
    },

    async checkAuth() {
        try {
            const user = await API.getCurrentUser();
            App.state.currentUser = {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
                role: user.role
            };
            this.updateUIForUser();
        } catch (error) {
            // Токен невалидный, очищаем
            API.logout();
            App.state.currentUser = null;
            this.updateUIForUser();
        }
    },

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            App.UI.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            App.UI.showLoader();
            const response = await API.login(email, password);
            
            App.state.currentUser = {
                id: response.user.id,
                email: response.user.email,
                name: `${response.user.firstName} ${response.user.lastName || ''}`.trim(),
                role: response.user.role
            };

            this.updateUIForUser();
            App.closeModal('authModal');
            App.UI.showNotification(`Добро пожаловать, ${App.state.currentUser.name}!`, 'success');
            
            // Очищаем форму
            document.getElementById('loginForm').reset();
            
            // Загружаем корзину и избранное после входа
            await App.Cart.loadCart();
            await App.Favorites.loadFavorites();
        } catch (error) {
            App.UI.showNotification(error.message || 'Ошибка при входе', 'error');
        } finally {
            App.UI.hideLoader();
        }
    },

    async register() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (!name || !email || !password || !passwordConfirm) {
            App.UI.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            App.UI.showNotification('Пароли не совпадают', 'error');
            return;
        }

        try {
            App.UI.showLoader();
            const [firstName, ...lastNameParts] = name.split(' ');
            const lastName = lastNameParts.join(' ');

            const response = await API.register({
                email,
                password,
                firstName,
                lastName
            });

            App.state.currentUser = {
                id: response.user.id,
                email: response.user.email,
                name: `${response.user.firstName} ${response.user.lastName || ''}`.trim(),
                role: response.user.role
            };

            this.updateUIForUser();
            App.closeModal('authModal');
            App.UI.showNotification('Регистрация успешна!', 'success');
            
            // Очищаем форму
            document.getElementById('registerForm').reset();
        } catch (error) {
            App.UI.showNotification(error.message || 'Ошибка при регистрации', 'error');
        } finally {
            App.UI.hideLoader();
        }
    },

    async logout() {
        API.logout();
        App.state.currentUser = null;
        App.state.favorites = [];
        App.state.cart = [];
        this.updateUIForUser();
        App.Cart.updateUI();
        App.Favorites.updateUI();
        App.Router.navigate('home');
        App.UI.showNotification('Вы вышли из аккаунта', 'success');
    },

    updateUIForUser() {
        const loginBtn = document.getElementById('loginBtn');
        const userDisplay = document.getElementById('userDisplay');
        const logoutBtn = document.getElementById('logoutBtn');
        const ordersBtn = document.getElementById('ordersBtn');
        const adminBtn = document.getElementById('adminBtn');

        if (App.state.currentUser) {
            userDisplay.textContent = App.state.currentUser.name;
            logoutBtn.style.display = 'inline-flex';
            ordersBtn.style.display = 'inline-flex';
            
            if (App.state.currentUser.role === 'admin') {
                adminBtn.style.display = 'inline-flex';
            } else {
                adminBtn.style.display = 'none';
            }
        } else {
            userDisplay.textContent = 'Войти';
            logoutBtn.style.display = 'none';
            ordersBtn.style.display = 'none';
            adminBtn.style.display = 'none';
        }
    },

    switchTab(tab) {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');

        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));

        if (tab === 'login') {
            tabs[0].classList.add('active');
            document.getElementById('loginForm').classList.add('active');
        } else {
            tabs[1].classList.add('active');
            document.getElementById('registerForm').classList.add('active');
        }
    },

    fillDemo(type) {
        if (type === 'user') {
            document.getElementById('loginEmail').value = 'user@example.com';
            document.getElementById('loginPassword').value = 'password123';
        } else if (type === 'admin') {
            document.getElementById('loginEmail').value = 'admin@mustore.ru';
            document.getElementById('loginPassword').value = 'admin123';
        }
    }
};

// ====================================
// Модуль корзины
// ====================================

App.Cart = {
    async init() {
        await this.loadCart();
        document.getElementById('cartBtn').addEventListener('click', () => {
            App.openModal('cartModal');
            this.renderCart();
        });
    },

    async clearCart() {
        if (!confirm('Вы уверены, что хотите очистить корзину?')) {
            return;
        }
        
        try {
            App.UI.showLoader();
            await API.clearCart();
            await this.loadCart();
            App.UI.showNotification('Корзина очищена', 'success');
            
            // Если мы на странице корзины, обновляем её
            const currentHash = window.location.hash.slice(1) || 'home';
            if (currentHash === 'cart') {
                App.Pages.showCart();
            }
            
            // Если модальное окно корзины открыто, обновляем его
            const cartModal = document.getElementById('cartModal');
            if (cartModal.style.display === 'flex') {
                this.renderCart();
            }
        } catch (error) {
            App.UI.showNotification('Ошибка при очистке корзины', 'error');
            console.error('Clear cart error:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async loadCart() {
        try {
            const cartData = await API.getCart();
            App.state.cart = cartData.items || [];
            this.updateUI();
        } catch (error) {
            console.error('Error loading cart:', error);
            App.state.cart = [];
            this.updateUI();
        }
    },

    async addItem(product) {
        try {
            App.UI.showLoader();
            await API.addToCart(product.id);
            await this.loadCart();
            App.UI.showNotification('Товар добавлен в корзину', 'success');
        } catch (error) {
            App.UI.showNotification(error.message || 'Ошибка при добавлении в корзину', 'error');
        } finally {
            App.UI.hideLoader();
        }
    },

    async removeItem(cartItemId) {
        try {
            await API.removeFromCart(cartItemId);
            await this.loadCart();
            this.renderCart();
            App.UI.showNotification('Товар удален из корзины', 'success');
        } catch (error) {
            App.UI.showNotification(error.message || 'Ошибка при удалении из корзины', 'error');
        }
    },

    async updateQuantity(cartItemId, quantity) {
        try {
            if (quantity <= 0) {
                await this.removeItem(cartItemId);
            } else {
                await API.updateCartItem(cartItemId, quantity);
                await this.loadCart();
                this.renderCart();
            }
        } catch (error) {
            App.UI.showNotification(error.message || 'Ошибка при обновлении количества', 'error');
        }
    },

    getTotal() {
        return App.state.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    },

    getCount() {
        return App.state.cart.reduce((sum, item) => sum + item.quantity, 0);
    },

    updateUI() {
        const cartCount = document.getElementById('cartCount');
        const cartTotal = document.getElementById('cartTotal');
        
        const count = this.getCount();
        const total = this.getTotal();
        
        cartCount.textContent = count;
        cartTotal.textContent = App.UI.formatPrice(total);
    },

    renderCart() {
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.getElementById('cartSummary');
        
        if (App.state.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Корзина пуста</p>
                    <button class="btn btn-primary" onclick="App.closeModal('cartModal')">
                        Перейти к покупкам
                    </button>
                </div>
            `;
            cartSummary.style.display = 'none';
        } else {
            cartItems.innerHTML = App.state.cart.map(item => `
                <div class="cart-item">
                    <img src="${API.getProductImageUrl(item.image_url)}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-brand">${item.brand_name || ''}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-price">${App.UI.formatPrice(item.price * item.quantity)}</div>
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="App.Cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="App.Cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                        <button class="btn btn-icon" onclick="App.Cart.removeItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            cartSummary.style.display = 'block';
            document.getElementById('cartItemsCount').textContent = this.getCount();
            document.getElementById('cartTotalModal').textContent = App.UI.formatPrice(this.getTotal());
        }
    },
};

// ====================================
// Модуль избранного
// ====================================

App.Favorites = {
    async init() {
        if (App.state.currentUser) {
            await this.loadFavorites();
        }
        
        document.getElementById('favoritesBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (!App.state.currentUser) {
                App.openModal('authModal');
            } else {
                App.Router.navigate('favorites');
            }
        });
    },

    async loadFavorites() {
        if (!App.state.currentUser) return;
        
        try {
            const favorites = await API.getFavorites();
            App.state.favorites = favorites.map(f => f.id);
            this.updateUI();
        } catch (error) {
            console.error('Error loading favorites:', error);
            App.state.favorites = [];
            this.updateUI();
        }
    },

    async toggle(productId) {
        if (!App.state.currentUser) {
            App.openModal('authModal');
            return;
        }

        try {
            const isFavorite = this.isFavorite(productId);
            
            if (isFavorite) {
                await API.removeFromFavorites(productId);
                App.state.favorites = App.state.favorites.filter(id => id !== productId);
                App.UI.showNotification('Удалено из избранного', 'success');
            } else {
                await API.addToFavorites(productId);
                App.state.favorites.push(productId);
                App.UI.showNotification('Добавлено в избранное', 'success');
            }
            
            this.updateUI();
        } catch (error) {
            App.UI.showNotification(error.message || 'Ошибка при работе с избранным', 'error');
        }
    },

    isFavorite(productId) {
        return App.state.favorites.includes(productId);
    },

    updateUI() {
        document.getElementById('favoritesCount').textContent = App.state.favorites.length;
    }
};

// ====================================
// Модуль пользовательского интерфейса
// ====================================

App.UI = {
    init() {
        // Обработчик поиска
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const searchQuery = document.getElementById('searchInput').value.trim();
            if (searchQuery) {
                App.state.filters.search = searchQuery;
                App.Router.navigate('search');
            }
        });

        // Закрытие модальных окон при клике вне них
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    },

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    },

    showLoader() {
        document.getElementById('loader').style.display = 'block';
    },

    hideLoader() {
        document.getElementById('loader').style.display = 'none';
    },

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    },

    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = items.map((item, index) => {
            if (index === items.length - 1) {
                return `<span>${item.text}</span>`;
            }
            return `<a href="#" data-link="${item.link}">${item.text}</a> <span>/</span>`;
        }).join(' ');
    },

    // Обработка ошибок при загрузке изображений
    handleImageError(img) {
        img.src = '/images/placeholder.jpg';
        img.onerror = null; // Предотвращаем бесконечный цикл
    }
};

// ====================================
// Модуль страниц
// ====================================

App.Pages = {
    async showHome() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' }
        ]);

        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            
            // Загружаем категории
            const categories = await API.getCategories();
            
            content.innerHTML = `
                <section class="categories-section">
                    <h2 class="section-title">Категории товаров</h2>
                    <div class="categories-grid">
                        ${categories.map(category => `
                            <a href="#" class="category-card" data-link="category/${category.slug}">
                                <div class="category-icon">${category.icon || '🎵'}</div>
                                <div class="category-name">${category.name}</div>
                            </a>
                        `).join('')}
                    </div>
                </section>

                <section class="products-section">
                    <div class="section-header">
                        <h2 class="section-title">Рекомендуемые товары</h2>
                    </div>
                    <div class="products-grid" id="featuredProducts">
                        <div class="text-center"><div class="loader-spinner"></div></div>
                    </div>
                </section>

                <section class="products-section">
                    <div class="section-header">
                        <h2 class="section-title">Новинки</h2>
                    </div>
                    <div class="products-grid" id="newProducts">
                        <div class="text-center"><div class="loader-spinner"></div></div>
                    </div>
                </section>
            `;

            // Загружаем рекомендуемые товары
            try {
                const featuredResponse = await API.getProducts({ featured: 'true', limit: 4 });
                document.getElementById('featuredProducts').innerHTML = 
                    featuredResponse.products.map(p => this.renderProductCard(p)).join('');
            } catch (error) {
                document.getElementById('featuredProducts').innerHTML = '<p class="text-center">Ошибка загрузки товаров</p>';
            }

            // Загружаем новинки
            try {
                const newResponse = await API.getProducts({ isNew: 'true', limit: 4 });
                document.getElementById('newProducts').innerHTML = 
                    newResponse.products.map(p => this.renderProductCard(p)).join('');
            } catch (error) {
                document.getElementById('newProducts').innerHTML = '<p class="text-center">Ошибка загрузки товаров</p>';
            }
                
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки данных</p>';
            console.error('Error loading home page:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async showCheckout() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Корзина', link: 'cart' },
            { text: 'Оформление заказа', link: 'checkout' }
        ]);

        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            
            // Загружаем корзину
            const cartData = await API.getCart();
            
            if (!cartData.items || cartData.items.length === 0) {
                content.innerHTML = `
                    <div class="text-center">
                        <h1>Корзина пуста</h1>
                        <p>Добавьте товары в корзину, чтобы оформить заказ</p>
                        <button class="btn btn-primary" onclick="App.Router.navigate('home')">
                            Перейти к покупкам
                        </button>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <h1>Оформление заказа</h1>
                <div class="checkout-container">
                    <div class="checkout-form">
                        <form id="orderForm">
                            <h2>Контактная информация</h2>
                            <div class="form-group">
                                <label for="customerName">Имя и фамилия *</label>
                                <input type="text" id="customerName" class="form-control" required 
                                    value="${App.state.currentUser ? App.state.currentUser.name : ''}">
                            </div>
                            <div class="form-group">
                                <label for="customerEmail">Email *</label>
                                <input type="email" id="customerEmail" class="form-control" required
                                    value="${App.state.currentUser ? App.state.currentUser.email : ''}">
                            </div>
                            <div class="form-group">
                                <label for="customerPhone">Телефон *</label>
                                <input type="tel" id="customerPhone" class="form-control" required
                                    placeholder="+7 (___) ___-__-__">
                            </div>

                            <h2>Способ получения</h2>
                            <div class="form-group">
                                <label class="radio-label">
                                    <input type="radio" name="deliveryMethod" value="pickup" checked>
                                    Самовывоз (бесплатно)
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="deliveryMethod" value="delivery">
                                    Доставка по городу (300₽)
                                </label>
                            </div>
                            
                            <div class="form-group" id="deliveryAddressGroup" style="display: none;">
                                <label for="deliveryAddress">Адрес доставки</label>
                                <textarea id="deliveryAddress" class="form-control" rows="3" 
                                        placeholder="Улица, дом, квартира"></textarea>
                            </div>

                            <h2>Способ оплаты</h2>
                            <div class="form-group">
                                <label class="radio-label">
                                    <input type="radio" name="paymentMethod" value="cash" checked>
                                    Наличными при получении
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="paymentMethod" value="card">
                                    Картой при получении
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="paymentMethod" value="online">
                                    Онлайн оплата
                                </label>
                            </div>

                            <div class="form-group">
                                <label for="orderNotes">Комментарий к заказу</label>
                                <textarea id="orderNotes" class="form-control" rows="3" 
                                        placeholder="Дополнительная информация"></textarea>
                            </div>

                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 20px;">
                                Оформить заказ
                            </button>
                        </form>
                    </div>

                    <div class="checkout-summary">
                        <h3>Ваш заказ</h3>
                        <div class="order-items">
                            ${cartData.items.map(item => `
                                <div class="order-item">
                                    <span>${item.name} × ${item.quantity}</span>
                                    <span>${App.UI.formatPrice(item.price * item.quantity)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-totals">
                            <div class="total-row">
                                <span>Товары:</span>
                                <span>${App.UI.formatPrice(cartData.summary.subtotal)}</span>
                            </div>
                            <div class="total-row">
                                <span>Доставка:</span>
                                <span id="deliveryPrice">${cartData.summary.delivery > 0 ? App.UI.formatPrice(cartData.summary.delivery) : 'Бесплатно'}</span>
                            </div>
                            <div class="total-row total">
                                <span>Итого:</span>
                                <span id="totalPrice">${App.UI.formatPrice(cartData.summary.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Обработчики для формы
            this.initCheckoutForm(cartData);
            
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки страницы оформления заказа</p>';
            console.error('Error loading checkout:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    initCheckoutForm(cartData) {
        const form = document.getElementById('orderForm');
        const deliveryRadios = document.querySelectorAll('input[name="deliveryMethod"]');
        const addressGroup = document.getElementById('deliveryAddressGroup');
        
        // Показать/скрыть поле адреса
        deliveryRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'delivery') {
                    addressGroup.style.display = 'block';
                    document.getElementById('deliveryAddress').required = true;
                } else {
                    addressGroup.style.display = 'none';
                    document.getElementById('deliveryAddress').required = false;
                }
                this.updateOrderSummary(cartData);
            });
        });

        // Обработка отправки формы
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitOrder(cartData);
        });
    },

    updateOrderSummary(cartData) {
        const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked').value;
        const deliveryPrice = deliveryMethod === 'delivery' ? 300 : 0;
        const total = cartData.summary.subtotal + deliveryPrice;
        
        document.getElementById('deliveryPrice').textContent = 
            deliveryPrice > 0 ? App.UI.formatPrice(deliveryPrice) : 'Бесплатно';
        document.getElementById('totalPrice').textContent = App.UI.formatPrice(total);
    },

    getStatusText(status){
            const statusTexts = {
            'pending': 'В ожидании',
            'processing': 'В обработке',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменен'
        };
        return statusTexts[status] || status;
    },

    getPaymentText(paymentMethod){
        const paymentTexts = {
            'cash': 'Наличные',
            'card': 'Банковская карта',
            'online': 'Онлайн оплата'
        };
        return paymentTexts[paymentMethod] || paymentMethod;
    },

    async updateOrderStatus(orderId, newStatus){
        if (!newStatus) return;
        
        try {
            App.UI.showLoader();
            await API.updateOrderStatus(orderId, { status: newStatus });
            
            // Перезагружаем страницу админа
            this.showAdmin();
            App.UI.showNotification('Статус заказа обновлен', 'success');
        } catch (error) {
            App.UI.showNotification('Ошибка при обновлении статуса заказа', 'error');
            console.error('Error updating order status:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async submitOrder(cartData) {
        try {
            App.UI.showLoader();
            
            const orderData = {
                customerName: document.getElementById('customerName').value,
                customerEmail: document.getElementById('customerEmail').value,
                customerPhone: document.getElementById('customerPhone').value,
                deliveryMethod: document.querySelector('input[name="deliveryMethod"]:checked').value,
                deliveryAddress: document.getElementById('deliveryAddress').value || null,
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
                notes: document.getElementById('orderNotes').value || null
            };

            // Создаем заказ через API
            const order = await API.createOrder(orderData);
            
            // Обновляем корзину
            await App.Cart.loadCart();
            
            // Показываем страницу успеха
            this.showOrderSuccess({
                orderNumber: order.order.orderNumber,
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                orderId: order.order.id
            });
            
        } catch (error) {
            App.UI.showNotification('Ошибка при оформлении заказа: ' + error.message, 'error');
            console.error('Order submission error:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    showOrderSuccess(orderData) {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="order-success">
                <i class="fas fa-check-circle"></i>
                <h1>Заказ успешно оформлен!</h1>
                <p>Номер заказа: <strong>${orderData.orderNumber}</strong></p>
                <p>Спасибо за покупку, ${orderData.customerName}!</p>
                <p>Информация о заказе отправлена на ${orderData.customerEmail}</p>
                <p>Мы свяжемся с вами в ближайшее время для подтверждения заказа.</p>
                <button class="btn btn-primary" onclick="App.Router.navigate('home')" style="margin-top: 30px;">
                    Вернуться к покупкам
                </button>
            </div>
        `;
    },

    async showCart() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Корзина', link: 'cart' }
        ]);

        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            const cartData = await API.getCart();
            
            if (!cartData.items || cartData.items.length === 0) {
                content.innerHTML = `
                    <div class="text-center">
                        <h1>Корзина пуста</h1>
                        <i class="fas fa-shopping-cart" style="font-size: 64px; color: #ccc; margin: 40px 0;"></i>
                        <p>Добавьте товары в корзину, чтобы продолжить покупки</p>
                        <button class="btn btn-primary" onclick="App.Router.navigate('home')">
                            Перейти к покупкам
                        </button>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <h1>Корзина</h1>
                <div class="cart-page">
                    <div class="cart-items-list">
                        ${cartData.items.map(item => `
                            <div class="cart-item-full">
                                <img src="${API.getProductImageUrl(item.image_url)}" alt="${item.name}" class="cart-item-image">
                                <div class="cart-item-details">
                                    <h3>${item.name}</h3>
                                    <p class="cart-item-brand">${item.brand_name || ''}</p>
                                    <p class="cart-item-sku">Артикул: ${item.sku}</p>
                                </div>
                                <div class="cart-item-controls">
                                    <div class="quantity-controls">
                                        <button class="quantity-btn" onclick="App.Cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                                        <span class="quantity-value">${item.quantity}</span>
                                        <button class="quantity-btn" onclick="App.Cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                                    </div>
                                    <div class="cart-item-price">${App.UI.formatPrice(item.price * item.quantity)}</div>
                                    <button class="btn btn-icon" onclick="App.Cart.removeItem('${item.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="cart-summary-page">
                        <h3>Итого</h3>
                        <div class="summary-row">
                            <span>Товаров: ${cartData.summary.totalQuantity}</span>
                        </div>
                        <div class="summary-row">
                            <span>Сумма: ${App.UI.formatPrice(cartData.summary.subtotal)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Доставка: ${cartData.summary.delivery > 0 ? App.UI.formatPrice(cartData.summary.delivery) : 'Бесплатно'}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Итого: ${App.UI.formatPrice(cartData.summary.total)}</span>
                        </div>
                        <button class="btn btn-primary" onclick="App.Router.navigate('checkout')" style="width: 100%; margin-top: 20px;">
                            Оформить заказ
                        </button>
                        <button class="btn btn-secondary" onclick="App.Cart.clearCart()" style="width: 100%; margin-top: 10px;">
                            Очистить корзину
                        </button>
                    </div>
                </div>
            `;
            
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки корзины</p>';
            console.error('Error loading cart page:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async showFavorites() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Избранное', link: 'favorites' }
        ]);

        if (!App.state.currentUser) {
            const content = document.getElementById('app-content');
            content.innerHTML = `
                <div class="text-center">
                    <h1>Избранное</h1>
                    <p>Войдите в аккаунт, чтобы просмотреть избранные товары</p>
                    <button class="btn btn-primary" onclick="App.openModal('authModal')">
                        Войти в аккаунт
                    </button>
                </div>
            `;
            return;
        }

        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            const favorites = await API.getFavorites();
            
            if (favorites.length === 0) {
                content.innerHTML = `
                    <div class="text-center">
                        <h1>Избранное</h1>
                        <i class="fas fa-heart" style="font-size: 64px; color: #ccc; margin: 40px 0;"></i>
                        <p>У вас пока нет избранных товаров</p>
                        <button class="btn btn-primary" onclick="App.Router.navigate('home')">
                            Перейти к покупкам
                        </button>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <h1>Избранные товары</h1>
                <div class="products-grid">
                    ${favorites.map(product => this.renderProductCard(product)).join('')}
                </div>
            `;
            
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки избранного</p>';
            console.error('Error loading favorites:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async showOrders() {
        console.log('showOrders called');
        
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Мои заказы', link: 'orders' }
        ]);

        if (!App.state.currentUser) {
            console.log('No current user, showing login prompt');
            const content = document.getElementById('app-content');
            content.innerHTML = `
                <div class="text-center">
                    <h1>Мои заказы</h1>
                    <p>Войдите в аккаунт, чтобы просмотреть свои заказы</p>
                    <button class="btn btn-primary" onclick="App.openModal('authModal')">
                        Войти в аккаунт
                    </button>
                </div>
            `;
            return;
        }

        console.log('Current user:', App.state.currentUser);
        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            console.log('Loading orders...');
            
            const orders = await API.getOrders();
            console.log('Orders received:', orders);
            
            if (!orders || orders.length === 0) {
                console.log('No orders found');
                content.innerHTML = `
                    <h1>Мои заказы</h1>
                    <div class="text-center" style="margin-top: 60px;">
                        <i class="fas fa-box" style="font-size: 64px; color: #ccc; margin-bottom: 30px;"></i>
                        <p>У вас пока нет заказов</p>
                        <p>Когда вы сделаете первый заказ, он появится здесь</p>
                        <button class="btn btn-primary" onclick="App.Router.navigate('home')">
                            Перейти к покупкам
                        </button>
                        
                        <!-- Отладочная информация -->
                        <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                            <h3>Отладочная информация:</h3>
                            <p>Пользователь: ${App.state.currentUser.email}</p>
                            <p>ID пользователя: ${App.state.currentUser.id}</p>
                            <p>Токен есть: ${localStorage.getItem('authToken') ? 'Да' : 'Нет'}</p>
                            <button class="btn btn-secondary" onclick="App.Pages.testOrdersAPI()">
                                Тестировать API заказов
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            console.log('Rendering orders:', orders.length);
            content.innerHTML = `
                <h1>Мои заказы</h1>
                <div class="orders-table">
                    ${orders.map(order => {
                        console.log('Rendering order:', order);
                        return `
                            <div class="order-card">
                                <div class="order-header">
                                    <div>
                                        <strong>Заказ №${order.order_number}</strong>
                                        <span class="order-date">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                    <span class="status-badge ${order.status}">
                                        ${this.getStatusText(order.status)}
                                    </span>
                                </div>
                                <div class="order-items-preview">
                                    Товаров: ${order.items ? order.items.length : 0} | 
                                    ${order.items && order.items.length > 0 ? 
                                        order.items.slice(0, 2).map(item => item.product_name).join(', ') : 
                                        'Нет товаров'
                                    }
                                    ${order.items && order.items.length > 2 ? '...' : ''}
                                </div>
                                <div class="order-footer">
                                    <div>
                                        <div>Способ получения: ${order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка'}</div>
                                        <div>Оплата: ${this.getPaymentText(order.payment_method)}</div>
                                    </div>
                                    <div class="order-total">${App.UI.formatPrice(order.total_amount)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading orders:', error);
            content.innerHTML = `
                <div class="text-center">
                    <h1>Мои заказы</h1>
                    <p class="text-center">Ошибка загрузки заказов: ${error.message}</p>
                    
                    <!-- Отладочная информация -->
                    <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                        <h3>Информация об ошибке:</h3>
                        <p>Ошибка: ${error.message}</p>
                        <p>Пользователь: ${App.state.currentUser?.email || 'Не определен'}</p>
                        <p>Токен есть: ${localStorage.getItem('authToken') ? 'Да' : 'Нет'}</p>
                        <button class="btn btn-secondary" onclick="App.Pages.testOrdersAPI()">
                            Тестировать API заказов
                        </button>
                        <button class="btn btn-primary" onclick="App.Pages.showOrders()" style="margin-left: 10px;">
                            Попробовать снова
                        </button>
                    </div>
                </div>
            `;
        } finally {
            App.UI.hideLoader();
        }
    },

    async showCategory(category, subcategory = null) {
        try {
            App.UI.showLoader();
            
            const categoryData = await API.getCategory(category);
            
            const breadcrumbItems = [
                { text: 'Главная', link: 'home' },
                { text: categoryData.name, link: `category/${category}` }
            ];

            if (subcategory && categoryData.subcategories) {
                const sub = categoryData.subcategories.find(s => s.slug === subcategory);
                if (sub) {
                    breadcrumbItems.push({
                        text: sub.name,
                        link: `category/${category}/${subcategory}`
                    });
                }
            }

            App.UI.updateBreadcrumb(breadcrumbItems);

            const content = document.getElementById('app-content');
            
            // Загружаем бренды для фильтров
            const brands = await API.getBrands(category);
            
            content.innerHTML = `
                <div class="filters-container">
                    <aside class="filters-sidebar" id="filtersSidebar">
                        <h3>Фильтры</h3>
                        
                        ${brands.length > 0 ? `
                        <div class="filter-group">
                            <h4>Бренд</h4>
                            <div id="brandFilters">
                                ${brands.map(brand => `
                                    <div class="filter-option">
                                        <input type="checkbox" id="brand_${brand.id}" value="${brand.id}" class="brand-filter">
                                        <label for="brand_${brand.id}">${brand.name}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="filter-group">
                            <h4>Цена</h4>
                            <div class="price-range">
                                <input type="number" id="priceMin" placeholder="От" class="form-control">
                                <span>—</span>
                                <input type="number" id="priceMax" placeholder="До" class="form-control">
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <h4>Наличие</h4>
                            <div class="filter-option">
                                <input type="checkbox" id="inStockFilter">
                                <label for="inStockFilter">Только в наличии</label>
                            </div>
                        </div>
                        
                        <div class="filters-actions">
                            <button class="btn btn-primary" onclick="App.Pages.applyFilters('${category}', '${subcategory || ''}')">
                                Применить
                            </button>
                            <button class="btn btn-secondary" onclick="App.Pages.resetFilters('${category}', '${subcategory || ''}')">
                                Сбросить
                            </button>
                        </div>
                    </aside>
                    
                    <div class="products-content">
                        <div class="section-header">
                            <h1 class="section-title">
                                ${subcategory ? categoryData.subcategories.find(s => s.slug === subcategory)?.name : categoryData.name}
                            </h1>
                        </div>
                        
                        <div class="active-filters" id="activeFilters"></div>
                        
                        <div class="products-grid" id="categoryProducts">
                            <div class="text-center"><div class="loader-spinner"></div></div>
                        </div>
                    </div>
                </div>
            `;

            // Загружаем товары
            const filters = { category };
            if (subcategory) filters.subcategory = subcategory;
            
            const response = await API.getProducts(filters);
            const productsContainer = document.getElementById('categoryProducts');
            
            if (response.products.length === 0) {
                productsContainer.innerHTML = '<p class="text-center">В этой категории пока нет товаров</p>';
            } else {
                productsContainer.innerHTML = response.products.map(p => this.renderProductCard(p)).join('');
            }
        } catch (error) {
            App.UI.showNotification('Категория не найдена', 'error');
            App.Router.navigate('home');
            console.error('Error loading category:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async showAdmin() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Администрирование', link: 'admin' }
        ]);

        if (!App.state.currentUser || App.state.currentUser.role !== 'admin') {
            const content = document.getElementById('app-content');
            content.innerHTML = `
                <div class="text-center">
                    <h1>Доступ запрещен</h1>
                    <p>У вас нет прав для доступа к административной панели</p>
                    <button class="btn btn-primary" onclick="App.Router.navigate('home')">
                        Вернуться на главную
                    </button>
                </div>
            `;
            return;
        }

        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            
            // Загружаем статистику и заказы
            const [stats, ordersResponse] = await Promise.all([
                API.getAdminStats(),
                API.getAdminOrders({ limit: 10 })
            ]);
            
            content.innerHTML = `
                <h1>Административная панель</h1>
                
                <div class="admin-dashboard">
                    <div class="dashboard-card">
                        <i class="fas fa-box"></i>
                        <h3>Заказы</h3>
                        <p>${stats.orders}</p>
                    </div>
                    <div class="dashboard-card">
                        <i class="fas fa-users"></i>
                        <h3>Пользователи</h3>
                        <p>${stats.users}</p>
                    </div>
                    <div class="dashboard-card">
                        <i class="fas fa-music"></i>
                        <h3>Товары</h3>
                        <p>${stats.products}</p>
                    </div>
                    <div class="dashboard-card">
                        <i class="fas fa-chart-line"></i>
                        <h3>Продажи</h3>
                        <p>${App.UI.formatPrice(stats.totalSales)}</p>
                    </div>
                </div>

                <div class="admin-section">
                    <h2>Последние заказы</h2>
                    ${ordersResponse.orders && ordersResponse.orders.length > 0 ? `
                        <div class="admin-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>№ заказа</th>
                                        <th>Клиент</th>
                                        <th>Дата</th>
                                        <th>Сумма</th>
                                        <th>Статус</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${ordersResponse.orders.map(order => `
                                        <tr>
                                            <td>${order.order_number}</td>
                                            <td>
                                                ${order.customer_name}<br>
                                                <small style="color: #666;">${order.customer_email}</small>
                                            </td>
                                            <td>${new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
                                            <td>${App.UI.formatPrice(order.total_amount)}</td>
                                            <td>
                                                <span class="status-badge ${order.status}">
                                                    ${this.getStatusText(order.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <select onchange="App.Pages.updateOrderStatus('${order.id}', this.value)" class="form-control" style="font-size: 12px;">
                                                    <option value="">Изменить статус</option>
                                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>В ожидании</option>
                                                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                                                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                                                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                                                </select>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <p class="text-center">Пока нет заказов</p>
                    `}
                </div>
            `;
            
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки административной панели</p>';
            console.error('Error loading admin panel:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async showSale() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Распродажа', link: 'sale' }
        ]);

        const content = document.getElementById('app-content');
        
        try {
            App.UI.showLoader();
            
            // Загружаем товары со скидкой (у которых есть old_price)
            const response = await API.getProducts({ limit: 20 });
            const saleProducts = response.products.filter(p => p.old_price && p.old_price > p.price);
            
            content.innerHTML = `
                <div class="section-header">
                    <h1 class="section-title">🔥 Распродажа</h1>
                </div>
                
                ${saleProducts.length > 0 ? `
                    <div class="products-grid">
                        ${saleProducts.map(p => this.renderProductCard(p)).join('')}
                    </div>
                ` : `
                    <div class="text-center" style="margin-top: 60px;">
                        <i class="fas fa-tags" style="font-size: 64px; color: #ccc; margin-bottom: 30px;"></i>
                        <h2>Скоро появятся новые скидки!</h2>
                        <p>Следите за обновлениями, чтобы не пропустить выгодные предложения</p>
                        <button class="btn btn-primary" onclick="App.Router.navigate('home')">
                            Перейти к каталогу
                        </button>
                    </div>
                `}
            `;
            
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки страницы распродажи</p>';
            console.error('Error loading sale page:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    async applyFilters(category, subcategory) {
        try {
            App.UI.showLoader();
            
            const filters = { category };
            if (subcategory) filters.subcategory = subcategory;
            
            // Brand filters
            const brandFilters = document.querySelectorAll('.brand-filter:checked');
            if (brandFilters.length > 0) {
                filters.brands = Array.from(brandFilters).map(input => input.value).join(',');
            }
            
            // Price filters
            const priceMin = document.getElementById('priceMin').value;
            const priceMax = document.getElementById('priceMax').value;
            if (priceMin) filters.priceMin = priceMin;
            if (priceMax) filters.priceMax = priceMax;
            
            // Stock filter
            if (document.getElementById('inStockFilter').checked) {
                filters.inStock = 'true';
            }
            
            const response = await API.getProducts(filters);
            const productsContainer = document.getElementById('categoryProducts');
            
            if (response.products.length === 0) {
                productsContainer.innerHTML = '<p class="text-center">Товары не найдены</p>';
            } else {
                productsContainer.innerHTML = response.products.map(p => this.renderProductCard(p)).join('');
            }
        } catch (error) {
            App.UI.showNotification('Ошибка при применении фильтров', 'error');
        } finally {
            App.UI.hideLoader();
        }
    },

    async resetFilters(category, subcategory) {
        // Сброс формы фильтров
        document.querySelectorAll('.brand-filter').forEach(input => input.checked = false);
        document.getElementById('priceMin').value = '';
        document.getElementById('priceMax').value = '';
        document.getElementById('inStockFilter').checked = false;
        
        // Применение сброшенных фильтров
        this.applyFilters(category, subcategory);
    },

    async showProduct(productId) {
        try {
            App.UI.showLoader();
            const product = await API.getProduct(productId);
            
            const modalTitle = document.getElementById('productModalTitle');
            const modalContent = document.getElementById('productModalContent');
            
            modalTitle.textContent = product.name;
            
            // Получаем похожие товары
            let similarProducts = [];
            try {
                similarProducts = await API.getSimilarProducts(product.id);
            } catch (error) {
                console.error('Error loading similar products:', error);
            }
            
            modalContent.innerHTML = `
                <div class="product-detail">
                    <div class="product-gallery">
                        <img src="${API.getProductImageUrl(product.images[0]?.image_url)}" 
                             alt="${product.name}" class="product-main-image" id="mainImage"
                             onerror="App.UI.handleImageError(this)">
                        ${product.images.length > 1 ? `
                        <div class="product-thumbnails">
                            ${product.images.map((img, index) => `
                                <img src="${API.getProductImageUrl(img.thumbnail_url || img.image_url)}" 
                                     alt="${product.name}" 
                                     class="product-thumbnail ${index === 0 ? 'active' : ''}" 
                                     onclick="App.Pages.changeProductImage('${API.getProductImageUrl(img.image_url)}', this)"
                                     onerror="App.UI.handleImageError(this)">
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="product-details">
                        <h1>${product.name}</h1>
                        <div class="product-meta">
                            <span><strong>Бренд:</strong> ${product.brand_name}</span>
                            <span><strong>Артикул:</strong> ${product.sku}</span>
                            <span class="${product.stock_quantity > 0 ? 'text-success' : 'text-danger'}">
                                ${product.stock_quantity > 0 ? '✓ В наличии' : '✗ Нет в наличии'}
                            </span>
                        </div>
                        
                        <div class="product-price-large">
                            ${product.old_price ? `
                                <span class="price-old">${App.UI.formatPrice(product.old_price)}</span>
                            ` : ''}
                            ${App.UI.formatPrice(product.price)}
                        </div>
                        
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="App.Cart.addItem({
                                id: '${product.id}',
                                name: '${product.name.replace(/'/g, "\\'")}',
                                brand: '${product.brand_name}',
                                price: ${product.price},
                                image: '${API.getProductImageUrl(product.images[0]?.image_url)}'
                            })" ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> Добавить в корзину
                            </button>
                            <button class="btn btn-icon ${App.Favorites.isFavorite(product.id) ? 'active' : ''}" 
                                    onclick="App.Favorites.toggle('${product.id}'); this.classList.toggle('active')"
                                    id="favoriteBtn">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        
                        <div class="product-features">
                            <h3>Особенности</h3>
                            <ul>
                                <li>Высокое качество материалов</li>
                                <li>Профессиональное звучание</li>
                                <li>Гарантия производителя</li>
                                <li>Бесплатная доставка при заказе от 5000₽</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="product-description">
                    <h3>Описание</h3>
                    <p>${product.description}</p>
                </div>
                
                ${product.specifications ? `
                    <div class="product-specs">
                        <h3>Характеристики</h3>
                        <table>
                            ${Object.entries(product.specifications).map(([key, value]) => `
                                <tr>
                                    <th>${key}</th>
                                    <td>${value}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                ` : ''}
                
                ${similarProducts.length > 0 ? `
                    <div class="similar-products">
                        <h3>Похожие товары</h3>
                        <div class="products-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
                            ${similarProducts.map(p => this.renderProductCard(p)).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            
            App.openModal('productModal');
        } catch (error) {
            App.UI.showNotification('Ошибка при загрузке товара', 'error');
            console.error('Error loading product:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    changeProductImage(imageUrl, thumbnail) {
        document.getElementById('mainImage').src = imageUrl;
        
        // Обновляем активный thumbnail
        document.querySelectorAll('.product-thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });
        thumbnail.classList.add('active');
    },

    renderProductCard(product) {
        const discount = product.old_price ? 
            Math.round((1 - product.price / product.old_price) * 100) : 0;
        
        const primaryImage = product.primary_image || 
                           (product.images && product.images[0]?.image_url) || 
                           '';
        
        return `
            <div class="product-card" onclick="App.Pages.showProduct('${product.id}')">
                ${product.is_new ? '<span class="product-badge">Новинка</span>' : ''}
                ${discount > 0 ? `<span class="product-badge sale">-${discount}%</span>` : ''}
                <img src="${API.getProductImageUrl(primaryImage)}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="App.UI.handleImageError(this)">
                <div class="product-info">
                    <div class="product-brand">${product.brand_name || ''}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">
                        <span class="price-current">${App.UI.formatPrice(product.price)}</span>
                        ${product.old_price ? `<span class="price-old">${App.UI.formatPrice(product.old_price)}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary" 
                                onclick="event.stopPropagation(); App.Cart.addItem({
                                    id: '${product.id}',
                                    name: '${product.name.replace(/'/g, "\\'")}',
                                    brand: '${product.brand_name}',
                                    price: ${product.price},
                                    image: '${API.getProductImageUrl(primaryImage)}'
                                })"
                                ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> 
                            ${product.stock_quantity > 0 ? 'В корзину' : 'Нет в наличии'}
                        </button>
                        <button class="btn btn-icon ${App.Favorites.isFavorite(product.id) ? 'active' : ''}" 
                                onclick="event.stopPropagation(); App.Favorites.toggle('${product.id}'); this.classList.toggle('active')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async showSearch() {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: 'Поиск', link: 'search' }
        ]);

        const content = document.getElementById('app-content');
        const searchQuery = App.state.filters.search;

        if (!searchQuery) {
            content.innerHTML = `
                <div class="text-center">
                    <h1>Поиск</h1>
                    <p>Введите запрос в строку поиска</p>
                </div>
            `;
            return;
        }

        try {
            App.UI.showLoader();
            
            content.innerHTML = `
                <h1>Результаты поиска: "${searchQuery}"</h1>
                <div class="products-grid" id="searchResults">
                    <div class="text-center"><div class="loader-spinner"></div></div>
                </div>
            `;

            const response = await API.getProducts({ search: searchQuery });
            const resultsContainer = document.getElementById('searchResults');
            
            if (response.products.length === 0) {
                resultsContainer.innerHTML = '<p class="text-center">По вашему запросу ничего не найдено</p>';
            } else {
                resultsContainer.innerHTML = response.products.map(p => this.renderProductCard(p)).join('');
            }
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка поиска</p>';
            console.error('Error in search:', error);
        } finally {
            App.UI.hideLoader();
        }
    },

    showInfo(page) {
        App.UI.updateBreadcrumb([
            { text: 'Главная', link: 'home' },
            { text: this.getInfoPageTitle(page), link: page }
        ]);

        const content = document.getElementById('app-content');
        content.innerHTML = this.getInfoPageContent(page);
    },

    getInfoPageTitle(page) {
        const titles = {
            'about': 'О нас',
            'delivery': 'Доставка и оплата',
            'returns': 'Возврат и обмен',
            'warranty': 'Гарантия',
            'service': 'Сервисный центр',
            'advantages': 'Наши преимущества',
            'reviews': 'Отзывы клиентов',
            'careers': 'Вакансии'
        };
        return titles[page] || 'Информация';
    },

    getInfoPageContent(page) {
        const content = {
            'about': `
                <div class="info-page">
                    <h1>О нас</h1>
                    <p>MuStore - это ведущий магазин музыкальных инструментов в Нижнем Новгороде. Мы работаем на рынке уже более 10 лет и предлагаем широкий ассортимент качественных инструментов для музыкантов любого уровня.</p>
                    <h2>Наша миссия</h2>
                    <p>Мы стремимся сделать музыку доступной для каждого, предлагая инструменты высокого качества по доступным ценам.</p>
                    <h2>Почему выбирают нас</h2>
                    <ul>
                        <li>Широкий ассортимент инструментов</li>
                        <li>Консультации профессиональных музыкантов</li>
                        <li>Гарантия на все товары</li>
                        <li>Быстрая доставка</li>
                        <li>Сервисное обслуживание</li>
                    </ul>
                </div>
            `,
            'delivery': `
                <div class="info-page">
                    <h1>Доставка и оплата</h1>
                    <h2>Способы доставки</h2>
                    <ul>
                        <li><strong>Самовывоз</strong> - бесплатно из нашего магазина</li>
                        <li><strong>Доставка по городу</strong> - 300₽ (бесплатно при заказе от 5000₽)</li>
                        <li><strong>Доставка по России</strong> - стоимость рассчитывается индивидуально</li>
                    </ul>
                    <h2>Способы оплаты</h2>
                    <ul>
                        <li>Наличными при получении</li>
                        <li>Банковской картой при получении</li>
                        <li>Онлайн оплата на сайте</li>
                        <li>Безналичный расчет для юридических лиц</li>
                    </ul>
                </div>
            `,
            'returns': `
                <div class="info-page">
                    <h1>Возврат и обмен</h1>
                    <p>Мы гарантируем возможность возврата или обмена товара в течение 14 дней с момента покупки.</p>
                    <h2>Условия возврата</h2>
                    <ul>
                        <li>Товар должен быть в оригинальной упаковке</li>
                        <li>Отсутствие следов использования</li>
                        <li>Наличие чека или документа об оплате</li>
                        <li>Сохранность всех комплектующих</li>
                    </ul>
                    <p>Возврат денежных средств осуществляется в течение 10 рабочих дней.</p>
                </div>
            `
        };
        
        return content[page] || '<div class="info-page"><h1>Страница не найдена</h1></div>';
    }
};

// ====================================
// Инициализация приложения при загрузке
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем приложение
    App.init();
});