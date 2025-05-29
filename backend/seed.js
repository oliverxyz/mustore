// =============================================
// MuStore Database Seeder
// Заполнение базы данных тестовыми данными
// =============================================

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Конфигурация базы данных
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mustore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

// Функция для создания хеша пароля
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Основная функция заполнения данных
async function seedDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🌱 Starting database seeding...');
        
        // Проверяем, есть ли уже данные
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount.rows[0].count) > 0) {
            console.log('ℹ️  Database already has data. Skipping seeding.');
            return;
        }
        
        await client.query('BEGIN');
        
        // ======================================
        // 1. Создание пользователей
        // ======================================
        console.log('👤 Creating users...');
        
        const adminPassword = await hashPassword('admin123');
        const userPassword = await hashPassword('password123');
        
        await client.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES 
            ('admin@mustore.ru', $1, 'Администратор', 'MuStore', 'admin'),
            ('user@example.com', $2, 'Иван', 'Иванов', 'customer'),
            ('manager@mustore.ru', $1, 'Менеджер', 'Продаж', 'customer'),
            ('demo@mustore.ru', $2, 'Демо', 'Пользователь', 'customer')
        `, [adminPassword, userPassword]);
        
        console.log('✅ Users created');
        
        // ======================================
        // 2. Создание категорий
        // ======================================
        console.log('📂 Creating categories...');
        
        const categoriesData = [
            { name: 'Гитары', slug: 'guitars', description: 'Акустические и электрические гитары', icon: '🎸', sort: 1 },
            { name: 'Клавишные', slug: 'keyboards', description: 'Пианино, синтезаторы, MIDI-клавиатуры', icon: '🎹', sort: 2 },
            { name: 'Ударные', slug: 'drums', description: 'Барабанные установки и перкуссия', icon: '🥁', sort: 3 },
            { name: 'Духовые', slug: 'wind', description: 'Саксофоны, трубы, флейты', icon: '🎺', sort: 4 },
            { name: 'Студийное оборудование', slug: 'studio', description: 'Микрофоны, мониторы, интерфейсы', icon: '🎙️', sort: 5 },
            { name: 'Аксессуары', slug: 'accessories', description: 'Струны, медиаторы, чехлы', icon: '🎵', sort: 6 }
        ];
        
        for (const cat of categoriesData) {
            await client.query(`
                INSERT INTO categories (name, slug, description, icon, sort_order) 
                VALUES ($1, $2, $3, $4, $5)
            `, [cat.name, cat.slug, cat.description, cat.icon, cat.sort]);
        }
        
        console.log('✅ Categories created');
        
        // ======================================
        // 3. Создание подкатегорий
        // ======================================
        console.log('📁 Creating subcategories...');
        
        const subcategoriesData = [
            // Гитары
            { category: 'guitars', name: 'Акустические гитары', slug: 'acoustic', sort: 1 },
            { category: 'guitars', name: 'Электрогитары', slug: 'electric', sort: 2 },
            { category: 'guitars', name: 'Бас-гитары', slug: 'bass', sort: 3 },
            { category: 'guitars', name: 'Классические гитары', slug: 'classical', sort: 4 },
            
            // Клавишные
            { category: 'keyboards', name: 'Синтезаторы', slug: 'synthesizers', sort: 1 },
            { category: 'keyboards', name: 'Цифровые пианино', slug: 'pianos', sort: 2 },
            { category: 'keyboards', name: 'MIDI-клавиатуры', slug: 'midi', sort: 3 },
            
            // Ударные
            { category: 'drums', name: 'Акустические ударные', slug: 'acoustic-drums', sort: 1 },
            { category: 'drums', name: 'Электронные ударные', slug: 'electronic-drums', sort: 2 },
            { category: 'drums', name: 'Перкуссия', slug: 'percussion', sort: 3 }
        ];
        
        for (const sub of subcategoriesData) {
            await client.query(`
                INSERT INTO subcategories (category_id, name, slug, sort_order) 
                VALUES (
                    (SELECT id FROM categories WHERE slug = $1),
                    $2, $3, $4
                )
            `, [sub.category, sub.name, sub.slug, sub.sort]);
        }
        
        console.log('✅ Subcategories created');
        
        // ======================================
        // 4. Создание брендов
        // ======================================
        console.log('🏷️ Creating brands...');
        
        const brandsData = [
            { name: 'Yamaha', slug: 'yamaha', description: 'Японский производитель музыкальных инструментов' },
            { name: 'Fender', slug: 'fender', description: 'Американская компания, производитель гитар' },
            { name: 'Gibson', slug: 'gibson', description: 'Легендарный американский производитель гитар' },
            { name: 'Roland', slug: 'roland', description: 'Японский производитель электронных музыкальных инструментов' },
            { name: 'Korg', slug: 'korg', description: 'Японская компания, специализирующаяся на синтезаторах' },
            { name: 'Pearl', slug: 'pearl', description: 'Японский производитель ударных инструментов' },
            { name: 'Shure', slug: 'shure', description: 'Американский производитель аудиооборудования' },
            { name: 'Ibanez', slug: 'ibanez', description: 'Японский производитель гитар' },
            { name: 'Martin', slug: 'martin', description: 'Американский производитель акустических гитар' },
            { name: 'Casio', slug: 'casio', description: 'Японский производитель электронных инструментов' }
        ];
        
        for (const brand of brandsData) {
            await client.query(`
                INSERT INTO brands (name, slug, description) 
                VALUES ($1, $2, $3)
            `, [brand.name, brand.slug, brand.description]);
        }
        
        console.log('✅ Brands created');
        
        // ======================================
        // 5. Создание товаров
        // ======================================
        console.log('🎸 Creating products...');
        
        const productsData = [
            // Гитары
            {
                sku: 'YAM-F310',
                name: 'Yamaha F310',
                slug: 'yamaha-f310',
                description: 'Классическая акустическая гитара для начинающих и опытных музыкантов. Отличается ярким и сбалансированным звучанием.',
                brand: 'yamaha',
                category: 'guitars',
                subcategory: 'acoustic',
                price: 15990,
                oldPrice: 18990,
                stock: 15,
                featured: true,
                isNew: false,
                specs: {
                    "Тип": "Дредноут",
                    "Верхняя дека": "Ель",
                    "Задняя дека и обечайки": "Меранти",
                    "Гриф": "Нато",
                    "Накладка грифа": "Палисандр",
                    "Количество ладов": "20",
                    "Мензура": "634 мм"
                }
            },
            {
                sku: 'FEN-STRAT-PLAYER',
                name: 'Fender Stratocaster Player',
                slug: 'fender-stratocaster-player',
                description: 'Легендарная электрогитара с классическим звучанием Fender. Идеальна для всех стилей музыки.',
                brand: 'fender',
                category: 'guitars',
                subcategory: 'electric',
                price: 89990,
                oldPrice: null,
                stock: 8,
                featured: true,
                isNew: true,
                specs: {
                    "Корпус": "Ольха",
                    "Гриф": "Клён",
                    "Накладка грифа": "Клён",
                    "Количество ладов": "22",
                    "Звукосниматели": "3x Player Series Alnico 5 Strat Single-Coil",
                    "Бридж": "Tremolo 2-точечный",
                    "Цвет": "Sonic Red"
                }
            },
            {
                sku: 'GIB-LESPAUL-STD',
                name: 'Gibson Les Paul Standard',
                slug: 'gibson-les-paul-standard',
                description: 'Классическая электрогитара с мощным звучанием хамбакеров и премиальными материалами.',
                brand: 'gibson',
                category: 'guitars',
                subcategory: 'electric',
                price: 249990,
                oldPrice: null,
                stock: 3,
                featured: true,
                isNew: false,
                specs: {
                    "Корпус": "Красное дерево",
                    "Топ": "Клён AA",
                    "Гриф": "Красное дерево",
                    "Накладка грифа": "Палисандр",
                    "Звукосниматели": "Burstbucker Pro",
                    "Бридж": "Tune-o-matic",
                    "Цвет": "Bourbon Burst"
                }
            },
            {
                sku: 'IBZ-RG350DXZ',
                name: 'Ibanez RG350DXZ',
                slug: 'ibanez-rg350dxz',
                description: 'Современная электрогитара для рока и металла с быстрым грифом и мощными звукоснимателями.',
                brand: 'ibanez',
                category: 'guitars',
                subcategory: 'electric',
                price: 45990,
                oldPrice: 52990,
                stock: 12,
                featured: false,
                isNew: true,
                specs: {
                    "Корпус": "Липа",
                    "Гриф": "Клён",
                    "Накладка грифа": "Палисандр",
                    "Количество ладов": "24",
                    "Звукосниматели": "INF3 (H) / INF3 (S) / INF3 (H)",
                    "Бридж": "Fixed"
                }
            },
            {
                sku: 'MAR-D28',
                name: 'Martin D-28',
                slug: 'martin-d28',
                description: 'Премиальная акустическая гитара с богатым басовитым звучанием и превосходной проекцией.',
                brand: 'martin',
                category: 'guitars',
                subcategory: 'acoustic',
                price: 189990,
                oldPrice: null,
                stock: 2,
                featured: true,
                isNew: false,
                specs: {
                    "Тип": "Дредноут",
                    "Верхняя дека": "Ель Ситка",
                    "Задняя дека и обечайки": "Палисандр Ост-Индский",
                    "Гриф": "Красное дерево селект",
                    "Накладка грифа": "Эбони",
                    "Количество ладов": "20",
                    "Мензура": "645 мм"
                }
            },
            
            // Клавишные
            {
                sku: 'ROL-FP30X',
                name: 'Roland FP-30X',
                slug: 'roland-fp-30x',
                description: 'Портативное цифровое пианино с аутентичным звучанием и взвешенной клавиатурой.',
                brand: 'roland',
                category: 'keyboards',
                subcategory: 'pianos',
                price: 64990,
                oldPrice: 69990,
                stock: 5,
                featured: true,
                isNew: false,
                specs: {
                    "Клавиатура": "88 клавиш, PHA-4 Standard",
                    "Полифония": "256 голосов",
                    "Тембры": "56 тембров",
                    "Эффекты": "Ambience, Brilliance",
                    "Записывающее устройство": "SMF",
                    "Bluetooth": "Да (MIDI, Audio)",
                    "Выходы": "Наушники, линейный выход"
                }
            },
            {
                sku: 'KOR-KRONOS2',
                name: 'Korg Kronos 2',
                slug: 'korg-kronos-2',
                description: 'Профессиональная музыкальная рабочая станция с девятью движками синтеза.',
                brand: 'korg',
                category: 'keyboards',
                subcategory: 'synthesizers',
                price: 299990,
                oldPrice: null,
                stock: 1,
                featured: true,
                isNew: true,
                specs: {
                    "Клавиатура": "88 клавиш, RH3",
                    "Движки синтеза": "9 типов",
                    "Полифония": "До 400 голосов",
                    "Память": "62 ГБ SSD",
                    "Секвенсер": "16 треков MIDI + 16 аудио",
                    "Дисплей": "8\" TouchView"
                }
            },
            {
                sku: 'CAS-PRIVIA-PX770',
                name: 'Casio Privia PX-770',
                slug: 'casio-privia-px770',
                description: 'Компактное цифровое пианино с натуральным звучанием и элегантным дизайном.',
                brand: 'casio',
                category: 'keyboards',
                subcategory: 'pianos',
                price: 42990,
                oldPrice: 47990,
                stock: 8,
                featured: false,
                isNew: false,
                specs: {
                    "Клавиатура": "88 клавиш, Tri-sensor Scaled Hammer Action",
                    "Полифония": "128 голосов",
                    "Тембры": "19 тембров",
                    "Реверберация": "4 типа",
                    "Chorus": "4 типа",
                    "Встроенные композиции": "60"
                }
            },
            
            // Ударные
            {
                sku: 'PEARL-EXPORT',
                name: 'Pearl Export Series',
                slug: 'pearl-export-series',
                description: 'Профессиональная барабанная установка для сцены и студии с отличным соотношением цена/качество.',
                brand: 'pearl',
                category: 'drums',
                subcategory: 'acoustic-drums',
                price: 119990,
                oldPrice: null,
                stock: 3,
                featured: true,
                isNew: true,
                specs: {
                    "Бас-барабан": "22\"x18\"",
                    "Том-томы": "10\"x7\", 12\"x8\"",
                    "Напольный том": "16\"x16\"",
                    "Малый барабан": "14\"x5.5\"",
                    "Материал": "Тополь/Красное дерево",
                    "Фурнитура": "Хром",
                    "Цвет": "Jet Black"
                }
            },
            {
                sku: 'ROL-TD17KVX',
                name: 'Roland TD-17KVX',
                slug: 'roland-td17kvx',
                description: 'Электронная барабанная установка с реалистичными mesh пэдами и профессиональными звуками.',
                brand: 'roland',
                category: 'drums',
                subcategory: 'electronic-drums',
                price: 84990,
                oldPrice: 92990,
                stock: 4,
                featured: false,
                isNew: true,
                specs: {
                    "Модуль": "TD-17",
                    "Пэды": "Mesh (малый барабан, том-томы)",
                    "Тарелки": "CY-5 x2, CY-8 x1",
                    "Hi-Hat": "VH-10",
                    "Кик-пэд": "KD-10",
                    "Количество звуков": "310+",
                    "Кит-сеты": "50"
                }
            },
            
            // Студийное оборудование
            {
                sku: 'SHURE-SM58',
                name: 'Shure SM58',
                slug: 'shure-sm58',
                description: 'Легендарный вокальный микрофон для сцены и студии. Стандарт индустрии.',
                brand: 'shure',
                category: 'studio',
                subcategory: null,
                price: 8990,
                oldPrice: null,
                stock: 20,
                featured: false,
                isNew: false,
                specs: {
                    "Тип": "Динамический",
                    "Диаграмма направленности": "Кардиоида",
                    "Частотный диапазон": "50 - 15000 Гц",
                    "Чувствительность": "-54.5 дБВ/Па",
                    "Импеданс": "150 Ом",
                    "Разъем": "XLR"
                }
            },
            {
                sku: 'SHURE-SM57',
                name: 'Shure SM57',
                slug: 'shure-sm57',
                description: 'Универсальный динамический микрофон для записи инструментов и усилителей.',
                brand: 'shure',
                category: 'studio',
                subcategory: null,
                price: 7990,
                oldPrice: null,
                stock: 15,
                featured: false,
                isNew: false,
                specs: {
                    "Тип": "Динамический",
                    "Диаграмма направленности": "Кардиоида",
                    "Частотный диапазон": "40 - 15000 Гц",
                    "Чувствительность": "-56 дБВ/Па",
                    "Импеданс": "150 Ом",
                    "Разъем": "XLR"
                }
            }
        ];
        
        // Вставляем товары
        for (const product of productsData) {
            const productResult = await client.query(`
                INSERT INTO products (
                    sku, name, slug, description, brand_id, category_id, subcategory_id,
                    price, old_price, stock_quantity, is_featured, is_new, specifications
                ) VALUES (
                    $1, $2, $3, $4,
                    (SELECT id FROM brands WHERE slug = $5),
                    (SELECT id FROM categories WHERE slug = $6),
                    (SELECT id FROM subcategories WHERE slug = $7),
                    $8, $9, $10, $11, $12, $13
                ) RETURNING id
            `, [
                product.sku, product.name, product.slug, product.description,
                product.brand, product.category, product.subcategory,
                product.price, product.oldPrice, product.stock,
                product.featured, product.isNew, JSON.stringify(product.specs)
            ]);
            
            // Добавляем основное изображение для каждого товара
            const imageUrl = `https://images.unsplash.com/photo-${getImageIdForProduct(product.category)}?w=400`;
            const thumbnailUrl = `https://images.unsplash.com/photo-${getImageIdForProduct(product.category)}?w=200`;
            
            await client.query(`
                INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, sort_order)
                VALUES ($1, $2, $3, true, 0)
            `, [productResult.rows[0].id, imageUrl, thumbnailUrl]);
        }
        
        console.log('✅ Products created');
        
        await client.query('COMMIT');
        console.log('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Функция для получения ID изображения с Unsplash в зависимости от категории
function getImageIdForProduct(category) {
    const imageIds = {
        'guitars': '1558098329-a11cff621064',
        'keyboards': '1520523839897-bd0b52f945a0',
        'drums': '1519892300165-cb5542fb47c7',
        'wind': '1511192336575-5a79af67a629',
        'studio': '1598488035139-bdbb2231ce04',
        'accessories': '1493225457124-a3eb161ffa5f'
    };
    
    return imageIds[category] || imageIds['guitars'];
}

// Запуск скрипта
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('✅ Seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };