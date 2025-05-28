// =============================================
// MuStore Validation Middleware
// Валидация входящих запросов
// =============================================

const { body, param, query, validationResult } = require('express-validator');

// Обработчик ошибок валидации
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Ошибка валидации',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

// =============================================
// Валидаторы для аутентификации
// =============================================

const validateRegistration = [
    body('email')
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов')
        .matches(/\d/).withMessage('Пароль должен содержать хотя бы одну цифру'),
    body('firstName')
        .trim()
        .isLength({ min: 2 }).withMessage('Имя должно быть минимум 2 символа')
        .isAlpha('ru-RU').withMessage('Имя должно содержать только буквы'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2 }).withMessage('Фамилия должна быть минимум 2 символа')
        .isAlpha('ru-RU').withMessage('Фамилия должна содержать только буквы'),
    body('phone')
        .optional()
        .isMobilePhone('ru-RU').withMessage('Неверный формат телефона'),
    handleValidationErrors
];

const validateLogin = [
    body('email')
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Пароль обязателен'),
    handleValidationErrors
];

// =============================================
// Валидаторы для товаров
// =============================================

const validateProductFilters = [
    query('category')
        .optional()
        .isSlug().withMessage('Неверный формат категории'),
    query('subcategory')
        .optional()
        .isSlug().withMessage('Неверный формат подкатегории'),
    query('priceMin')
        .optional()
        .isFloat({ min: 0 }).withMessage('Минимальная цена должна быть положительным числом'),
    query('priceMax')
        .optional()
        .isFloat({ min: 0 }).withMessage('Максимальная цена должна быть положительным числом'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100'),
    query('offset')
        .optional()
        .isInt({ min: 0 }).withMessage('Смещение должно быть положительным числом'),
    query('sortBy')
        .optional()
        .isIn(['price', 'name', 'created_at']).withMessage('Неверное поле сортировки'),
    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC']).withMessage('Порядок сортировки должен быть ASC или DESC'),
    handleValidationErrors
];

const validateProductIdentifier = [
    param('identifier')
        .notEmpty().withMessage('Идентификатор товара обязателен'),
    handleValidationErrors
];

// =============================================
// Валидаторы для корзины
// =============================================

const validateAddToCart = [
    body('productId')
        .isUUID().withMessage('Неверный ID товара'),
    body('quantity')
        .optional()
        .isInt({ min: 1, max: 99 }).withMessage('Количество должно быть от 1 до 99'),
    handleValidationErrors
];

const validateUpdateCartItem = [
    param('itemId')
        .isUUID().withMessage('Неверный ID элемента корзины'),
    body('quantity')
        .isInt({ min: 1, max: 99 }).withMessage('Количество должно быть от 1 до 99'),
    handleValidationErrors
];

// =============================================
// Валидаторы для заказов
// =============================================

const validateCreateOrder = [
    body('customerName')
        .trim()
        .isLength({ min: 2, max: 255 }).withMessage('Имя должно быть от 2 до 255 символов'),
    body('customerEmail')
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail(),
    body('customerPhone')
        .isMobilePhone('ru-RU').withMessage('Неверный формат телефона'),
    body('deliveryAddress')
        .if(body('deliveryMethod').equals('delivery'))
        .notEmpty().withMessage('Адрес доставки обязателен при выборе доставки')
        .isLength({ max: 500 }).withMessage('Адрес слишком длинный'),
    body('deliveryMethod')
        .isIn(['pickup', 'delivery']).withMessage('Неверный способ доставки'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'online']).withMessage('Неверный способ оплаты'),
    body('notes')
        .optional()
        .isLength({ max: 1000 }).withMessage('Комментарий слишком длинный'),
    handleValidationErrors
];

// =============================================
// Валидаторы для административных функций
// =============================================

const validateCreateProduct = [
    body('sku')
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage('SKU должен быть от 3 до 50 символов')
        .matches(/^[A-Za-z0-9-]+$/).withMessage('SKU может содержать только буквы, цифры и дефис'),
    body('name')
        .trim()
        .isLength({ min: 3, max: 255 }).withMessage('Название должно быть от 3 до 255 символов'),
    body('slug')
        .isSlug().withMessage('Неверный формат slug'),
    body('brandId')
        .isUUID().withMessage('Неверный ID бренда'),
    body('categoryId')
        .isUUID().withMessage('Неверный ID категории'),
    body('subcategoryId')
        .optional()
        .isUUID().withMessage('Неверный ID подкатегории'),
    body('description')
        .optional()
        .isLength({ max: 5000 }).withMessage('Описание слишком длинное'),
    body('price')
        .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('oldPrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('Старая цена должна быть положительным числом'),
    body('costPrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('Себестоимость должна быть положительным числом'),
    body('stockQuantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Количество должно быть положительным числом'),
    handleValidationErrors
];

const validateUpdateOrder = [
    param('id')
        .isUUID().withMessage('Неверный ID заказа'),
    body('status')
        .optional()
        .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Неверный статус заказа'),
    body('paymentStatus')
        .optional()
        .isIn(['pending', 'paid', 'failed'])
        .withMessage('Неверный статус оплаты'),
    handleValidationErrors
];

// =============================================
// Вспомогательные функции валидации
// =============================================

// Проверка формата цены
const isValidPrice = (value) => {
    return !isNaN(value) && parseFloat(value) >= 0 && parseFloat(value) <= 9999999.99;
};

// Проверка формата телефона
const isValidPhone = (value) => {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/;
    return phoneRegex.test(value);
};

// Проверка slug
const isValidSlug = (value) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(value);
};

// Санитизация входных данных
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '');
};

// Middleware для санитизации всех входных данных
const sanitizeRequest = (req, res, next) => {
    // Санитизация body
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }
    
    // Санитизация query
    if (req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeInput(req.query[key]);
            }
        });
    }
    
    next();
};

// =============================================
// Экспорт валидаторов
// =============================================

module.exports = {
    // Общие
    handleValidationErrors,
    sanitizeRequest,
    
    // Аутентификация
    validateRegistration,
    validateLogin,
    
    // Товары
    validateProductFilters,
    validateProductIdentifier,
    
    // Корзина
    validateAddToCart,
    validateUpdateCartItem,
    
    // Заказы
    validateCreateOrder,
    
    // Административные
    validateCreateProduct,
    validateUpdateOrder,
    
    // Вспомогательные функции
    isValidPrice,
    isValidPhone,
    isValidSlug,
    sanitizeInput
};