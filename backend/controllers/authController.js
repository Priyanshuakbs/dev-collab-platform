const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Email already exists?
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered hai" });

    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashed });

    res.json({
      token: generateToken(user._id),
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      res.json({
        token: generateToken(user._id),
        user: {              // ← ye missing tha!
          _id:    user._id,
          name:   user.name,
          email:  user.email,
          avatar: user.avatar || "",
        },
      });
    } else {
      res.status(401).json({ message: "Invalid email ya password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
