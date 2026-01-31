const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // {id, role}
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};