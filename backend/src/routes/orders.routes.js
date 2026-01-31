const router = require("express").Router();
const orders = require("../controllers/orders.controller");
router.get("/", orders.getAll);
router.get("/:id", orders.getOne);
router.post("/", orders.create);

module.exports = router;