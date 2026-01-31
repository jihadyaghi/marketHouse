const router = require("express").Router();
const orders = require("../controllers/orders.controller");
const auth = require("../middleware/auth.middleware");
// customer: create order
router.post("/", auth, orders.create);
// customer: my orders
router.get("/my", auth, orders.myOrders);
// customer: get one order (only if belongs to him) OR admin
router.get("/:id", auth, orders.getOne);
// admin: list all orders (optional)
router.get("/", auth, orders.getAll);
module.exports = router;