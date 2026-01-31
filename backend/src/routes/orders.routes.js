const router = require("express").Router();
const orders = require("../controllers/orders.controller");
const auth = require("../middleware/auth.middleware");
const adminOnly = require("../middleware/admin.middleware");

//  (Admin) Get all orders + filters
router.get("/", auth, adminOnly, orders.getAll);

// (Admin) Get one order with items
router.get("/:id", auth, adminOnly, orders.getOne);

// (Customer) Create order
router.post("/", auth, orders.create);

//  (Admin) Update order status
router.patch("/:id/status", auth, adminOnly, orders.updateStatus);

module.exports = router;