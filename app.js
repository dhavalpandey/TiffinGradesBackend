if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

//enviorment variables
const PORT = process.env.PORT || 5000;

//Libraries
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");

const User = require("./User");
const connectDB = require("./db");
connectDB();

app.use(
  cors({
    origin: ["https://tiffingrades.netlify.app", "http://localhost:3000"],
  }),
);
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

app.post("/adjectives", async (req, res) => {
  const { googleId, state } = req.body;
  User.findOneAndUpdate(
    { googleId: googleId },
    { adjectives: state },
    function (err, result) {
      if (err) {
        return res.status(500).json({ status: "ERR", message: err });
      } else {
        return res
          .status(200)
          .json({ status: "OK", message: "Upload complete!" });
      }
    },
  );
});

app.post("/options", async (req, res) => {
  const { googleId, data, topThreeSubjects } = req.body;
  User.findOneAndUpdate(
    { googleId: googleId },
    { options: data },
    function (err, result) {
      if (err) {
        return res.status(500).json({ status: "ERR", message: err });
      } else {
        User.findOneAndUpdate(
          { googleId: googleId },
          { topThreeSubjects: topThreeSubjects },
          (err, result) => {
            if (err) {
              return res.status(500);
            } else {
              return res.status(200);
            }
          },
        );
        return res
          .status(200)
          .json({ status: "OK", message: "Upload complete!" });
      }
    },
  );
});

app.listen(PORT, console.log(`Server running at port ${PORT}`));
