// create-test-order.js
// Скрипт для создания тестового заказа напрямую в БД

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mustore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

async function createTestOrder() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Находим пользователя
        const userResult = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            ['user@example.com']
        );
        
        if (userResult.rows.length === 0) {
            console.error('Пользователь user@example.com не найден!');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('Найден пользователь:', user.email, 'ID:', user.id);
        
        // 2. Находим товар для заказа
        const productResult = await pool.query(
            'SELECT id, name, sku, price FROM products WHERE is_available = true LIMIT 1'
        );
        
        if (productResult.rows.length === 0) {
            console.error('Нет доступных товаров!');
            return;
        }
        
        const product = productResult.rows[0];
        console.log('Выбран товар:', product.name);
        
        // 3. Создаем заказ
        const orderNumber = `TEST-${Date.now()}`;
        const orderResult = await client.query(`
            INSERT INTO orders (
                order_number, user_id, status, payment_status,
                subtotal, delivery_amount, total_amount,
                customer_name, customer_email, customer_phone,
                delivery_method, payment_method
            ) VALUES (
                $1, $2, 'pending', 'pending',
                $3, $4, $5,
                $6, $7, $8,
                $9, $10
            ) RETURNING *
        `, [
            orderNumber,
            user.id,  // ВАЖНО: user_id
            product.price,
            0,
            product.price,
            'Тестовый Пользователь',
            user.email,
            '+7 (999) 123-45-67',
            'pickup',
            'cash'
        ]);
        
        const order = orderResult.rows[0];
        console.log('Создан заказ:', order.order_number, 'с user_id:', order.user_id);
        
        // 4. Добавляем товар в заказ
        await client.query(`
            INSERT INTO order_items (
                order_id, product_id, product_name, product_sku,
                quantity, price, subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            order.id,
            product.id,
            product.name,
            product.sku,
            1,
            product.price,
            product.price
        ]);
        
        await client.query('COMMIT');
        
        console.log('\n✅ Тестовый заказ успешно создан!');
        console.log('Номер заказа:', orderNumber);
        console.log('Пользователь:', user.email);
        console.log('User ID:', user.id);
        
        // 5. Проверяем, что заказ виден
        const checkResult = await pool.query(
            'SELECT COUNT(*) FROM orders WHERE user_id = $1',
            [user.id]
        );
        console.log('\nВсего заказов у пользователя:', checkResult.rows[0].count);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createTestOrder();