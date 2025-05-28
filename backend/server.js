
// =============================================
// MuStore Backend Server
// Node.js + Express + PostgreSQL
// =============================================

const validation = require('./validation');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Загрузка переменных окружения
require('dotenv').config();

// =============================================
// Конфигурация
// =============================================

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = '7d';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(compression());



// Конфигурация базы данных
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mustore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

// Конфигурация загрузки файлов
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', 'products');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены'));
        }
    }
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов
    message: 'Слишком много запросов с этого IP, попробуйте позже'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: 'Слишком много попыток входа, попробуйте позже'
});

app.use('/api/auth/', authLimiter);

app.use(validation.sanitizeRequest);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});


// =============================================
// Middleware
// =============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Middleware для аутентификации
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки роли администратора
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Требуются права администратора' });
    }
    next();
};

// Middleware для получения или создания корзины
const getOrCreateCart = async (req, res, next) => {
    try {
        let cartId;
        
        if (req.user) {
            // Для авторизованных пользователей
            const cartResult = await pool.query(
                'SELECT id FROM carts WHERE user_id = $1',
                [req.user.id]
            );
            
            if (cartResult.rows.length === 0) {
                const newCart = await pool.query(
                    'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
                    [req.user.id]
                );
                cartId = newCart.rows[0].id;
            } else {
                cartId = cartResult.rows[0].id;
            }
        } else {
            // Для гостей - используем session_id из заголовка
            const sessionId = req.headers['x-session-id'];
            
            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID required for guests' });
            }
            
            const cartResult = await pool.query(
                'SELECT id FROM carts WHERE session_id = $1',
                [sessionId]
            );
            
            if (cartResult.rows.length === 0) {
                const newCart = await pool.query(
                    'INSERT INTO carts (session_id) VALUES ($1) RETURNING id',
                    [sessionId]
                );
                cartId = newCart.rows[0].id;
            } else {
                cartId = cartResult.rows[0].id;
            }
        }
        
        req.cartId = cartId;
        next();
    } catch (error) {
        console.error('Error in getOrCreateCart:', error);
        res.status(500).json({ error: 'Ошибка при работе с корзиной' });
    }
};

// =============================================
// API Routes - Аутентификация
// =============================================

