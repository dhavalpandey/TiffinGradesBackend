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
const Subject = require("./Subject");
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
  let numberOfUpdates;
  let points;

  User.findOneAndUpdate(
    { googleId: googleId },
    { options: data },
    (err, result) => {
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

        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            Subject.findOne({ subject: key }, (err, result) => {
              if (err) {
                return res.status(500);
                console.log(err);
              } else {
                numberOfUpdates = result.numberOfUpdates;
                points = result.points;

                Subject.findOneAndUpdate(
                  { subject: key },
                  { points: Math.round(points + data[key]) },
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      return res.status(500);
                    } else {
                      return res.status(200);
                    }
                  },
                );

                Subject.findOneAndUpdate(
                  { subject: key },
                  { numberOfUpdates: numberOfUpdates + 1 },
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      return res.status(500);
                    } else {
                      return res.status(200);
                    }
                  },
                );
                return res.status(200);
              }
            });
          }
        }

        return res
          .status(200)
          .json({ status: "OK", message: "Upload complete!" });
      }
    },
  );
});

app.post("/subject-ranking", async (req, res) => {
  let arr = [];
  Subject.find({}, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      for (let i = 0; i < 10; ++i) {
        arr.push(result[i].subject);
        arr.push(result[i].points);
      }
      return res.status(200).json({ status: "OK", data: arr });
    }
  });
});

app.post("/results", async (req, res) => {
  const { googleId } = req.body;
  User.findOne({ googleId: googleId }, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      return res.status(200).json({ status: "OK", data: result.options });
    }
  });
});

app.listen(PORT, console.log(`Server running at port ${PORT}`));
