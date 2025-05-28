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

// Тестовые данные
const testProducts = [
    // Гитары
    {
        sku: 'YAM-F310',
        name: 'Yamaha F310',
        slug: 'yamaha-f310',
        brand: 'Yamaha',
        category: 'guitars',
        subcategory: 'acoustic',
        price: 15990,
        oldPrice: 18990,
        stockQuantity: 10,
        description: 'Классическая акустическая гитара Yamaha F310 - идеальный выбор для начинающих музыкантов. Инструмент обладает ярким, сбалансированным звучанием и удобной эргономикой.',
        specifications: {
            'Тип': 'Дредноут',
            'Верхняя дека': 'Ель',
            'Задняя дека и обечайки': 'Меранти',
            'Гриф': 'Нато',
            'Накладка грифа': 'Палисандр',
            'Количество ладов': '20',
            'Мензура': '634 мм',
            'Ширина грифа у порожка': '43 мм'
        },
        isFeatured: true,
        isNew: false
    },
    {
        sku: 'FEN-STRAT-PLR',
        name: 'Fender Player Stratocaster',
        slug: 'fender-player-stratocaster',
        brand: 'Fender',
        category: 'guitars',
        subcategory: 'electric',
        price: 89990,
        stockQuantity: 5,
        description: 'Легендарная электрогитара Fender Stratocaster серии Player. Классическое звучание, которое определило звук рок-музыки.',
        specifications: {
            'Корпус': 'Ольха',
            'Гриф': 'Клён',
            'Накладка грифа': 'Клён',
            'Профиль грифа': 'Modern C',
            'Количество ладов': '22',
            'Звукосниматели': '3x Player Series Alnico 5 Strat Single-Coil',
            'Бридж': '2-точечный Tremolo',
            'Цвет': 'Sonic Red'
        },
        isFeatured: true,
        isNew: true
    },
    {
        sku: 'GIB-LP-STD',
        name: 'Gibson Les Paul Standard',
        slug: 'gibson-les-paul-standard',
        brand: 'Gibson',
        category: 'guitars',
        subcategory: 'electric',
        price: 249990,
        stockQuantity: 2,
        description: 'Gibson Les Paul Standard - икона рок-музыки. Мощное звучание хамбакеров и sustain, который длится вечность.',
        specifications: {
            'Корпус': 'Красное дерево',
            'Топ': 'Клён AA',
            'Гриф': 'Красное дерево',
            'Накладка грифа': 'Палисандр',
            'Звукосниматели': 'Burstbucker Pro',
            'Бридж': 'Tune-o-matic',
            'Машинки': 'Grover',
            'Цвет': 'Bourbon Burst'
        },
        isFeatured: true,
        isNew: false
    },
    {
        sku: 'IBZ-SR305',
        name: 'Ibanez SR305 Bass',
        slug: 'ibanez-sr305-bass',
        brand: 'Ibanez',
        category: 'guitars',
        subcategory: 'bass',
        price: 45990,
        stockQuantity: 7,
        description: '5-струнная бас-гитара Ibanez SR305 с активной электроникой. Универсальный инструмент для любых стилей музыки.',
        specifications: {
            'Количество струн': '5',
            'Корпус': 'Агатис',
            'Гриф': 'Клён',
            'Накладка': 'Палисандр',
            'Звукосниматели': 'PowerSpan Dual Coil',
            'Электроника': 'Активная, 3-полосный EQ',
            'Бридж': 'Accu-cast B305',
            'Цвет': 'Weathered Black'
        },
        isFeatured: false,
        isNew: false
    },

    // Клавишные
    {
        sku: 'ROL-FP30X',
        name: 'Roland FP-30X',
        slug: 'roland-fp-30x',
        brand: 'Roland',
        category: 'keyboards',
        subcategory: 'pianos',
        price: 64990,
        oldPrice: 69990,
        stockQuantity: 4,
        description: 'Портативное цифровое пианино Roland FP-30X с клавиатурой PHA-4 и технологией SuperNATURAL Piano.',
        specifications: {
            'Клавиатура': '88 клавиш, PHA-4 Standard',
            'Звуковой процессор': 'SuperNATURAL Piano',
            'Полифония': '256 голосов',
            'Тембры': '56 тембров',
            'Эффекты': 'Ambience, Brilliance',
            'Bluetooth': 'MIDI и Audio',
            'Выходы': 'Наушники x2, Линейный выход',
            'Вес': '14.8 кг'
        },
        isFeatured: true,
        isNew: false
    },
    {
        sku: 'YAM-PSR-E373',
        name: 'Yamaha PSR-E373',
        slug: 'yamaha-psr-e373',
        brand: 'Yamaha',
        category: 'keyboards',
        subcategory: 'synthesizers',
        price: 29990,
        stockQuantity: 12,
        description: 'Синтезатор Yamaha PSR-E373 с 61 клавишей и 622 тембрами. Идеален для обучения и домашнего музицирования.',
        specifications: {
            'Клавиатура': '61 клавиша',
            'Полифония': '48 голосов',
            'Тембры': '622',
            'Стили': '205',
            'Эффекты': 'Reverb, Chorus, DSP',
            'Обучение': 'Yamaha Education Suite',
            'Подключение': 'USB TO HOST',
            'Питание': 'Адаптер или батарейки'
        },
        isFeatured: false,
        isNew: true
    },
    {
        sku: 'KORG-KRONOS2',
        name: 'Korg Kronos 2',
        slug: 'korg-kronos-2',
        brand: 'Korg',
        category: 'keyboards',
        subcategory: 'synthesizers',
        price: 299990,
        stockQuantity: 1,
        description: 'Профессиональная музыкальная рабочая станция Korg Kronos 2. Девять движков синтеза в одном инструменте.',
        specifications: {
            'Клавиатура': '88 клавиш, RH3',
            'Движки синтеза': '9 типов',
            'Полифония': 'До 400 голосов',
            'Память': '62 ГБ SSD',
            'Секвенсер': '16 треков MIDI + 16 аудио',
            'Дисплей': '8" TouchView цветной',
            'Эффекты': '16 процессоров',
            'Вес': '24.1 кг'
        },
        isFeatured: true,
        isNew: true
    },

    // Ударные
    {
        sku: 'PEARL-EXX725',
        name: 'Pearl Export Series',
        slug: 'pearl-export-series',
        brand: 'Pearl',
        category: 'drums',
        subcategory: 'acoustic-drums',
        price: 119990,
        stockQuantity: 3,
        description: 'Акустическая ударная установка Pearl Export Series. Легендарное качество Pearl по доступной цене.',
        specifications: {
            'Бас-барабан': '22"x18"',
            'Том-томы': '10"x7", 12"x8"',
            'Напольный том': '16"x16"',
            'Малый барабан': '14"x5.5"',
            'Материал': 'Тополь/Красное дерево',
            'Фурнитура': 'Хром',
            'Стойки': 'В комплекте',
            'Цвет': 'Jet Black'
        },
        isFeatured: true,
        isNew: true
    },
    {
        sku: 'ROL-TD17KVX',
        name: 'Roland TD-17KVX',
        slug: 'roland-td-17kvx',
        brand: 'Roland',
        category: 'drums',
        subcategory: 'electronic-drums',
        price: 149990,
        stockQuantity: 2,
        description: 'Электронная ударная установка Roland TD-17KVX с модулем TD-17 и пэдами PDX-12.',
        specifications: {
            'Звуковой модуль': 'TD-17',
            'Пресеты': '50 наборов',
            'Малый барабан': 'PDX-12',
            'Томы': 'PDX-8 x3',
            'Бас-барабан': 'KD-10',
            'Хай-хэт': 'VH-10',
            'Тарелки': 'CY-13R, CY-12C',
            'Функции обучения': 'Есть'
        },
        isFeatured: false,
        isNew: false
    },

    // Духовые
    {
        sku: 'YAM-YAS280',
        name: 'Yamaha YAS-280',
        slug: 'yamaha-yas-280',
        brand: 'Yamaha',
        category: 'wind',
        price: 89990,
        oldPrice: 94990,
        stockQuantity: 4,
        description: 'Альт-саксофон Yamaha YAS-280 для начинающих и продолжающих музыкантов. Легкость игры и яркий звук.',
        specifications: {
            'Строй': 'Eb',
            'Корпус': 'Латунь',
            'Покрытие': 'Золотой лак',
            'Клапаны': 'Улучшенная механика',
            'Мундштук': 'AS-4C в комплекте',
            'Эска': 'Регулируемая',
            'Кейс': 'Легкий кейс в комплекте',
            'Вес': '2.3 кг'
        },
        isFeatured: false,
        isNew: false
    },
    {
        sku: 'YAM-YTR2330',
        name: 'Yamaha YTR-2330',
        slug: 'yamaha-ytr-2330',
        brand: 'Yamaha',
        category: 'wind',
        price: 45990,
        stockQuantity: 6,
        description: 'Труба Yamaha YTR-2330 - отличный выбор для начинающих трубачей. Легкий отклик и интонационная точность.',
        specifications: {
            'Строй': 'Bb',
            'Мензура': 'ML',
            'Раструб': '123 мм',
            'Материал': 'Латунь',
            'Покрытие': 'Золотой лак',
            'Вентили': 'Нержавеющая сталь',
            'Мундштук': 'TR-11B4',
            'Кейс': 'В комплекте'
        },
        isFeatured: false,
        isNew: true
    },

    // Студийное оборудование
    {
        sku: 'SHURE-SM58',
        name: 'Shure SM58',
        slug: 'shure-sm58',
        brand: 'Shure',
        category: 'studio',
        price: 8990,
        stockQuantity: 20,
        description: 'Легендарный вокальный микрофон Shure SM58. Стандарт индустрии для живых выступлений.',
        specifications: {
            'Тип': 'Динамический',
            'Диаграмма направленности': 'Кардиоида',
            'Частотный диапазон': '50 - 15000 Гц',
            'Чувствительность': '-54.5 дБВ/Па',
            'Импеданс': '150 Ом',
            'Разъем': 'XLR',
            'Вес': '298 г',
            'Аксессуары': 'Держатель, чехол'
        },
        isFeatured: false,
        isNew: false
    },
    {
        sku: 'SHURE-SM57',
        name: 'Shure SM57',
        slug: 'shure-sm57',
        brand: 'Shure',
        category: 'studio',
        price: 8490,
        stockQuantity: 15,
        description: 'Инструментальный микрофон Shure SM57. Идеален для записи гитарных усилителей и ударных.',
        specifications: {
            'Тип': 'Динамический',
            'Диаграмма направленности': 'Кардиоида',
            'Частотный диапазон': '40 - 15000 Гц',
            'Чувствительность': '-56.0 дБВ/Па',
            'Импеданс': '150 Ом',
            'Разъем': 'XLR',
            'Максимальное SPL': '94 дБ',
            'Вес': '284 г'
        },
        isFeatured: false,
        isNew: false
    },

    // Аксессуары
    {
        sku: 'DADDARIO-EXL110',
        name: 'D\'Addario EXL110',
        slug: 'daddario-exl110',
        brand: 'D\'Addario',
        category: 'accessories',
        price: 590,
        stockQuantity: 100,
        description: 'Струны для электрогитары D\'Addario EXL110. Никелированная обмотка, калибр 10-46.',
        specifications: {
            'Калибр': '.010, .013, .017, .026, .036, .046',
            'Материал': 'Никелированная сталь',
            'Натяжение': 'Regular Light',
            'Упаковка': 'Герметичная'
        },
        isFeatured: false,
        isNew: false
    },
    {
        sku: 'DUNLOP-TORTEX',
        name: 'Dunlop Tortex Standard',
        slug: 'dunlop-tortex-standard',
        brand: 'Dunlop',
        category: 'accessories',
        price: 50,
        stockQuantity: 500,
        description: 'Медиаторы Dunlop Tortex Standard 0.88mm. Классические медиаторы с отличным контролем.',
        specifications: {
            'Толщина': '0.88 мм',
            'Материал': 'Tortex',
            'Цвет': 'Зеленый',
            'Форма': 'Standard'
        },
        isFeatured: false,
        isNew: false
    }
];

