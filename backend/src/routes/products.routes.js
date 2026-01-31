const router = require("express").Router();
const products = require("../controllers/products.controller");

router.get("/", products.getAll);
router.get("/:id", products.getOne);
router.post("/", products.create);

module.exports = router;