// Регистрация
app.post('/api/auth/register', validation.validateRegistration, async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        
        // Проверка существующего пользователя
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        
        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создание пользователя
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, email, first_name, last_name, role`,
            [email, hashedPassword, firstName, lastName, phone]
        );
        
        const user = result.rows[0];
        
        // Создание токена
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Вход
app.post('/api/auth/login', validation.validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Поиск пользователя
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const user = result.rows[0];
        
        // Проверка пароля
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Создание токена
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// Получение текущего пользователя
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const user = result.rows[0];
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            role: user.role
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
    }
});

// =============================================
// API Routes - Категории
// =============================================

// Получение всех категорий
app.get('/api/categories', async (req, res) => {
    try {
        const categoriesResult = await pool.query(`
            SELECT c.*, 
                   COALESCE(json_agg(
                       json_build_object(
                           'id', sc.id,
                           'name', sc.name,
                           'slug', sc.slug
                       ) ORDER BY sc.sort_order
                   ) FILTER (WHERE sc.id IS NOT NULL), '[]') as subcategories
            FROM categories c
            LEFT JOIN subcategories sc ON c.id = sc.category_id AND sc.is_active = true
            WHERE c.is_active = true
            GROUP BY c.id
            ORDER BY c.sort_order
        `);
        
        res.json(categoriesResult.rows);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Ошибка при получении категорий' });
    }
});

// Получение категории по slug
app.get('/api/categories/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        const result = await pool.query(`
            SELECT c.*, 
                   COALESCE(json_agg(
                       json_build_object(
                           'id', sc.id,
                           'name', sc.name,
                           'slug', sc.slug
                       ) ORDER BY sc.sort_order
                   ) FILTER (WHERE sc.id IS NOT NULL), '[]') as subcategories
            FROM categories c
            LEFT JOIN subcategories sc ON c.id = sc.category_id AND sc.is_active = true
            WHERE c.slug = $1 AND c.is_active = true
            GROUP BY c.id
        `, [slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ error: 'Ошибка при получении категории' });
    }
});

// =============================================
// API Routes - Бренды
// =============================================

// Получение всех брендов
app.get('/api/brands', async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = 'SELECT * FROM brands WHERE is_active = true';
        const params = [];
        
        if (category) {
            query = `
                SELECT DISTINCT b.* 
                FROM brands b
                JOIN products p ON b.id = p.brand_id
                JOIN categories c ON p.category_id = c.id
                WHERE b.is_active = true AND c.slug = $1
            `;
            params.push(category);
        }
        
        query += ' ORDER BY name';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Ошибка при получении брендов' });
    }
});

// =============================================
// API Routes - Товары
// =============================================

// Получение товаров с фильтрацией
app.get('/api/products', validation.validateProductFilters, async (req, res) => {
    try {
        const {
            category,
            subcategory,
            brands,
            priceMin,
            priceMax,
            inStock,
            featured,
            isNew,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC',
            limit = 20,
            offset = 0
        } = req.query;
        
        // Подготовка параметров для функции
        const brandIds = brands ? brands.split(',').filter(b => b) : null;
        
        const result = await pool.query(`
            SELECT * FROM get_products_filtered(
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
        `, [
            category || null,
            subcategory || null,
            brandIds,
            priceMin ? parseFloat(priceMin) : null,
            priceMax ? parseFloat(priceMax) : null,
            inStock === 'true' ? true : null,
            featured === 'true' ? true : null,
            isNew === 'true' ? true : null,
            search || null,
            sortBy,
            sortOrder,
            parseInt(limit),
            parseInt(offset)
        ]);
        
        // Получение изображений для товаров
        const productIds = result.rows.map(row => row.product_id);
        const imagesResult = await pool.query(`
            SELECT product_id, image_url, thumbnail_url, is_primary
            FROM product_images
            WHERE product_id = ANY($1)
            ORDER BY is_primary DESC, sort_order
        `, [productIds]);
        
        // Группировка изображений по товарам
        const imagesByProduct = {};
        imagesResult.rows.forEach(img => {
            if (!imagesByProduct[img.product_id]) {
                imagesByProduct[img.product_id] = [];
            }
            imagesByProduct[img.product_id].push(img);
        });
        
        // Формирование результата
        const products = result.rows.map(row => ({
            ...row.product_data,
            images: imagesByProduct[row.product_id] || []
        }));
        
        const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
        
        res.json({
            products,
            pagination: {
                total: parseInt(totalCount),
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Ошибка при получении товаров' });
    }
});

// Получение товара по ID или slug
app.get('/api/products/:identifier', validation.validateProductIdentifier, async (req, res) => {
    try {
        const { identifier } = req.params;
        
        // Определяем, это UUID или slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        const query = `
            SELECT p.*, 
                   b.name as brand_name,
                   c.name as category_name,
                   c.slug as category_slug,
                   sc.name as subcategory_name,
                   sc.slug as subcategory_slug,
                   COALESCE(json_agg(
                       json_build_object(
                           'id', pi.id,
                           'image_url', pi.image_url,
                           'thumbnail_url', pi.thumbnail_url,
                           'alt_text', pi.alt_text,
                           'is_primary', pi.is_primary
                       ) ORDER BY pi.is_primary DESC, pi.sort_order
                   ) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE ${isUUID ? 'p.id' : 'p.slug'} = $1 AND p.is_available = true
            GROUP BY p.id, b.name, c.name, c.slug, sc.name, sc.slug
        `;
        
        const result = await pool.query(query, [identifier]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        // Увеличиваем счетчик просмотров
        await pool.query(
            'UPDATE products SET views_count = views_count + 1 WHERE id = $1',
            [result.rows[0].id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Ошибка при получении товара' });
    }
});

// Получение похожих товаров
app.get('/api/products/:id/similar', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Получаем информацию о товаре
        const productResult = await pool.query(
            'SELECT category_id, subcategory_id, price FROM products WHERE id = $1',
            [id]
        );
        
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const product = productResult.rows[0];
        
        // Получаем похожие товары
        const result = await pool.query(`
            SELECT p.*, 
                   b.name as brand_name,
                   pi.image_url as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN LATERAL (
                SELECT image_url 
                FROM product_images 
                WHERE product_id = p.id AND is_primary = true 
                LIMIT 1
            ) pi ON true
            WHERE p.id != $1 
                AND p.category_id = $2
                AND p.is_available = true
                AND p.price BETWEEN $3 * 0.7 AND $3 * 1.3
            ORDER BY 
                CASE WHEN p.subcategory_id = $4 THEN 0 ELSE 1 END,
                ABS(p.price - $3)
            LIMIT 4
        `, [id, product.category_id, product.price, product.subcategory_id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get similar products error:', error);
        res.status(500).json({ error: 'Ошибка при получении похожих товаров' });
    }
});

// =============================================
// API Routes - Корзина
// =============================================

// Получение корзины
app.get('/api/cart', getOrCreateCart, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ci.id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.slug,
                p.sku,
                p.price,
                p.old_price,
                b.name as brand_name,
                pi.image_url,
                (p.stock_quantity - p.reserved_quantity) as available_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN LATERAL (
                SELECT image_url 
                FROM product_images 
                WHERE product_id = p.id AND is_primary = true 
                LIMIT 1
            ) pi ON true
            WHERE ci.cart_id = $1
            ORDER BY ci.created_at DESC
        `, [req.cartId]);
        
        const items = result.rows;
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        res.json({
            items,
            summary: {
                itemsCount: items.length,
                totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
                subtotal: total,
                delivery: total >= 5000 ? 0 : 300,
                total: total >= 5000 ? total : total + 300
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Ошибка при получении корзины' });
    }
});

// Добавление товара в корзину
app.post('/api/cart/items', validation.validateAddToCart, getOrCreateCart, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        // Проверка наличия товара
        const productResult = await pool.query(
            'SELECT stock_quantity, reserved_quantity FROM products WHERE id = $1 AND is_available = true',
            [productId]
        );
        
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const product = productResult.rows[0];
        const availableQuantity = product.stock_quantity - product.reserved_quantity;
        
        // Проверка существующего товара в корзине
        const existingResult = await pool.query(
            'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [req.cartId, productId]
        );
        
        if (existingResult.rows.length > 0) {
            // Обновляем количество
            const newQuantity = existingResult.rows[0].quantity + quantity;
            
            if (newQuantity > availableQuantity) {
                return res.status(400).json({ error: 'Недостаточно товара на складе' });
            }
            
            await pool.query(
                'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newQuantity, existingResult.rows[0].id]
            );
        } else {
            // Добавляем новый товар
            if (quantity > availableQuantity) {
                return res.status(400).json({ error: 'Недостаточно товара на складе' });
            }
            
            await pool.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
                [req.cartId, productId, quantity]
            );
        }
        
        res.json({ message: 'Товар добавлен в корзину' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Ошибка при добавлении в корзину' });
    }
});

// Обновление количества товара в корзине
app.put('/api/cart/items/:itemId', validation.validateUpdateCartItem, getOrCreateCart, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        
        if (quantity < 1) {
            return res.status(400).json({ error: 'Количество должно быть больше 0' });
        }
        
        // Проверка принадлежности товара к корзине
        const itemResult = await pool.query(
            `SELECT ci.*, p.stock_quantity, p.reserved_quantity 
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.id = $1 AND ci.cart_id = $2`,
            [itemId, req.cartId]
        );
        
        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден в корзине' });
        }
        
        const item = itemResult.rows[0];
        const availableQuantity = item.stock_quantity - item.reserved_quantity;
        
        if (quantity > availableQuantity) {
            return res.status(400).json({ error: 'Недостаточно товара на складе' });
        }
        
        await pool.query(
            'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, itemId]
        );
        
        res.json({ message: 'Количество обновлено' });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении количества' });
    }
});

