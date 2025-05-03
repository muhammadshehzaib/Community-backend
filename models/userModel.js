const { Schema, default: mongoose, model } = require("mongoose");

const userSchema = new Schema({
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
  // gender: {
  //   enum: ["male", "female", "other"],
  // },
  // life_style_goals: {
  //   type: String,
  // },
  password: {
    type: String,
  },
  newPassword:{
    type: String,
  },
  // phone_number: {
  //   type: Number,
  // },
  // interests: [
  //   {
  //     type: String,
  //   },
  // ],
  resetToken: String,
  resetTokenExpiry: Date
});


const userModel = new mongoose.model('User', userSchema);
module.exports = userModel;





