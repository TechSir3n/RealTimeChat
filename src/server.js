const express = require('express');
const app = express();
const http = require('http');

const PORT = 8070;
const server = http.createServer(app);
const WebSocket = require('ws')
const webServ = new WebSocket.Server({ server });

const bodyParser = require('body-parser');
const db = require('./database.js');
const storage = require('./storage.js');


webServ.on('connection', ws => {
  ws.on('message', event => {
    const forBotMessages = JSON.parse(event);
    if (webServ.clients.size === 1) {
      ws.send(JSON.stringify({type:'bot',message:forBotMessages.message}));
    }

    try {
      const message = JSON.parse(event);
      webServ.clients.forEach(client => {
        if (client !== ws && client.readyState == WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'message', data: message.data, name: message.name }));
        }
      });

      webServ.clients.forEach(clientf => {
        if (clientf !== ws && clientf.readyState === WebSocket.OPEN) {
          clientf.send(JSON.stringify({ type: 'text', file: message.file }));
        }
      });

      if (message.type === 'text') {
         storage.addFile(message.file);
      } else if (message.type === 'message') {
         storage.addMessage(message.data, message.name);
      }

    } catch (err) {
      console.error("Catched error: ", err);
    };
  });

  ws.on('close', () => {
    console.log('Client disconnected !');
  });

  ws.on('error', () => {
    console.error('Some errro occurred');
  });

});

let urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(express.static('/home/ruslan/Desktop/JsApp/public'));

app.get('/index.html', function (req, res) {
  res.sendFile(__dirname + "../public/" + "index.html");
});

app.get('/private_room.html', function (req, res) {
  res.sendFile(__dirname + "../public/" + "private_room.html");
});


app.post('/create/room', urlencodedParser, function (req, res) {
  const { password, name } = req.body;
  db.client.query(`INSERT INTO PrivateRoom(password, name) VALUES($1,$2)`, [password, name], (err, result) => {
    if (!err) {
      res.send('Success inserted');
    } else {
      console.error('Error: ', err.message);
    }
    db.client.end();
  });

});

app.post('/get/user', urlencodedParser, (req, res) => {
  const { password_chat, name_chat } = req.body;
  db.client.query('SELECT password FROM PrivateRoom WHERE name=$1', [name_chat], (err, result) => {
    if (!err) {
      let dbPass = result.rows[0];
      if (dbPass.password == password_chat) {
        res.redirect('http://localhost:8080/private_room.html');
      } else {
        console.log('Passworc does not match');
      }
    } else {
      console.error('Error: ', err.message);
    }
    db.client.end();
  });
});

server.listen(PORT, function () {
  const host = server.address().address
  const port = server.address().port
  console.log("App listening at http://%s:%s", host, port)
});


module.exports = { webServ };