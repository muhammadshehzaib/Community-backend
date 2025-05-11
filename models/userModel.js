const { Schema, default: mongoose, model } = require("mongoose");

const userSchema = new Schema({
   imageUrl: {
      type: String,
      
    },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
    unique : true
  },
  dob: {
    type: Date,
    required: true,  
  },

  password: {
    type: String,
  },
  newPassword:{
    type: String,
  },

  resetToken: String,
  resetTokenExpiry: Date
});


const userModel = new mongoose.model('User', userSchema);
module.exports = userModel;





