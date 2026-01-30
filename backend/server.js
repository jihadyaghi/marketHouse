const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const app = express();
app.use(cors());
app.use(express.json());
app.get("/" , (req,res)=>{
    res.send("MarketHouse API is runing");
});
app.get("/test-db" , async (req,res)=>{
    try{
        const [rows] = await db.promise().query("Show tables");
        res.json(rows);
    }
    catch(err){
        console.error(err);
        res.status(500).json({error:"DB error" , details:err.message});
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT , ()=> console.log("Server runing on port " + PORT))