// Удаление товара из корзины
app.delete('/api/cart/items/:itemId', getOrCreateCart, async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id',
            [itemId, req.cartId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден в корзине' });
        }
        
        res.json({ message: 'Товар удален из корзины' });
    } catch (error) {
        console.error('Delete cart item error:', error);
        res.status(500).json({ error: 'Ошибка при удалении из корзины' });
    }
});

// Очистка корзины
app.delete('/api/cart', getOrCreateCart, async (req, res) => {
    try {
        await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [req.cartId]);
        res.json({ message: 'Корзина очищена' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Ошибка при очистке корзины' });
    }
});

// =============================================
// API Routes - Избранное
// =============================================

// Получение избранного
app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                f.id as favorite_id,
                p.*,
                b.name as brand_name,
                c.name as category_name,
                c.slug as category_slug,
                pi.image_url as primary_image
            FROM favorites f
            JOIN products p ON f.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN LATERAL (
                SELECT image_url 
                FROM product_images 
                WHERE product_id = p.id AND is_primary = true 
                LIMIT 1
            ) pi ON true
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `, [req.user.id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Ошибка при получении избранного' });
    }
});

// Добавление в избранное
app.post('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.body;
        
        // Проверка существования
        const existingResult = await pool.query(
            'SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2',
            [req.user.id, productId]
        );
        
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: 'Товар уже в избранном' });
        }
        
        await pool.query(
            'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)',
            [req.user.id, productId]
        );
        
        res.status(201).json({ message: 'Товар добавлен в избранное' });
    } catch (error) {
        console.error('Add to favorites error:', error);
        res.status(500).json({ error: 'Ошибка при добавлении в избранное' });
    }
});

// Удаление из избранного
app.delete('/api/favorites/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2 RETURNING id',
            [req.user.id, productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден в избранном' });
        }
        
        res.json({ message: 'Товар удален из избранного' });
    } catch (error) {
        console.error('Remove from favorites error:', error);
        res.status(500).json({ error: 'Ошибка при удалении из избранного' });
    }
});

// =============================================
// API Routes - Заказы
// =============================================

// Создание заказа
app.post('/api/orders', validation.validateCreateOrder, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            deliveryMethod,
            paymentMethod,
            notes,
            cartId
        } = req.body;
        
        // Получаем корзину
        let actualCartId = cartId;
        
        // Если пользователь авторизован
        if (req.user) {
            const cartResult = await client.query(
                'SELECT id FROM carts WHERE user_id = $1',
                [req.user.id]
            );
            if (cartResult.rows.length > 0) {
                actualCartId = cartResult.rows[0].id;
            }
        }
        
        // Проверяем товары в корзине
        const cartItemsResult = await client.query(`
            SELECT 
                ci.*,
                p.name,
                p.sku,
                p.price,
                p.stock_quantity,
                p.reserved_quantity,
                b.name as brand_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE ci.cart_id = $1
        `, [actualCartId]);
        
        if (cartItemsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Корзина пуста' });
        }
        
        // Проверяем наличие товаров и резервируем
        let totalAmount = 0;
        for (const item of cartItemsResult.rows) {
            const availableQuantity = item.stock_quantity - item.reserved_quantity;
            if (item.quantity > availableQuantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Недостаточно товара "${item.name}" на складе` 
                });
            }
            
            // Резервируем товар
            await client.query(
                'UPDATE products SET reserved_quantity = reserved_quantity + $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
            
            totalAmount += item.price * item.quantity;
        }
        
        // Расчет доставки
        const deliveryAmount = totalAmount >= 5000 ? 0 : 300;
        totalAmount += deliveryAmount;
        
        // Генерируем номер заказа
        const orderNumberResult = await client.query('SELECT generate_order_number() as order_number');
        const orderNumber = orderNumberResult.rows[0].order_number;
        
        // Создаем заказ
        const orderResult = await client.query(`
            INSERT INTO orders (
                order_number, user_id, status, total_amount, delivery_amount,
                customer_name, customer_email, customer_phone,
                delivery_address, delivery_method, payment_method, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            orderNumber,
            req.user ? req.user.id : null,
            'pending',
            totalAmount,
            deliveryAmount,
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            deliveryMethod,
            paymentMethod,
            notes
        ]);
        
        const order = orderResult.rows[0];
        
        // Создаем элементы заказа
        for (const item of cartItemsResult.rows) {
            await client.query(`
                INSERT INTO order_items (
                    order_id, product_id, product_name, product_sku,
                    product_brand, quantity, price, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                order.id,
                item.product_id,
                item.name,
                item.sku,
                item.brand_name,
                item.quantity,
                item.price,
                item.price * item.quantity
            ]);
        }
        
        // Очищаем корзину
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [actualCartId]);
        
        await client.query('COMMIT');
        
        res.status(201).json({
            order: {
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                totalAmount: order.total_amount,
                createdAt: order.created_at
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Ошибка при создании заказа' });
    } finally {
        client.release();
    }
});

