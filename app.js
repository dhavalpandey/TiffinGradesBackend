if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

//enviorment variables
const PORT = process.env.PORT || 5000;

//Libraries
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const User = require("./User");
const connectDB = require("./db");
connectDB();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

//Routes
app.post("/signup", (req, res) => {
  const { googleId, email, fullName, firstName, imageUrl } = req.body;

  User.findOne({ googleId: googleId }).then((user) => {
    if (user) {
      return res
        .status(200)
        .json({ status: "OK", message: "Login successful!" });
    } else {
      const newUser = new User({
        googleId,
        email,
        fullName,
        firstName,
        imageUrl,
      });
      newUser
        .save()
        .then((user) => {
          return res
            .status(200)
            .json({ status: "OK", message: "Login successful!" });
        })
        .catch((err) => {
          console.log(err);
          return res
            .status(500)
            .json({ message: "Login failed. Please try again." });
        });
    }
  });
});

app.listen(PORT, console.log(`Server running at port ${PORT}`));
