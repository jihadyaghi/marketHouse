const express = require("express");
const cors = require("cors");

const categoriesRoutes = require("./routes/categories.routes");
const productsRoutes = require("./routes/products.routes");
const ordersRoutes = require("./routes/orders.routes")
const notFound = require("./middleware/notfound.middleware");
const errorHandler = require("./middleware/error.middleware");
const authRoutes = require("./routes/auth.routes");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("MarketHouse API is running "));

app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders" , ordersRoutes);
app.use("/api/auth" , authRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;