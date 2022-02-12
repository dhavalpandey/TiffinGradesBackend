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
const http = require("http");
const { Server } = require("socket.io");

const User = require("./User");
const Subject = require("./Subject");
const Meet = require("./Meet");
const connectDB = require("./db");
connectDB();

//cors
app.use(
  cors({
    origin: ["https://tiffingrades.netlify.app", "http://localhost:3000"],
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

const server = http.createServer(app);

//Functions
const removeMeets = () => {
  Meet.find({}, (err, result) => {
    for (let i = 0; i < result.length; ++i) {
      if (result[i].expiringAt < Date.now()) {
        Meet.remove({ _id: result[i]._id }, (err) => {
          if (!err) {
            console.log("Successfully removed a Meet");
          } else {
            console.log("There was an error.");
          }
        });
      }
    }
  });
};

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
  const { googleId, state, yearGroup } = req.body;

  User.findOneAndUpdate(
    { googleId: googleId },
    { adjectives: state },
    (err, result) => {
      if (err) {
        return res.status(500).json({ status: "ERR", message: err });
      } else {
        User.findOneAndUpdate(
          { googleId: googleId },
          { hasSubmittedAdjectives: "Yes" },
          (err, result) => {
            if (err) {
              return res.status(500).json({ status: "ERR", message: err });
            } else {
              User.findOneAndUpdate(
                { googleId: googleId },
                { yearGroup: yearGroup },
                (err, result) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ status: "ERR", message: err });
                  } else {
                    return res
                      .status(200)
                      .json({ status: "OK", message: "Signup Complete!" });
                  }
                },
              );
            }
          },
        );
      }
    },
  );
});

app.post("/options", async (req, res) => {
  const { googleId, data, topThreeSubjects, hasSubmittedOptions } = req.body;
  let numberOfUpdates;
  let points;

  if (hasSubmittedOptions == "true") {
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
                res.status(200).json({ status: "ERR", message: err });
              }
            },
          );
        }
      },
    );
  } else {
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
                } else {
                  numberOfUpdates = result.numberOfUpdates + 1;
                  points = result.points;

                  Subject.findOneAndUpdate(
                    { subject: key },
                    { points: Math.round((points + data[key]) / 2) },
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
                    { numberOfUpdates: numberOfUpdates },
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
  }
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

app.post("/meet", async (req, res) => {
  const {
    link,
    subject,
    meetName,
    name,
    googleId,
    createdAt,
    expiringAt,
    profilePicture,
  } = req.body;

  removeMeets();

  User.findOne({ googleId: googleId }, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      Meet.create(
        {
          link,
          subject,
          meetName,
          creatorName: name,
          createdAt,
          expiringAt,
          profilePicture,
        },
        (err, result) => {
          if (err) throw err;
        },
      );
      return res.status(200).json({ status: "OK" });
    }
  });
});

app.post("/get-meets", async (req, res) => {
  const { googleId } = req.body;

  removeMeets();

  User.findOne({ googleId: googleId }, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      Meet.find({}, (err, result) => {
        if (err) {
          return res.status(500).json({ status: "ERR", message: err });
        } else {
          res.status(200).json({ status: "OK", data: result });
        }
      });
    }
  });
});

//Discussions (powered by Socket.io)
const io = new Server(server, {
  cors: {
    origin: ["https://tiffingrades.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("join-room", (data) => {
    socket.join(data);
  });

  socket.on("send-message", (data) => {
    socket.to(data.room).emit("receive-message", data);
  });

  socket.on("disconnect", () => {
    let disconnect = true;
  });
});

server.listen(PORT, console.log(`Server running at port ${PORT}`));