// Функция для создания slug
function createSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Основная функция заполнения
async function seed() {
    const client = await pool.connect();
    
    try {
        console.log('🌱 Начинаем заполнение базы данных...\n');
        
        await client.query('BEGIN');
        
        // 1. Создаем тестовых пользователей
        console.log('👤 Создаем пользователей...');
        
        const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
        const userPassword = await bcrypt.hash('password123', 10);
        
        const adminResult = await client.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE
            SET password_hash = $2, first_name = $3, last_name = $4
            RETURNING id
        `, ['admin@mustore.ru', adminPassword, 'Администратор', 'Системы', 'admin']);
        
        const userResult = await client.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE
            SET password_hash = $2, first_name = $3, last_name = $4
            RETURNING id
        `, ['user@example.com', userPassword, 'Иван', 'Иванов', 'customer']);
        
        console.log('✅ Пользователи созданы\n');
        
        // 2. Создаем дополнительные бренды если нужно
        console.log('🏷️  Создаем бренды...');
        
        const brands = ['D\'Addario', 'Dunlop'];
        for (const brandName of brands) {
            await client.query(`
                INSERT INTO brands (name, slug, country)
                VALUES ($1, $2, $3)
                ON CONFLICT (slug) DO NOTHING
            `, [brandName, createSlug(brandName), 'США']);
        }
        
        console.log('✅ Бренды созданы\n');
        
        // 3. Добавляем товары
        console.log('📦 Добавляем товары...');
        
        let addedCount = 0;
        
        for (const product of testProducts) {
            try {
                // Получаем ID бренда
                const brandResult = await client.query(
                    'SELECT id FROM brands WHERE slug = $1',
                    [createSlug(product.brand)]
                );
                
                if (brandResult.rows.length === 0) {
                    console.log(`⚠️  Бренд ${product.brand} не найден, пропускаем товар ${product.name}`);
                    continue;
                }
                
                const brandId = brandResult.rows[0].id;
                
                // Получаем ID категории
                const categoryResult = await client.query(
                    'SELECT id FROM categories WHERE slug = $1',
                    [product.category]
                );
                
                if (categoryResult.rows.length === 0) {
                    console.log(`⚠️  Категория ${product.category} не найдена, пропускаем товар ${product.name}`);
                    continue;
                }
                
                const categoryId = categoryResult.rows[0].id;
                
                // Получаем ID подкатегории если есть
                let subcategoryId = null;
                if (product.subcategory) {
                    const subcategoryResult = await client.query(
                        'SELECT id FROM subcategories WHERE slug = $1 AND category_id = $2',
                        [product.subcategory, categoryId]
                    );
                    
                    if (subcategoryResult.rows.length > 0) {
                        subcategoryId = subcategoryResult.rows[0].id;
                    }
                }
                
                // Вставляем товар
                const productResult = await client.query(`
                    INSERT INTO products (
                        sku, name, slug, brand_id, category_id, subcategory_id,
                        description, specifications, price, old_price, cost_price,
                        stock_quantity, is_available, is_featured, is_new
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (sku) DO UPDATE
                    SET 
                        name = $2, 
                        price = $9, 
                        old_price = $10,
                        stock_quantity = $12,
                        is_featured = $14,
                        is_new = $15,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [
                    product.sku,
                    product.name,
                    product.slug,
                    brandId,
                    categoryId,
                    subcategoryId,
                    product.description,
                    JSON.stringify(product.specifications || {}),
                    product.price,
                    product.oldPrice || null,
                    Math.round(product.price * 0.7), // cost_price = 70% от цены
                    product.stockQuantity || 0,
                    true, // is_available
                    product.isFeatured || false,
                    product.isNew || false
                ]);
                
                const productId = productResult.rows[0].id;
                
                // Добавляем изображение-заглушку
                await client.query(`
                    INSERT INTO product_images (product_id, image_url, is_primary)
                    VALUES ($1, $2, $3)
                    ON CONFLICT ON CONSTRAINT unique_primary_image DO NOTHING
                `, [
                    productId,
                    `https://picsum.photos/seed/${product.sku}/400/400`,
                    true
                ]);
                
                addedCount++;
                console.log(`✅ Добавлен товар: ${product.name}`);
                
            } catch (error) {
                console.error(`❌ Ошибка при добавлении товара ${product.name}:`, error.message);
            }
        }
        
        console.log(`\n✅ Добавлено товаров: ${addedCount}\n`);
        
        // 4. Создаем тестовые заказы
        console.log('📋 Создаем тестовые заказы...');
        
        // Заказ для пользователя
        const orderResult = await client.query(`
            INSERT INTO orders (
                order_number, user_id, status, total_amount,
                customer_name, customer_email, customer_phone,
                delivery_address, delivery_method, payment_method
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            ) RETURNING id
        `, [
            '2024000001',
            userResult.rows[0].id,
            'delivered',
            89990,
            'Иван Иванов',
            'user@example.com',
            '+7 (900) 123-45-67',
            'г. Нижний Новгород, ул. Ленина, д. 1, кв. 1',
            'delivery',
            'cash'
        ]);
        
        // Добавляем товары в заказ
        const orderProductResult = await client.query(
            'SELECT id, name, sku, price FROM products WHERE sku = $1',
            ['FEN-STRAT-PLR']
        );
        
        if (orderProductResult.rows.length > 0) {
            const orderProduct = orderProductResult.rows[0];
            await client.query(`
                INSERT INTO order_items (
                    order_id, product_id, product_name, product_sku,
                    quantity, price, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                orderResult.rows[0].id,
                orderProduct.id,
                orderProduct.name,
                orderProduct.sku,
                1,
                orderProduct.price,
                orderProduct.price
            ]);
        }
        
        console.log('✅ Тестовые заказы созданы\n');
        
        await client.query('COMMIT');
        
        console.log('🎉 Заполнение базы данных завершено успешно!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка при заполнении базы данных:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Проверка уникальности для первичного ключа изображения
async function createImageConstraint() {
    try {
        await pool.query(`
            ALTER TABLE product_images 
            ADD CONSTRAINT unique_primary_image 
            UNIQUE (product_id, is_primary) 
            WHERE (is_primary = true)
        `);
    } catch (error) {
        // Игнорируем, если ограничение уже существует
    }
}

// Запуск
(async () => {
    try {
        await createImageConstraint();
        await seed();
        process.exit(0);
    } catch (error) {
        console.error('Критическая ошибка:', error);
        process.exit(1);
    }
})();