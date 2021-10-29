//In this file we define the schema of the collection
const mongoose = require("mongoose");
const jwt=require('jsonwebtoken');

//Defining all the fields that would be in a collection
const userSchema = new mongoose.Schema({
    email: {
        type: String,
    },
    username: {
        type: String
    },
    password:{
        type:String,
    },
    language:{
        type:String
    },
    tokens:[{
        token:{
            type:String
        }
    }]
});

//Generating Tokens
userSchema.methods.generateAuthToken=async function(){
    try{
        const currenttoken=jwt.sign({_id:this._id},"appleorangelemonpineapplewatermelonguavacherry");
        this.tokens=this.tokens.concat({token:currenttoken});
        return currenttoken;
    }catch(error){
        res.send('Failed to generate the JWT Token');
    }
}

//Creating a new Collection i.e table named 'User'
const User=new mongoose.model("User",userSchema);
module.exports=User;