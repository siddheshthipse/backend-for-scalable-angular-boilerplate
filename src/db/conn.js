//This is file contains code for making connection with database i.e MongoDB

//Creating the database named 'boilerplate'
const mongoose=require("mongoose");
mongoose.connect("mongodb://localhost:27017/boilerplate",{
    useFindAndModify:false
}).then(()=>{
    console.log("Connection is established");
}).catch((err)=>{
    console.log("No connection");
});