// Получение заказов пользователя
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                o.*,
                COUNT(oi.id) as items_count,
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'product_name', oi.product_name,
                        'product_sku', oi.product_sku,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'subtotal', oi.subtotal
                    )
                ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = $1
        `;
        
        const params = [req.user.id];
        
        if (status) {
            query += ' AND o.status = $2';
            params.push(status);
        }
        
        query += `
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Получаем общее количество
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM orders WHERE user_id = $1' + (status ? ' AND status = $2' : ''),
            status ? [req.user.id, status] : [req.user.id]
        );
        
        res.json({
            orders: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Ошибка при получении заказов' });
    }
});

// Получение заказа по ID
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                o.*,
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', oi.product_name,
                        'product_sku', oi.product_sku,
                        'product_brand', oi.product_brand,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'subtotal', oi.subtotal
                    )
                ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id
        `, [id, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Ошибка при получении заказа' });
    }
});

// =============================================
// API Routes - Административные
// =============================================

// Получение статистики (только для админов)
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = {};
        
        // Общая статистика
        const ordersCount = await pool.query(
            "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'pending') as pending FROM orders"
        );
        stats.orders = ordersCount.rows[0];
        
        const usersCount = await pool.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'customer'"
        );
        stats.users = usersCount.rows[0].total;
        
        const productsCount = await pool.query(
            "SELECT COUNT(*) as total FROM products WHERE is_available = true"
        );
        stats.products = productsCount.rows[0].total;
        
        // Выручка за текущий месяц
        const revenueResult = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) as revenue
            FROM orders
            WHERE status NOT IN ('cancelled')
            AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        `);
        stats.monthlyRevenue = revenueResult.rows[0].revenue;
        
        // Популярные товары
        const popularProducts = await pool.query(`
            SELECT 
                p.id, p.name, p.slug,
                SUM(oi.quantity) as sold_quantity,
                SUM(oi.subtotal) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status NOT IN ('cancelled')
            AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY p.id, p.name, p.slug
            ORDER BY sold_quantity DESC
            LIMIT 5
        `);
        stats.popularProducts = popularProducts.rows;
        
        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Ошибка при получении статистики' });
    }
});

