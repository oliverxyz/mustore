// ====================================
// MuStore - Главный модуль приложения
// ====================================

const API = window.MuStoreAPI;

const App = {
    // Инициализация приложения
    init() {
        // Инициализируем подмодули
        this.Router.init();
        this.Auth.init();
        this.Cart.init();
        this.Favorites.init();
        this.UI.init();
        
        // Загружаем начальную страницу
        this.Router.handleRoute();
    },

    // Глобальное состояние приложения
    state: {
        currentUser: null,
        cart: [],
        favorites: [],
        products: [],
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
        const [routePath, ...params] = hash.split('/');
        
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
            // Проверяем валидность токена
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
        }
    },

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            App.UI.showLoader();
            const response = await API.login(email, password);
            
            App.state.currentUser = {
                id: response.user.id,
                email: response.user.email,
                name: `${response.user.firstName} ${response.user.lastName || ''}`.trim(),
                role: response.user.role
            };

            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(App.state.currentUser));
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(App.state.currentUser));
            }

            this.updateUIForUser();
            App.closeModal('authModal');
            App.UI.showNotification(`Добро пожаловать, ${App.state.currentUser.name}!`, 'success');
            
            // Перенаправление в админку для администраторов
            if (response.user.role === 'admin') {
                App.Router.navigate('admin');
            }

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

            localStorage.setItem('currentUser', JSON.stringify(App.state.currentUser));

            this.updateUIForUser();
            App.closeModal('authModal');
            App.UI.showNotification('Регистрация успешна!', 'success');
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
        this.updateUIForUser();
        App.Router.navigate('home');
        App.UI.showNotification('Вы вышли из аккаунта', 'success');
    },

    // Остальные методы остаются без изменений
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

    async loadCart() {
        try {
            const cartData = await API.getCart();
            App.state.cart = cartData.items.map(item => ({
                id: item.product_id,
                cartItemId: item.id,
                name: item.name,
                brand: item.brand_name,
                price: parseFloat(item.price),
                oldPrice: item.old_price ? parseFloat(item.old_price) : null,
                quantity: item.quantity,
                image: item.image_url || '/images/placeholder.jpg',
                availableQuantity: item.available_quantity
            }));
            this.updateUI();
        } catch (error) {
            console.error('Error loading cart:', error);
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

    // Остальные методы обновляются аналогично
    getTotal() { /* ... */ },
    getCount() { /* ... */ },
    updateUI() { /* ... */ },
    formatPrice(price) { /* ... */ },
    renderCart() { 
        // Обновляем рендеринг с учетом cartItemId
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
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-brand">${item.brand}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-price">${App.UI.formatPrice(item.price * item.quantity)}</div>
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="App.Cart.updateQuantity('${item.cartItemId}', ${item.quantity - 1})">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="App.Cart.updateQuantity('${item.cartItemId}', ${item.quantity + 1})">+</button>
                        </div>
                        <button class="btn btn-icon" onclick="App.Cart.removeItem('${item.cartItemId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            cartSummary.style.display = 'block';
            document.getElementById('cartItemsCount').textContent = this.getCount();
            document.getElementById('cartTotalModal').textContent = App.UI.formatPrice(this.getTotal());
        }
    }
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
            minimumFractionDigits: 0
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
    }
};

// ====================================
// Модуль данных (имитация API)
// ====================================

