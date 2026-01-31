const express = require("express");
const cors = require("cors");

const categoriesRoutes = require("./routes/categories.routes");
const productsRoutes = require("./routes/products.routes");

const notFound = require("./middleware/notfound.middleware");
const errorHandler = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("MarketHouse API is running "));

app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;