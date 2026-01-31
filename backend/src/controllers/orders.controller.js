const db = require("../config/db");
function isAdmin(req) {
  return req.user && req.user.role === "admin";
}
exports.getAll = async (req, res, next) => {
  try {
    if (!isAdmin(req)) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }

    const { user_id, status } = req.query;

    let sql = `
      SELECT 
        o.id, o.user_id, u.name AS user_name, u.email AS user_email,
        o.total, o.status, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      sql += " AND o.user_id = ?";
      params.push(Number(user_id));
    }

    if (status) {
      sql += " AND o.status = ?";
      params.push(status);
    }

    sql += " ORDER BY o.id DESC";

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// CUSTOMER: my orders
exports.myOrders = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);

    const [rows] = await db.promise().query(
      `
      SELECT 
        o.id, o.total, o.status, o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.id DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// CUSTOMER: get one order (only his) OR admin
exports.getOne = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user.id);

    // if not admin -> must own order
    const where = isAdmin(req) ? "o.id = ?" : "o.id = ? AND o.user_id = ?";

    const params = isAdmin(req) ? [id] : [id, userId];

    const [orders] = await db.promise().query(
      `
      SELECT 
        o.id, o.user_id, u.name AS user_name, u.email AS user_email,
        o.total, o.status, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE ${where}
      `,
      params
    );

    if (orders.length === 0) {
      const e = new Error("Order not found");
      e.status = 404;
      throw e;
    }

    const [items] = await db.promise().query(
      `
      SELECT 
        oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price,
        p.name AS product_name, p.image
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [id]
    );

    res.json({ ...orders[0], items });
  } catch (err) {
    next(err);
  }
};

// CUSTOMER: create order (uses req.user.id)
exports.create = async (req, res, next) => {
  const conn = await db.promise().getConnection();
  try {
    const userId = Number(req.user.id);
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      const e = new Error("items must be a non-empty array");
      e.status = 400;
      throw e;
    }

    for (const it of items) {
      if (!it.product_id || !it.quantity || Number(it.quantity) <= 0) {
        const e = new Error("Each item must have product_id and quantity > 0");
        e.status = 400;
        throw e;
      }
    }

    await conn.beginTransaction();

    // 1) create order
    const [orderResult] = await conn.query(
      "INSERT INTO orders (user_id, total, status) VALUES (?, 0, 'pending')",
      [userId]
    );

    const orderId = orderResult.insertId;

    // 2) get product prices
    const productIds = [...new Set(items.map((it) => Number(it.product_id)))];

    const placeholders = productIds.map(() => "?").join(",");
    const [products] = await conn.query(
      `SELECT id, price, is_offer, offer_price 
       FROM products 
       WHERE id IN (${placeholders})`,
      productIds
    );

    const priceMap = new Map();
    for (const p of products) {
      const finalPrice = p.is_offer ? Number(p.offer_price) : Number(p.price);
      priceMap.set(p.id, finalPrice);
    }

    // validate all products exist
    for (const it of items) {
      if (!priceMap.has(Number(it.product_id))) {
        const e = new Error(`Product not found: ${it.product_id}`);
        e.status = 400;
        throw e;
      }
    }

    // 3) insert items + calculate total
    let total = 0;

    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);
      const price = priceMap.get(pid);

      total += price * qty;

      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, pid, qty, price]
      );
    }

    // 4) update total
    await conn.query("UPDATE orders SET total = ? WHERE id = ?", [
      total,
      orderId,
    ]);

    await conn.commit();

    res.status(201).json({
      id: orderId,
      total,
      status: "pending",
      message: "Order created",
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    next(err);
  } finally {
    conn.release();
  }
};