App.Data = {
    // Категории товаров
    categories: {
        'guitars': {
            name: 'Гитары',
            icon: '🎸',
            subcategories: {
                'acoustic': 'Акустические гитары',
                'electric': 'Электрогитары',
                'bass': 'Бас-гитары',
                'classical': 'Классические гитары'
            }
        },
        'keyboards': {
            name: 'Клавишные',
            icon: '🎹',
            subcategories: {
                'synthesizers': 'Синтезаторы',
                'pianos': 'Цифровые пианино',
                'midi': 'MIDI-клавиатуры'
            }
        },
        'drums': {
            name: 'Ударные',
            icon: '🥁',
            subcategories: {
                'acoustic-drums': 'Акустические ударные',
                'electronic-drums': 'Электронные ударные',
                'percussion': 'Перкуссия'
            }
        },
        'wind': {
            name: 'Духовые',
            icon: '🎺',
            subcategories: {}
        },
        'studio': {
            name: 'Студийное оборудование',
            icon: '🎙️',
            subcategories: {}
        },
        'accessories': {
            name: 'Аксессуары',
            icon: '🎵',
            subcategories: {}
        }
    },

    // Продукты (расширенный список)
    products: [
        {
            id: '1',
            name: 'Yamaha F310',
            brand: 'Yamaha',
            category: 'guitars',
            subcategory: 'acoustic',
            price: 15990,
            oldPrice: 18990,
            image: 'https://images.unsplash.com/photo-1558098329-a11cff621064?w=400',
            description: 'Классическая акустическая гитара для начинающих и опытных музыкантов.',
            specifications: {
                'Тип': 'Дредноут',
                'Верхняя дека': 'Ель',
                'Задняя дека и обечайки': 'Меранти',
                'Гриф': 'Нато',
                'Накладка грифа': 'Палисандр',
                'Количество ладов': '20',
                'Мензура': '634 мм'
            },
            featured: true,
            isNew: false,
            inStock: true
        },
        {
            id: '2',
            name: 'Fender Stratocaster Player',
            brand: 'Fender',
            category: 'guitars',
            subcategory: 'electric',
            price: 89990,
            oldPrice: null,
            image: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=400',
            description: 'Легендарная электрогитара с классическим звучанием Fender.',
            specifications: {
                'Корпус': 'Ольха',
                'Гриф': 'Клён',
                'Накладка грифа': 'Клён',
                'Количество ладов': '22',
                'Звукосниматели': '3x Player Series Alnico 5 Strat Single-Coil',
                'Бридж': 'Tremolo 2-точечный',
                'Цвет': 'Sonic Red'
            },
            featured: true,
            isNew: true,
            inStock: true
        },
        {
            id: '3',
            name: 'Roland FP-30X',
            brand: 'Roland',
            category: 'keyboards',
            subcategory: 'pianos',
            price: 64990,
            oldPrice: 69990,
            image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400',
            description: 'Портативное цифровое пианино с аутентичным звучанием и клавиатурой.',
            specifications: {
                'Клавиатура': '88 клавиш, PHA-4 Standard',
                'Полифония': '256 голосов',
                'Тембры': '56 тембров',
                'Эффекты': 'Ambience, Brilliance',
                'Записывающее устройство': 'SMF',
                'Bluetooth': 'Да (MIDI, Audio)',
                'Выходы': 'Наушники, линейный выход'
            },
            featured: true,
            isNew: false,
            inStock: true
        },
        {
            id: '4',
            name: 'Pearl Export Series',
            brand: 'Pearl',
            category: 'drums',
            subcategory: 'acoustic-drums',
            price: 119990,
            oldPrice: null,
            image: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=400',
            description: 'Профессиональная барабанная установка для сцены и студии.',
            specifications: {
                'Бас-барабан': '22"x18"',
                'Том-томы': '10"x7", 12"x8"',
                'Напольный том': '16"x16"',
                'Малый барабан': '14"x5.5"',
                'Материал': 'Тополь/Красное дерево',
                'Фурнитура': 'Хром',
                'Цвет': 'Jet Black'
            },
            featured: true,
            isNew: true,
            inStock: true
        },
        {
            id: '5',
            name: 'Shure SM58',
            brand: 'Shure',
            category: 'studio',
            price: 8990,
            oldPrice: null,
            image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400',
            description: 'Легендарный вокальный микрофон для сцены и студии.',
            specifications: {
                'Тип': 'Динамический',
                'Диаграмма направленности': 'Кардиоида',
                'Частотный диапазон': '50 - 15000 Гц',
                'Чувствительность': '-54.5 дБВ/Па',
                'Импеданс': '150 Ом',
                'Разъем': 'XLR'
            },
            featured: false,
            isNew: false,
            inStock: true
        },
        {
            id: '6',
            name: 'Gibson Les Paul Standard',
            brand: 'Gibson',
            category: 'guitars',
            subcategory: 'electric',
            price: 249990,
            oldPrice: null,
            image: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=400',
            description: 'Классическая электрогитара с мощным звучанием хамбакеров.',
            specifications: {
                'Корпус': 'Красное дерево',
                'Топ': 'Клён AA',
                'Гриф': 'Красное дерево',
                'Накладка грифа': 'Палисандр',
                'Звукосниматели': 'Burstbucker Pro',
                'Бридж': 'Tune-o-matic',
                'Цвет': 'Bourbon Burst'
            },
            featured: true,
            isNew: false,
            inStock: true
        },
        {
            id: '7',
            name: 'Yamaha YAS-280',
            brand: 'Yamaha',
            category: 'wind',
            price: 89990,
            oldPrice: 94990,
            image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400',
            description: 'Альт-саксофон для учащихся и любителей.',
            specifications: {
                'Строй': 'Eb',
                'Корпус': 'Латунь',
                'Покрытие': 'Золотой лак',
                'Клапаны': 'Улучшенная механика',
                'Мундштук': 'AS-4C',
                'Кейс': 'В комплекте'
            },
            featured: false,
            isNew: false,
            inStock: true
        },
        {
            id: '8',
            name: 'Korg Kronos 2',
            brand: 'Korg',
            category: 'keyboards',
            subcategory: 'synthesizers',
            price: 299990,
            oldPrice: null,
            image: 'https://images.unsplash.com/photo-1563330232-57114bb0823c?w=400',
            description: 'Профессиональная музыкальная рабочая станция.',
            specifications: {
                'Клавиатура': '88 клавиш, RH3',
                'Движки синтеза': '9 типов',
                'Полифония': 'До 400 голосов',
                'Память': '62 ГБ SSD',
                'Секвенсер': '16 треков MIDI + 16 аудио',
                'Дисплей': '8" TouchView'
            },
            featured: true,
            isNew: true,
            inStock: false
        }
    ],

    // Получение товаров с фильтрацией
    async getProducts(filters = {}) {
        // Имитация задержки API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let filtered = [...this.products];
        
        // Фильтр по категории
        if (filters.category) {
            filtered = filtered.filter(p => p.category === filters.category);
        }
        
        // Фильтр по подкатегории
        if (filters.subcategory) {
            filtered = filtered.filter(p => p.subcategory === filters.subcategory);
        }
        
        // Фильтр по бренду
        if (filters.brands && filters.brands.length > 0) {
            filtered = filtered.filter(p => filters.brands.includes(p.brand));
        }
        
        // Фильтр по цене
        if (filters.priceMin) {
            filtered = filtered.filter(p => p.price >= filters.priceMin);
        }
        if (filters.priceMax) {
            filtered = filtered.filter(p => p.price <= filters.priceMax);
        }
        
        // Фильтр по наличию
        if (filters.inStock) {
            filtered = filtered.filter(p => p.inStock);
        }
        
        // Фильтр по рекомендуемым
        if (filters.featured) {
            filtered = filtered.filter(p => p.featured);
        }
        
        // Фильтр по новинкам
        if (filters.isNew) {
            filtered = filtered.filter(p => p.isNew);
        }
        
        // Фильтр по скидкам
        if (filters.sale) {
            filtered = filtered.filter(p => p.oldPrice !== null);
        }
        
        // Поиск
        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(search) ||
                p.brand.toLowerCase().includes(search) ||
                p.description.toLowerCase().includes(search)
            );
        }
        
        return filtered;
    },

    // Получение товара по ID
    async getProduct(id) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.products.find(p => p.id === id);
    },

    // Получение уникальных брендов
    getBrands(category = null) {
        let products = this.products;
        if (category) {
            products = products.filter(p => p.category === category);
        }
        const brands = [...new Set(products.map(p => p.brand))];
        return brands.sort();
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
            const featuredResponse = await API.getProducts({ featured: true, limit: 4 });
            document.getElementById('featuredProducts').innerHTML = 
                featuredResponse.products.map(p => this.renderProductCard(p)).join('');

            // Загружаем новинки
            const newResponse = await API.getProducts({ isNew: true, limit: 4 });
            document.getElementById('newProducts').innerHTML = 
                newResponse.products.map(p => this.renderProductCard(p)).join('');
                
        } catch (error) {
            content.innerHTML = '<p class="text-center">Ошибка загрузки данных</p>';
            console.error('Error loading home page:', error);
        }
    },

    async showCategory(category, subcategory = null) {
        try {
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
                            <button class="btn btn-primary" onclick="App.Pages.applyFilters()">
                                Применить
                            </button>
                            <button class="btn btn-secondary" onclick="App.Pages.resetFilters()">
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
            App.Router.navigate('home');
            console.error('Error loading category:', error);
        }
    },

    async showProduct(productId) {
        try {
            const product = await API.getProduct(productId);
            
            const modalTitle = document.getElementById('productModalTitle');
            const modalContent = document.getElementById('productModalContent');
            
            modalTitle.textContent = product.name;
            
            // Получаем похожие товары
            const similarProducts = await API.getSimilarProducts(product.id);
            
            modalContent.innerHTML = `
                <div class="product-detail">
                    <div class="product-gallery">
                        <img src="${product.images[0]?.image_url || '/images/placeholder.jpg'}" 
                             alt="${product.name}" class="product-main-image" id="mainImage">
                        <div class="product-thumbnails">
                            ${product.images.map((img, index) => `
                                <img src="${img.thumbnail_url || img.image_url}" 
                                     alt="${product.name}" 
                                     class="product-thumbnail ${index === 0 ? 'active' : ''}" 
                                     onclick="App.Pages.changeProductImage('${img.image_url}', this)">
                            `).join('')}
                        </div>
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
                                name: '${product.name}',
                                brand: '${product.brand_name}',
                                price: ${product.price},
                                image: '${product.images[0]?.image_url || '/images/placeholder.jpg'}'
                            })" ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> Добавить в корзину
                            </button>
                            <button class="btn btn-icon ${App.Favorites.isFavorite(product.id) ? 'active' : ''}" 
                                    onclick="App.Favorites.toggle('${product.id}'); this.classList.toggle('active')">
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
        }
    },

    // Обновляем renderProductCard для работы с данными из API
    renderProductCard(product) {
        const discount = product.old_price ? 
            Math.round((1 - product.price / product.old_price) * 100) : 0;
        
        const primaryImage = product.primary_image || 
                           (product.images && product.images[0]?.image_url) || 
                           '/images/placeholder.jpg';
        
        return `
            <div class="product-card" onclick="App.Pages.showProduct('${product.id}')">
                ${product.is_new ? '<span class="product-badge">Новинка</span>' : ''}
                ${discount > 0 ? `<span class="product-badge sale">-${discount}%</span>` : ''}
                <img src="${primaryImage}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-brand">${product.brand_name}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">
                        <span class="price-current">${App.UI.formatPrice(product.price)}</span>
                        ${product.old_price ? `<span class="price-old">${App.UI.formatPrice(product.old_price)}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary" 
                                onclick="event.stopPropagation(); App.Cart.addItem({
                                    id: '${product.id}',
                                    name: '${product.name}',
                                    brand: '${product.brand_name}',
                                    price: ${product.price},
                                    image: '${primaryImage}'
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
    }
};

// ====================================
// Инициализация приложения при загрузке
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем приложение
    App.init();
    
    // Проверяем авторизацию при загрузке
    if (localStorage.getItem('authToken')) {
        App.Auth.checkAuth();
    }
});