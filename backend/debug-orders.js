const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mustore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

async function debugOrders() {
    try {
        console.log('=== ОТЛАДКА ЗАКАЗОВ ===\n');
        
        // 1. Проверяем всех пользователей
        console.log('1. Пользователи в системе:');
        const users = await pool.query('SELECT id, email, role FROM users');
        users.rows.forEach(user => {
            console.log(`   - ${user.email} (ID: ${user.id}, Role: ${user.role})`);
        });
        
        // 2. Проверяем все заказы
        console.log('\n2. Все заказы в системе:');
        const orders = await pool.query(`
            SELECT id, order_number, user_id, customer_email, created_at 
            FROM orders 
            ORDER BY created_at DESC
        `);
        
        if (orders.rows.length === 0) {
            console.log('   Заказов нет');
        } else {
            for (const order of orders.rows) {
                console.log(`   - Заказ ${order.order_number}:`);
                console.log(`     ID: ${order.id}`);
                console.log(`     User ID: ${order.user_id || 'NULL (гостевой заказ)'}`);
                console.log(`     Email: ${order.customer_email}`);
                console.log(`     Дата: ${order.created_at}`);
                
                // Проверяем, кому принадлежит заказ
                if (order.user_id) {
                    const user = await pool.query('SELECT email FROM users WHERE id = $1', [order.user_id]);
                    if (user.rows.length > 0) {
                        console.log(`     Принадлежит пользователю: ${user.rows[0].email}`);
                    } else {
                        console.log(`     ОШИБКА: User ID ${order.user_id} не найден в базе!`);
                    }
                }
                console.log('');
            }
        }
        
        // 3. Проверяем заказы конкретного пользователя
        console.log('\n3. Заказы пользователя user@example.com:');
        const userOrders = await pool.query(`
            SELECT o.* 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE u.email = $1
        `, ['user@example.com']);
        
        console.log(`   Найдено заказов: ${userOrders.rows.length}`);
        
        // 4. Проверяем корзины
        console.log('\n4. Активные корзины:');
        const carts = await pool.query(`
            SELECT c.id, c.user_id, c.session_id, u.email,
                   COUNT(ci.id) as items_count
            FROM carts c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            GROUP BY c.id, c.user_id, c.session_id, u.email
        `);
        
        carts.rows.forEach(cart => {
            console.log(`   - Cart ID: ${cart.id}`);
            console.log(`     User: ${cart.email || 'Гость'} (session: ${cart.session_id || 'нет'})`);
            console.log(`     Товаров: ${cart.items_count}`);
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await pool.end();
    }
}

debugOrders();