// Управление заказами (только для админов)
app.put('/api/admin/orders/:id', 
    authenticateToken, 
    requireAdmin, 
    validation.validateUpdateOrder, 
    async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { status, paymentStatus } = req.body;
        
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (status) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }
        
        if (paymentStatus) {
            updates.push(`payment_status = $${paramCount}`);
            values.push(paymentStatus);
            paramCount++;
        }
        
        if (updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        values.push(id);
        
        const result = await client.query(
            `UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${paramCount} RETURNING *`,
            values
        );
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        // Если заказ отменен, освобождаем зарезервированные товары
        if (status === 'cancelled') {
            const orderItems = await client.query(
                'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
                [id]
            );
            
            for (const item of orderItems.rows) {
                await client.query(
                    'UPDATE products SET reserved_quantity = reserved_quantity - $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }
        }
        
        // Если заказ доставлен, уменьшаем количество на складе
        if (status === 'delivered') {
            const orderItems = await client.query(
                'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
                [id]
            );
            
            for (const item of orderItems.rows) {
                await client.query(
                    `UPDATE products SET 
                     stock_quantity = stock_quantity - $1,
                     reserved_quantity = reserved_quantity - $1 
                     WHERE id = $2`,
                    [item.quantity, item.product_id]
                );
            }
        }
        
        await client.query('COMMIT');
        
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update order error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении заказа' });
    } finally {
        client.release();
    }
});

