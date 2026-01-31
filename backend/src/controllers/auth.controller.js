const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const e = new Error("name, email, password are required");
      e.status = 400;
      throw e;
    }

    const [exists] = await db.promise().query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (exists.length > 0) {
      const e = new Error("Email already registered");
      e.status = 409;
      throw e;
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.promise().query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'customer')",
      [name.trim(), email.trim().toLowerCase(), hash]
    );

    const token = signToken({ id: result.insertId, role: "customer" });

    res.status(201).json({
      message: "Registered",
      token,
      user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: "customer" }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.promise().query(
      "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      const e = new Error("Invalid email or password");
      e.status = 401;
      throw e;
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      const e = new Error("Invalid email or password");
      e.status = 401;
      throw e;
    }

    const token = signToken({ id: user.id, role: user.role });

    res.json({
      message: "Logged in",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};