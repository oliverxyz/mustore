
-- =============================================
-- MuStore Database Schema
-- PostgreSQL 15+
-- =============================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- Основные таблицы
-- =============================================

-- Пользователи
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Категории товаров
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Подкатегории
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, slug)
);

-- Бренды
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Товары
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    specifications JSONB,
    
    -- Связи
    brand_id UUID REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    
    -- Цены
    price DECIMAL(10,2) NOT NULL,
    old_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    
    -- Склад
    stock_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    
    -- Метаданные
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    weight DECIMAL(8,3),
    dimensions VARCHAR(100),
    
    -- Статистика
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Изображения товаров
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Корзины
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ограничение: либо user_id, либо session_id
    CHECK ((user_id IS NOT NULL AND session_id IS NULL) OR 
           (user_id IS NULL AND session_id IS NOT NULL))
);

-- Элементы корзины
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(cart_id, product_id)
);

-- Избранное
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, product_id)
);

-- Заказы
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    
    -- Статусы
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    
    -- Суммы
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Информация о клиенте
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    
    -- Доставка
    delivery_method VARCHAR(20) DEFAULT 'pickup' CHECK (delivery_method IN ('pickup', 'delivery')),
    delivery_address TEXT,
    delivery_date DATE,
    
    -- Оплата
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'online')),
    
    -- Примечания
    notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Позиции заказа
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- Сохраняем данные на момент заказа
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    product_brand VARCHAR(255),
    
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Индексы для оптимизации
-- =============================================

-- Пользователи
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Товары
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_new ON products(is_new);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_name_gin ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('russian', name || ' ' || COALESCE(description, '')));

-- Корзины
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Заказы
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);

-- =============================================
-- Функции и триггеры
-- =============================================

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция генерации номера заказа
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
           LPAD(EXTRACT(DOY FROM CURRENT_DATE)::TEXT, 3, '0') ||
           LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO new_number
    FROM orders 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Функция получения товаров с фильтами
CREATE OR REPLACE FUNCTION get_products_filtered(
    p_category TEXT DEFAULT NULL,
    p_subcategory TEXT DEFAULT NULL,
    p_brand_ids UUID[] DEFAULT NULL,
    p_price_min DECIMAL DEFAULT NULL,
    p_price_max DECIMAL DEFAULT NULL,
    p_in_stock BOOLEAN DEFAULT NULL,
    p_featured BOOLEAN DEFAULT NULL,
    p_is_new BOOLEAN DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'DESC',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    product_data JSONB,
    total_count BIGINT
) AS $$
DECLARE
    sql_query TEXT;
    where_conditions TEXT[] := '{}';
    order_clause TEXT;
BEGIN
    -- Базовый запрос
    sql_query := '
        WITH filtered_products AS (
            SELECT p.*, 
                   b.name as brand_name,
                   c.name as category_name, c.slug as category_slug,
                   sc.name as subcategory_name, sc.slug as subcategory_slug,
                   pi.image_url as primary_image,
                   COUNT(*) OVER() as total_count
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
            LEFT JOIN LATERAL (
                SELECT image_url 
                FROM product_images 
                WHERE product_id = p.id AND is_primary = true 
                LIMIT 1
            ) pi ON true
            WHERE p.is_available = true
    ';
    
    -- Добавляем условия фильтрации
    IF p_category IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 'c.slug = ' || quote_literal(p_category));
    END IF;
    
    IF p_subcategory IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 'sc.slug = ' || quote_literal(p_subcategory));
    END IF;
    
    IF p_brand_ids IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 'p.brand_id = ANY(' || quote_literal(p_brand_ids) || '::UUID[])');
    END IF;
    
    IF p_price_min IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 'p.price >= ' || p_price_min);
    END IF;
    
    IF p_price_max IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 'p.price <= ' || p_price_max);
    END IF;
    
    IF p_in_stock IS TRUE THEN
        where_conditions := array_append(where_conditions, '(p.stock_quantity - p.reserved_quantity) > 0');
    END IF;
    
    IF p_featured IS TRUE THEN
        where_conditions := array_append(where_conditions, 'p.is_featured = true');
    END IF;
    
    IF p_is_new IS TRUE THEN
        where_conditions := array_append(where_conditions, 'p.is_new = true');
    END IF;
    
    IF p_search IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            '(p.name ILIKE ' || quote_literal('%' || p_search || '%') || 
            ' OR b.name ILIKE ' || quote_literal('%' || p_search || '%') || 
            ' OR p.description ILIKE ' || quote_literal('%' || p_search || '%') || ')');
    END IF;
    
    -- Добавляем условия к запросу
    IF array_length(where_conditions, 1) > 0 THEN
        sql_query := sql_query || ' AND ' || array_to_string(where_conditions, ' AND ');
    END IF;
    
    -- Сортировка
    order_clause := 'ORDER BY ';
    CASE p_sort_by
        WHEN 'price' THEN order_clause := order_clause || 'p.price';
        WHEN 'name' THEN order_clause := order_clause || 'p.name';
        ELSE order_clause := order_clause || 'p.created_at';
    END CASE;
    
    order_clause := order_clause || ' ' || p_sort_order;
    
    -- Финальный запрос
    sql_query := sql_query || ' ' || order_clause || 
                 ' LIMIT ' || p_limit || ' OFFSET ' || p_offset ||
                 ')
                 SELECT 
                     fp.id,
                     jsonb_build_object(
                         ''id'', fp.id,
                         ''sku'', fp.sku,
                         ''name'', fp.name,
                         ''slug'', fp.slug,
                         ''description'', fp.description,
                         ''brand_name'', fp.brand_name,
                         ''category_name'', fp.category_name,
                         ''category_slug'', fp.category_slug,
                         ''subcategory_name'', fp.subcategory_name,
                         ''subcategory_slug'', fp.subcategory_slug,
                         ''price'', fp.price,
                         ''old_price'', fp.old_price,
                         ''stock_quantity'', fp.stock_quantity,
                         ''is_featured'', fp.is_featured,
                         ''is_new'', fp.is_new,
                         ''primary_image'', fp.primary_image,
                         ''created_at'', fp.created_at
                     ),
                     fp.total_count
                 FROM filtered_products fp';
    
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Начальные данные
-- =============================================

