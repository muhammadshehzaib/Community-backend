const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const passwordHash = require("password-hash");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const v2 = require("../utils/cloudinaryConfig");




module.exports.checkAuthenticity = async (token) => {
    let tokenToProceed;
    if (token.startsWith("Bearer")) {
      tokenToProceed = token.replace("Bearer ", "");
    } else {
      tokenToProceed = token;
    }
  const decoded = jwt.decode(tokenToProceed, process.env.authenticationKey);
  const user = await userModel.findById(decoded?.id);
  if (user) {
    return true;
  } else {
    return false;
  }
};

module.exports.getIdFromToken = async (token) => {
  let tokenToProceed;
  if (token.startsWith("Bearer")) {
    tokenToProceed = token.replace("Bearer ", "");
  } else {
    tokenToProceed = token;
  }
  const decoded = await jwt.decode(
    tokenToProceed,
    process.env.authenticationKey
  );
  return decoded?.id;
};

module.exports.signUp = async (req, res) => {
  try {
    const userData = req.body;
    
    const hashedPassword = passwordHash.generate(userData.password);
    
    let imageUrl = null;
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const upload = v2?.uploader?.upload_stream((error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          upload?.end(req?.file?.buffer);
        });
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        // Continue with signup even if image upload fails
      }
    }
    
    // Create the new user with the image URL
    const newUser = new userModel({
      ...userData,
      password: hashedPassword,
      imageUrl: imageUrl || null // Add the image URL to the user data
    });
    
    // Save the user to the database
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.authenticationKey);
    
    // Return the user data and token
    res.status(200).json({ user: newUser, token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Failed to sign up", error: error.message });
  }
};
module.exports.logIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not exist" });
    }
    const passwordCorrect = passwordHash.verify(password, user.password);
    if (!passwordCorrect) {
      return res.status(400).json({ message: "Wrong Password!" });
    }

    const token = jwt.sign({id : user._id}, process.env.authenticationKey);

    res.status(200).json({ user, token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error });
  }
};

module.exports.authMe = async (req, res) => {
  try {
    const userId = await this.getIdFromToken(req.header("Authorization"));
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "No Authenticated user found!" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error });
  }
};

module.exports.getAllUsers = async (req, res) => {
  try {
    const authenticated = await this.checkAuthenticity(
      req.header("Authorization")
    );
    const allUsers = await userModel.find();
    if (authenticated) {
      res.status(200).json(allUsers);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error });
  }
};

// Configure nodemailer (you'll need to set these environment variables)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Request password reset
module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    // Save reset token and expiry to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Create reset URL
    // const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    const resetUrl = `https://community-frontend-rho.vercel.app/reset-password/${resetToken}`;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        `
      };
      
      // <p>${resetToken}</p>        
    
    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Password reset link sent to email" 
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      error: "Error sending password reset email" 
    });
  }
};

// Reset password
module.exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Find user with valid reset token
    const user = await userModel.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token" 
      });
    }

    // Hash new password and update user
    const hashedPassword = passwordHash.generate(newPassword);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Generate new auth token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.authenticationKey
    );

    res.status(200).json({ 
      message: "Password reset successful",
      token 
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      error: "Error resetting password" 
    });
  }
};

module.exports.updateUserProfile = async (req, res) => {
  console.log("updateUserProfile called");

  try {
    console.log("Getting Authorization header");
    const authHeader = req.header("Authorization");
    console.log("Authorization Header:", authHeader);

    console.log("Checking authenticity");
    const authenticated = await this.checkAuthenticity(authHeader);
    console.log("Authenticated:", authenticated);

    if (!authenticated) {
      console.log("Authentication failed");
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("Getting user ID from token");
    const userId = await this.getIdFromToken(authHeader);
    console.log("User ID:", userId);

    console.log("Constructing updateData object");
    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dob: req.body.dob,
    };
    console.log("updateData initial:", updateData);

    if (req.file) {
      console.log("File detected in request:", req.file.originalname);
      try {
        console.log("Uploading image to Cloudinary");
        const result = await new Promise((resolve, reject) => {
          console.log("Creating upload stream");
          const upload = v2.uploader.upload_stream(
            { resource_type: "auto" },
            (error, result) => {
              if (error) {
                console.log("Upload error:", error);
                return reject(error);
              }
              console.log("Upload result:", result);
              resolve(result);
            }
          );
          console.log("Ending upload stream");
          upload.end(req.file.buffer);
        });

        console.log("Image uploaded successfully");
        updateData.imageUrl = result.secure_url;
        console.log("updateData.imageUrl:", updateData.imageUrl);

      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        updateData.imageUrl = null;
        console.log("Set updateData.imageUrl to null");
      }
    } else {
      console.log("No file in request");
    }

    console.log("Cleaning undefined fields from updateData");
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        console.log(`Deleting undefined field: ${key}`);
        delete updateData[key];
      }
    });
    console.log("Cleaned updateData:", updateData);

    console.log("Updating user in database");
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).select('-password -resetToken -resetTokenExpiry -newPassword');

    console.log("Updated user:", updatedUser);

    if (!updatedUser) {
      console.log("User not found in DB");
      return res.status(404).json({
        message: "User not found"
      });
    }

    console.log("Sending success response");
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.log("Caught error:", error);
    res.status(500).json({
      error: "Error updating profile",
      details: error.message
    });
  }
};

module.exports.getProfile = async (req, res) => {
  try {
    // First verify the user is authenticated
    const authenticated = await this.checkAuthenticity(
      req.header("Authorization")
    );
    
    if (!authenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get user ID from token
    const userId = await this.getIdFromToken(req.header("Authorization"));

    // Find user and exclude sensitive information
    const user = await userModel.findById(userId)
      .select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      user: user
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Error retrieving profile",
      details: error.message
    });
  }
};