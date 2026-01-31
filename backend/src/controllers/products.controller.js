const db = require("../config/db");
exports.getAll = async (req, res, next) => { //get all products
  try {
    const { category_id, offer, search } = req.query;

    let sql = `
      SELECT 
        p.id, p.name, p.price, p.description, p.image,
        p.category_id, c.name AS category_name,
        p.is_offer, p.offer_price, p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      sql += " AND p.category_id = ?";
      params.push(Number(category_id));
    }

    if (offer === "true") {
      sql += " AND p.is_offer = TRUE";
    }

    if (search && search.trim()) {
      sql += " AND p.name LIKE ?";
      params.push(`%${search.trim()}%`);
    }

    sql += " ORDER BY p.id DESC";

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
exports.getOne = async (req, res, next) => { //get product by id
  try {
    const id = Number(req.params.id);

    const [rows] = await db.promise().query(
      `SELECT 
        p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      const e = new Error("Product not found");
      e.status = 404;
      throw e;
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
exports.create = async (req, res, next) => { //create new product
  try {
    const {
      name,
      price,
      description = null,
      image = null,
      category_id = null,
      is_offer = false,
      offer_price = null,
    } = req.body;

    if (!name || !name.trim()) {
      const e = new Error("Product name is required");
      e.status = 400;
      throw e;
    }

    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      const e = new Error("Valid price is required");
      e.status = 400;
      throw e;
    }

    const offerBool = Boolean(is_offer);
    const offerNumeric = offer_price !== null && offer_price !== "" ? Number(offer_price) : null;

    if (offerBool && (!offerNumeric || offerNumeric <= 0)) {
      const e = new Error("offer_price is required when is_offer is true");
      e.status = 400;
      throw e;
    }

    const [result] = await db.promise().query(
      `INSERT INTO products 
      (name, price, description, image, category_id, is_offer, offer_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        numericPrice,
        description,
        image,
        category_id ? Number(category_id) : null,
        offerBool,
        offerNumeric,
      ]
    );

    res.status(201).json({ id: result.insertId, message: "Product created" });
  } catch (err) {
    next(err);
  }
};