-- Создаем администратора по умолчанию
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES 
('admin@mustore.ru', '$2b$10$rQY4n3HvWuG7YhV8uB1rBe5VnKGg.R2yYdF8JoD4QG5UWnZ8xP2Sm', 'Администратор', 'MuStore', 'admin'),
('user@example.com', '$2b$10$rQY4n3HvWuG7YhV8uB1rBe5VnKGg.R2yYdF8JoD4QG5UWnZ8xP2Sm', 'Иван', 'Иванов', 'customer');

-- Категории
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES 
('Гитары', 'guitars', 'Акустические и электрические гитары', '🎸', 1),
('Клавишные', 'keyboards', 'Пианино, синтезаторы, MIDI-клавиатуры', '🎹', 2),
('Ударные', 'drums', 'Барабанные установки и перкуссия', '🥁', 3),
('Духовые', 'wind', 'Саксофоны, трубы, флейты', '🎺', 4),
('Студийное оборудование', 'studio', 'Микрофоны, мониторы, интерфейсы', '🎙️', 5),
('Аксессуары', 'accessories', 'Струны, медиаторы, чехлы', '🎵', 6);

-- Подкатегории
INSERT INTO subcategories (category_id, name, slug, sort_order) VALUES 
((SELECT id FROM categories WHERE slug = 'guitars'), 'Акустические гитары', 'acoustic', 1),
((SELECT id FROM categories WHERE slug = 'guitars'), 'Электрогитары', 'electric', 2),
((SELECT id FROM categories WHERE slug = 'guitars'), 'Бас-гитары', 'bass', 3),
((SELECT id FROM categories WHERE slug = 'guitars'), 'Классические гитары', 'classical', 4),
((SELECT id FROM categories WHERE slug = 'keyboards'), 'Синтезаторы', 'synthesizers', 1),
((SELECT id FROM categories WHERE slug = 'keyboards'), 'Цифровые пианино', 'pianos', 2),
((SELECT id FROM categories WHERE slug = 'keyboards'), 'MIDI-клавиатуры', 'midi', 3),
((SELECT id FROM categories WHERE slug = 'drums'), 'Акустические ударные', 'acoustic-drums', 1),
((SELECT id FROM categories WHERE slug = 'drums'), 'Электронные ударные', 'electronic-drums', 2),
((SELECT id FROM categories WHERE slug = 'drums'), 'Перкуссия', 'percussion', 3);

-- Бренды
INSERT INTO brands (name, slug, description) VALUES 
('Yamaha', 'yamaha', 'Японский производитель музыкальных инструментов'),
('Fender', 'fender', 'Американская компания, производитель гитар'),
('Gibson', 'gibson', 'Легендарный американский производитель гитар'),
('Roland', 'roland', 'Японский производитель электронных музыкальных инструментов'),
('Korg', 'korg', 'Японская компания, специализирующаяся на синтезаторах'),
('Pearl', 'pearl', 'Японский производитель ударных инструментов'),
('Shure', 'shure', 'Американский производитель аудиооборудования');

