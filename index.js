const express = require('express');
const Sequelize = require('sequelize');

let DB_INFO = "postgres://messageapp:TheFirstTest@postgres:5432/messageapp";
let pg_option = {};

if (process.env.DATABASE_URL) {
  DB_INFO = process.env.DATABASE_URL;
  pg_option = { ssl: { rejectUnauthorized: false } };
}

const sequelize = new Sequelize(DB_INFO, {
  dialect: 'postgres',
  dialectOptions: pg_option,
});

const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use("/public", express.static(__dirname + "/public"));

const Messages = sequelize.define('messages', {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  message: Sequelize.TEXT
}, {
  freezeTableName: true
});

let lastMessage = "";

function setupRoute() {
  console.log("db connection succeeded");

  app.get('/', (req, res) => {
    res.render('top.ejs');
  });

  app.get('/add', (req, res) => {
    res.render('add.ejs', { lastMessage: lastMessage });
  });

  app.post('/add', async (req, res) => {
    let newMessage = new Messages({ message: req.body.text });
    try {
      await newMessage.save();
      lastMessage = req.body.text;
      res.render('add.ejs', { lastMessage: lastMessage });
    } catch (error) {
      res.send("error");
    }
  });

  app.get('/view', async (req, res) => {
    try {
      const result = await Messages.findAll();
      const allMessages = result.map((e) => `${e.message} ${e.createdAt}`);
      res.render('view.ejs', { messages: allMessages });
    } catch (error) {
      res.send("error");
    }
  });

  // 🔍 /search ルートをここに移動
  app.get('/search', (req, res) => {
    res.render('search.ejs', { results: [] });
  });

  app.post('/search', async (req, res) => {
    const Op = Sequelize.Op;
    try {
      const result = await Messages.findAll({
        where: {
          message: {
            [Op.regexp]: req.body.searchText
          }
        }
      });
      const searchResults = result.map((e) => `${e.message} ${e.createdAt}`);
      res.render('search.ejs', { results: searchResults });
    } catch (error) {
      console.error("Error during search:", error);
      res.send("error");
    }
  });
}

// DB接続 & ルート登録 & サーバー起動
(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connection OK');
    await sequelize.sync({ force: false, alter: true });
    setupRoute();
    console.log('Database synchronized');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error);
  }
})();