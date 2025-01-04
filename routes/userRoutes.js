const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router()

router.post('/sign-up', userController.signUp)
router.post('/log-in', userController.logIn)
router.get('/auth-me', userController.authMe)
router.get('/all-users', userController.getAllUsers)

module.exports = router