-- Примеры товаров
INSERT INTO products (sku, name, slug, description, brand_id, category_id, subcategory_id, price, old_price, stock_quantity, is_featured, is_new, specifications) VALUES 

('YAM-F310', 'Yamaha F310', 'yamaha-f310', 'Классическая акустическая гитара для начинающих и опытных музыкантов.', 
 (SELECT id FROM brands WHERE slug = 'yamaha'), 
 (SELECT id FROM categories WHERE slug = 'guitars'), 
 (SELECT id FROM subcategories WHERE slug = 'acoustic'), 
 15990, 18990, 15, true, false,
 '{"Тип": "Дредноут", "Верхняя дека": "Ель", "Задняя дека и обечайки": "Меранти", "Гриф": "Нато", "Накладка грифа": "Палисандр", "Количество ладов": "20", "Мензура": "634 мм"}'::jsonb),

('FEN-STRAT-PLAYER', 'Fender Stratocaster Player', 'fender-stratocaster-player', 'Легендарная электрогитара с классическим звучанием Fender.',
 (SELECT id FROM brands WHERE slug = 'fender'), 
 (SELECT id FROM categories WHERE slug = 'guitars'), 
 (SELECT id FROM subcategories WHERE slug = 'electric'), 
 89990, null, 8, true, true,
 '{"Корпус": "Ольха", "Гриф": "Клён", "Накладка грифа": "Клён", "Количество ладов": "22", "Звукосниматели": "3x Player Series Alnico 5 Strat Single-Coil", "Бридж": "Tremolo 2-точечный", "Цвет": "Sonic Red"}'::jsonb),

('ROL-FP30X', 'Roland FP-30X', 'roland-fp-30x', 'Портативное цифровое пианино с аутентичным звучанием и клавиатурой.',
 (SELECT id FROM brands WHERE slug = 'roland'), 
 (SELECT id FROM categories WHERE slug = 'keyboards'), 
 (SELECT id FROM subcategories WHERE slug = 'pianos'), 
 64990, 69990, 5, true, false,
 '{"Клавиатура": "88 клавиш, PHA-4 Standard", "Полифония": "256 голосов", "Тембры": "56 тембров", "Эффекты": "Ambience, Brilliance", "Записывающее устройство": "SMF", "Bluetooth": "Да (MIDI, Audio)", "Выходы": "Наушники, линейный выход"}'::jsonb),

('PEARL-EXPORT', 'Pearl Export Series', 'pearl-export-series', 'Профессиональная барабанная установка для сцены и студии.',
 (SELECT id FROM brands WHERE slug = 'pearl'), 
 (SELECT id FROM categories WHERE slug = 'drums'), 
 (SELECT id FROM subcategories WHERE slug = 'acoustic-drums'), 
 119990, null, 3, true, true,
 '{"Бас-барабан": "22x18", "Том-томы": "10x7, 12x8", "Напольный том": "16x16", "Малый барабан": "14x5.5", "Материал": "Тополь/Красное дерево", "Фурнитура": "Хром", "Цвет": "Jet Black"}'::jsonb),

('SHURE-SM58', 'Shure SM58', 'shure-sm58', 'Легендарный вокальный микрофон для сцены и студии.',
 (SELECT id FROM brands WHERE slug = 'shure'), 
 (SELECT id FROM categories WHERE slug = 'studio'), 
 null, 
 8990, null, 20, false, false,
 '{"Тип": "Динамический", "Диаграмма направленности": "Кардиоида", "Частотный диапазон": "50 - 15000 Гц", "Чувствительность": "-54.5 дБВ/Па", "Импеданс": "150 Ом", "Разъем": "XLR"}'::jsonb);

-- Добавляем изображения для товаров
INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, sort_order) VALUES 
((SELECT id FROM products WHERE sku = 'YAM-F310'), 'https://images.unsplash.com/photo-1558098329-a11cff621064?w=400', 'https://images.unsplash.com/photo-1558098329-a11cff621064?w=200', true, 0),
((SELECT id FROM products WHERE sku = 'FEN-STRAT-PLAYER'), 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=400', 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=200', true, 0),
((SELECT id FROM products WHERE sku = 'ROL-FP30X'), 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400', 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=200', true, 0),
((SELECT id FROM products WHERE sku = 'PEARL-EXPORT'), 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=400', 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=200', true, 0),
((SELECT id FROM products WHERE sku = 'SHURE-SM58'), 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200', true, 0);