// Управление товарами (только для админов)
app.post('/api/admin/products', 
    authenticateToken, 
    requireAdmin, 
    upload.array('images', 10), 
    validation.validateCreateProduct, 
    async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            sku, name, slug, brandId, categoryId, subcategoryId,
            description, specifications, price, oldPrice, costPrice,
            stockQuantity, isAvailable, isFeatured, isNew
        } = req.body;
        
        // Создаем товар
        const productResult = await client.query(`
            INSERT INTO products (
                sku, name, slug, brand_id, category_id, subcategory_id,
                description, specifications, price, old_price, cost_price,
                stock_quantity, is_available, is_featured, is_new
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            sku, name, slug, brandId, categoryId, subcategoryId,
            description, JSON.parse(specifications || '{}'), price, oldPrice, costPrice,
            stockQuantity || 0, isAvailable !== 'false', isFeatured === 'true', isNew === 'true'
        ]);
        
        const product = productResult.rows[0];
        
        // Сохраняем изображения
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const imageUrl = `/uploads/products/${file.filename}`;
                
                await client.query(`
                    INSERT INTO product_images (
                        product_id, image_url, is_primary, sort_order
                    ) VALUES ($1, $2, $3, $4)
                `, [product.id, imageUrl, i === 0, i]);
            }
        }
        
        await client.query('COMMIT');
        
        res.status(201).json(product);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Ошибка при создании товара' });
    } finally {
        client.release();
    }
});

// =============================================
// Улучшенная обработка ошибок
// =============================================

// Класс для кастомных ошибок
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }

    static badRequest(message, details = null) {
        return new ApiError(400, message, details);
    }

    static unauthorized(message = 'Неавторизован') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Доступ запрещен') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Не найдено') {
        return new ApiError(404, message);
    }

    static internal(message = 'Внутренняя ошибка сервера') {
        return new ApiError(500, message);
    }
}

// Обработчик для несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Маршрут не найден',
        path: req.originalUrl
    });
});

// Улучшенный обработчик ошибок
app.use((err, req, res, next) => {
    // Логирование ошибки
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Обработка разных типов ошибок
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: err.message,
            details: err.details
        });
    }

    // Ошибка валидации Multer
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'Файл слишком большой'
            });
        }
        return res.status(400).json({
            error: 'Ошибка загрузки файла'
        });
    }

    // Ошибка JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Недействительный токен'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Токен истек'
        });
    }

    // Ошибка PostgreSQL
    if (err.code === '23505') {
        return res.status(409).json({
            error: 'Запись уже существует'
        });
    }

    if (err.code === '23503') {
        return res.status(400).json({
            error: 'Нарушение целостности данных'
        });
    }

    // Ошибка по умолчанию
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Что-то пошло не так' 
        : err.message;

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

let server;

// Запуск сервера
server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`
╔═══════════════════════════════════════╗
║       MuStore API Server              ║
║═══════════════════════════════════════║
║  Port: ${PORT}                        ║
║  Environment: ${process.env.NODE_ENV || 'development'}         ║
║  Database: ${process.env.DB_NAME}                ║
║                                       ║
║  Ready to rock! 🎸                    ║
╚═══════════════════════════════════════╝
    `);
});

// Обработка сигналов завершения
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Прекращаем принимать новые подключения
    server.close(() => {
        console.log('HTTP server closed');
    });

    // Закрываем соединения с БД
    try {
        await pool.end();
        console.log('Database pool closed');
    } catch (err) {
        console.error('Error closing database pool:', err);
    }

    // Выходим из процесса
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // В production можно отправить в систему мониторинга
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Важно завершить процесс после логирования
    process.exit(1);
});