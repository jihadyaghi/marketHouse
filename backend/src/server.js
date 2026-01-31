require("dotenv").config();
const app = require("./app");
const PORT = process.env.MYSQLPORT || 5000;
app.listen(PORT , ()=>{
    console.log("Server running on port " + PORT);
});