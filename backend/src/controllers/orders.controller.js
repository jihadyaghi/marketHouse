const db = require("../config/db");

// Allowed statuses for orders
const ALLOWED_STATUSES = new Set(["pending", "confirmed", "delivered", "canceled"]);

// GET /api/orders?user_id=&status=   (عادة للأدمن)
exports.getAll = async (req, res, next) => {
  try {
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

// GET /api/orders/:id   (عادة للأدمن)
exports.getOne = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const [orders] = await db.promise().query(
      `
      SELECT 
        o.id, o.user_id, u.name AS user_name, u.email AS user_email,
        o.total, o.status, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      `,
      [id]
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

// POST /api/orders  (زبون/مستخدم)
exports.create = async (req, res, next) => {
  const conn = await db.promise().getConnection();
  try {
    const { user_id, items } = req.body;

    if (!user_id) {
      const e = new Error("user_id is required");
      e.status = 400;
      throw e;
    }

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

    // create order with total=0 first
    const [orderResult] = await conn.query(
      "INSERT INTO orders (user_id, total, status) VALUES (?, 0, 'pending')",
      [Number(user_id)]
    );

    const orderId = orderResult.insertId;

    // fetch products prices
    const productIds = items.map((it) => Number(it.product_id));
    const placeholders = productIds.map(() => "?").join(",");

    const [products] = await conn.query(
      `SELECT id, price, is_offer, offer_price FROM products WHERE id IN (${placeholders})`,
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

    let total = 0;

    // insert items
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

    // update total
    await conn.query("UPDATE orders SET total = ? WHERE id = ?", [total, orderId]);

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

// PATCH /api/orders/:id/status  (أدمن)
exports.updateStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!id) {
      const e = new Error("Invalid order id");
      e.status = 400;
      throw e;
    }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      const e = new Error("Invalid status");
      e.status = 400;
      throw e;
    }

    // ensure order exists
    const [exists] = await db.promise().query(
      "SELECT id FROM orders WHERE id = ? LIMIT 1",
      [id]
    );

    if (exists.length === 0) {
      const e = new Error("Order not found");
      e.status = 404;
      throw e;
    }

    await db.promise().query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      id,
    ]);

    res.json({ message: "Status updated", id, status });
  } catch (err) {
    next(err);
  }
};