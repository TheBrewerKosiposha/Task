const http = require("http");
const cheerio = require("cheerio");
const fs = require("fs");
const express = require('express');
const app = express();

const searchQuery = "сбербанк";
const maxLinks = 5;
const repeatTime = 3600000;
let now = new Date();
const fileName = `result.txt`;

port = 3001;

function writeToFile(file, data) {
  fs.readFile(file, "utf8", (err, fileData) => {
    if (err) {
      console.error(err);
      return;
    }

    // Проверить, содержит ли файл уже такие же данные
    if (fileData === data.trim()) {
      console.log("Значения уже присутствуют в файле, запись не будет выполнена");
      return;
    }

    fs.writeFile(file, data, { flag: "a+" }, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Результаты записаны в файл: ${file}`);
      }
    });
  });
}
function getData() {
  const options = {
    hostname: "www.google.com",
    port: 80,
    path: `/search?q=${encodeURIComponent(searchQuery)}`,
    method: "GET",
  };
  http
    .request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const $ = cheerio.load(data);
        const links = $("a")
          .filter((i, elem) => {
            const href = $(elem).attr("href");
            return href && href.startsWith("/url?q=");
          })
          .map((i, elem) => {
            const href = $(elem).attr("href");
            return decodeURIComponent(href.substring(7, href.indexOf("&")));
          })
          .get()
          .slice(0, maxLinks);
        const listItems = links.map(
          (link) => `<li><a href="${link}">${link}</a></li>`
        );
        const listHtml = `<ul>${listItems.join("")}</ul>`;
        const result = `
          Результаты поиска для "${searchQuery}":
          ${links.join("\n")}
        `;

        fs.access(fileName, (err) => {
          if (err) {
            writeToFile(fileName,`${now} ` + result);
          } else {
            writeToFile(fileName, `${now} `+ `${result}`);
          }
        });
        app.post('/callMethod', (req, res) => {
          getData();
          res.send('Метод вызван');
        });
        http
          .createServer((req, res) => {
            res.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
            });
            res.write(`
            <style type="text/css">
            .block1 { 
              width: 200px; 
              background: #ccc;
              padding: 5px;
              padding-right: 20px; 
              border: solid 1px black; 
              float: left; 
              position: absolute;
              top: 200px;
              
             }
             .block2 { 
              width: 250px; 
              background: #ccc;
              padding: 5px;
              padding-right: 25px; 
              border: solid 1px black; 
              position: absolute;
              top: 45px;
              left: 236px;
          
             }
          
            </style>
              <html>
                <body>
                  <h1>Результаты поиска для "${searchQuery}":</h1>
                  <p><input type="checkbox" name="a"> Все</p>
                  <p><input type="checkbox" name="a1"> Проверенный</p>
                  <p><input type="checkbox" name="a2"> Подозрительный </p>
                  <form action="/callMethod" method="post">
                  <button type="submit">Вызвать метод</button>
                </form>
                  <div class = "block1">
                 
                  </div>
                  <div class = "block2">
                  ${listHtml}
                  </div>
                </body>
              </html>
            `);

            res.end();
          })
          .listen(port, () =>
            console.log("Сервер запущен на http://localhost:"+port)
          );

        setTimeout(getData, repeatTime);
      });
    })
    .on("error", (error) => {
      console.error(error);
    })
    .end();
}

getData();