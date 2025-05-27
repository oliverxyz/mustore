
// =============================================
// Обновления для script.js для работы с реальным API
// Замените соответствующие части в оригинальном script.js
// =============================================

// В начале файла подключаем API клиент
const API = window.MuStoreAPI;

// Обновляем модуль App.Auth
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
    updateUIForUser() { /* ... */ },
    switchTab(tab) { /* ... */ },
    fillDemo(type) { /* ... */ }
};

// Обновляем модуль App.Cart
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

// Обновляем модуль App.Favorites
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

// Обновляем методы в App.Pages для работы с API
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

// Обновляем инициализацию приложения
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем приложение
    App.init();
    
    // Проверяем авторизацию при загрузке
    if (localStorage.getItem('authToken')) {
        App.Auth.checkAuth();
    }
});