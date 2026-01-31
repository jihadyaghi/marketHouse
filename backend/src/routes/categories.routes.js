const router = require("express").Router();
const categories = require("../controllers/categories.controller");
router.get("/",categories.getAll);
router.post("/" , categories.create);
module.exports = router;