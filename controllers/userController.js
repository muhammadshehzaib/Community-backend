const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const passwordHash = require("password-hash");

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
    const hashedPassword = passwordHash.generate(req.body.password);

    const newUser = new userModel({ ...req.body, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.authenticationKey);
    res.status(200).json({ user: newUser, token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error });
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
