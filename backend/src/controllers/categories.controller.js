const db = require("../config/db");
exports.getAll = async (req , res , next)=>{ //GEt ALL Categories
    try {
        const [rows] = await db.promise().query("SELECT id , name FROM categories ORDER BY id DESC");
        res.json(rows);
    }
    catch(err){
        next(err);
    }
};
exports.create = async (req , res , next) =>{
    try{
        const {name} = req.body;
        if (!name || !name.trim()){
            const e = new Error("Category name is required");
            e.status = 400;
            throw e ;
        }
        const [result] = await db.promise().query(
            "INSERT INTO categories (name) VALUES (?)",[name.trim()]
        );
        res.status(201).json({id:result.insertId , name:name.trim()});
    }
    catch (err){
        next(err);
    }
};