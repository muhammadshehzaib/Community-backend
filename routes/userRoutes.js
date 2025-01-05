const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router()

router.post('/sign-up', userController.signUp)
router.post('/log-in', userController.logIn)
router.get('/auth-me', userController.authMe)
router.get('/all-users', userController.getAllUsers)
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.put("/update-profile", userController.updateUserProfile);
router.get("/profile", userController.getProfile);


module.exports = router