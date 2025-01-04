const mongoose = require("mongoose");

mongoose.connect(process.env.mongoDbConnection).then(()=>{
    console.log('mongoDB connected');
})