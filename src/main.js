/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15; // 15% для первого места
    } else if (index === 1 || index === 2) {
        return seller.profit * 0.10; // 10% для второго и третьего места
    } else if (index === total - 1) {
        return 0; // 0% для последнего места
    } else {
        return seller.profit * 0.05; // 5% для всех остальных
    } 
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (typeof options !== 'object' || options === null) {
        throw new Error('Options должен быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('calculateRevenue и calculateBonus должны быть функциями');
    }

    // Проверка уникальности ключей
    const sellerIds = new Set(data.sellers.map(seller => seller.id));
    if (sellerIds.size !== data.sellers.length) {
        throw new Error('Обнаружены дубликаты id продавцов');
    }

    const productSkus = new Set(data.products.map(product => product.sku));
    if (productSkus.size !== data.products.length) {
        throw new Error('Обнаружены дубликаты sku товаров');
    }

    // Создание productIndex
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // Создание sellerStats и sellerIndex
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
    }));

    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.id, stat])
    );

        // Бизнес-логика: обработка purchase_records
        data.purchase_records.forEach(record => {
            const seller = sellerIndex[record.seller_id]; // Получаем продавца
            if (!seller) {
                throw new Error(`Продавец с id ${record.seller_id} не найден`);
            }
    
            // Увеличиваем счётчик продаж (за каждый чек)
            seller.sales_count += 1;
            // Увеличиваем выручку на сумму чека
            seller.revenue += record.total_amount;
    
            // Перебираем товары в чеке
            record.items.forEach(item => {
                const product = productIndex[item.sku]; // Получаем товар
                if (!product) {
                    throw new Error(`Товар с sku ${item.sku} не найден`);
                }
    
                // Вычисляем себестоимость
                const cost = product.purchase_price * item.quantity;
                // Вычисляем выручку с учётом скидки
                const revenue = calculateRevenue(item, item.quantity);
                // Вычисляем прибыль
                const profit = revenue - cost;
                // Увеличиваем общую прибыль продавца
                seller.profit += profit;
    
                // Обновляем счётчик проданных товаров
                if (!seller.products_sold[item.sku]) {
                    seller.products_sold[item.sku] = 0;
                }
                seller.products_sold[item.sku] += item.quantity;
            });
        });
    
        // Сортировка продавцов по прибыли (по убыванию)
        sellerStats.sort((a, b) => b.profit - a.profit);
    
        // Назначение бонусов и формирование топ-10 продуктов
        sellerStats.forEach((seller, index) => {
            // Рассчитываем бонус с помощью calculateBonus
            seller.bonus = calculateBonus(seller, index, sellerStats.length);
    
            // Формируем топ-10 продуктов
            seller.top_products = Object.entries(seller.products_sold)
                .map(([sku, quantity]) => ({ sku, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);
        });
    
        return sellerStats;
    }
