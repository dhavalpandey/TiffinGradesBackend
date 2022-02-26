if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

//enviorment variables
const PORT = process.env.PORT || 5000;

//Libraries
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const { ApolloServer, gql } = require("apollo-server-express");
const {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} = require("apollo-server-core");

const User = require("./User");
const Subject = require("./Subject");
const Meet = require("./Meet");
const Discussion = require("./Discussion");
const DiscussionUsers = require("./DiscussionUsers");

//Graph QL
const typeDefs = gql`
  type Query {
    hello: String!
  }
`;

const resolvers = {
  Query: {
    hello: () => "hello",
  },
};

//Server Configuration
const app = express();

let apolloServer = null;
const startServer = async () => {
  apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true,
    plugins: [
      process.env.NODE_ENV === "production"
        ? ApolloServerPluginLandingPageProductionDefault({
            graphRef: "my-graph-id@my-graph-variant",
            footer: false,
          })
        : ApolloServerPluginLandingPageLocalDefault({ footer: false }),
    ],
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });
};
startServer();

const server = http.createServer(app);

//DataBase Connection
const connectDB = require("./db");
const { syncBuiltinESMExports } = require("module");
connectDB();

//Middleware
app.use(
  cors({
    origin: ["https://tiffingrades.netlify.app", "http://localhost:3000"],
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

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

const sendEmail = (to, name) => {
  const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    secureConnection: false,
    port: 587,
    tls: {
      ciphers: "SSLv3",
    },
    auth: {
      user: process.env.OUTLOOK_EMAIL,
      pass: process.env.OUTLOOK_PASSWORD,
    },
  });

  const mailOptions = {
    from: "6060@tiffin.kingston.sch.uk",
    to: to,
    subject: name + ", welcome to a world of wonders.",
    html: "<h1>Welcome to Tiffin Planner!</h1><p>Your account has been successful registered.</p><br></br><b><i>Thank you, Dhaval.</p> </b></i>",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
  });
};

const getUsers = (data) => {
  DiscussionUsers.findOne({ discussionName: data.chatRoom }, (err, result) => {
    if (!result.users) return console.log("No page found");
    let dupelicate = 0;
    if (!result.users) {
      DiscussionUsers.findOneAndUpdate(
        { discussionName: data.chatRoom },
        {
          $push: {
            users: {
              name: data.name,
              googleId: data.googleId,
            },
          },
        },
        (err, result) => {
          if (err) {
            console.error(err);
          }
        },
      );
    } else {
      for (let i = 0; i < result.users.length; i++) {
        if (result.users[i].googleId !== data.googleId) {
          dupelicate++;
        }
      }
      if (!dupelicate > 0) {
        DiscussionUsers.findOneAndUpdate(
          { discussionName: data.chatRoom },
          {
            $push: {
              users: {
                name: data.name,
                googleId: data.googleId,
              },
            },
          },
          (err, result) => {
            if (err) {
              console.error(err);
            }
          },
        );
      }
    }
  });
};

//Routes
app.post("/signup", (req, res) => {
  const { googleId, email, fullName, firstName, imageUrl } = req.body;

  User.findOne({ googleId: googleId }).then((user) => {
    if (user) {
      sendEmail(email, firstName);
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
          sendEmail(email, firstName);
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
  wsEngine: require("eiows").Server,
  cors: {
    origin: ["https://tiffingrades.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", async (socket) => {
  const id = socket.id;
  await socket.on("join-room", (data) => {
    const sendData = {
      data,
      id,
    };
    socket.join(data.chatRoom);
    socket.to(data.chatRoom).emit("new-user", sendData);
  });

  await socket.on("send-message", (data) => {
    socket.to(data.room).emit("receive-message", data);
  });

  await socket.on("disconnect", () => {
    socket.broadcast.emit("disconnect-user", id);
  });
});

app.post("/discussion", async (req, res) => {
  const { googleId, name, link } = req.body;

  User.findOne({ googleId: googleId }, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      Discussion.create(
        {
          link,
          discussionName: name,
        },
        (err, result) => {
          if (err) throw err;
        },
      );
      return res.status(200).json({ status: "OK" });
    }
  });
});

app.post("/get-discussions", async (req, res) => {
  const { googleId } = req.body;

  User.findOne({ googleId: googleId }, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      Discussion.find({}, (err, result) => {
        if (err) {
          return res.status(500).json({ status: "ERR", message: err });
        } else {
          res.status(200).json({ status: "OK", data: result });
        }
      });
    }
  });
});

app.post("/discuss-add", async (req, res) => {
  const { googleId, name, discussionName } = req.body;
  User.findOne({ googleId: googleId }, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "ERR", message: err });
    } else {
      DiscussionUsers.findOne(
        { discussionName: discussionName },
        (err, result) => {
          let dupelicate = 0;
          for (let i = 0; i < result.users.length; i++) {
            if (result.users[i].googleId !== googleId) {
              dupelicate++;
            }
          }
          if (!dupelicate > 0) {
            DiscussionUsers.findOneAndUpdate(
              { discussionName: discussionName },
              {
                $push: {
                  users: {
                    name: name,
                    googleId: googleId,
                  },
                },
              },
              (err, result) => {
                if (err) {
                  return res.status(500).json({ status: "ERR", message: err });
                }
              },
            );
          }
        },
      );
      return res.status(200).json({ status: "OK" });
    }
  });
});

server.listen(PORT, console.log(`Server running at port ${PORT}`));
