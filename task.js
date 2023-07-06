const express = require('express');
const axios = require('axios');
const cheerio = require("cheerio");
const app = express();
const mysql = require('mysql2');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//сделать html , txt файл + переделать сортировку на get, очистка в код,
const port = 3000;
const pool = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "Practicedb",
  password: "1234567890"
});

app.get('/', (req, res) => {



  res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
  res.write(`
    
    <html>
      <body>
      <form action="/callMethod" method="post">
      <input type="text" name="searchQuery">
      <input type="number" name="Ml" value ="10">
      <button type="submit">Поиск ссылок</button>
    </form>

    <form action="/saveLinks" method="post">
    <button type="submit">К бд</button>
  </form>



      </body>
    </html>
  `);
});




let linkCount = 0;

const truncateLink = (link) => {
  const url = new URL(link);
  return `${url.protocol}//${url.host}/`;
};


app.post('/callMethod', async (req, res) => {
  pool.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database: ', err);
      return;
    }
    console.log('Connected to MySQL database!');
  });

  const searchQuery = req.body.searchQuery;
 const maxLinks = req.body.Ml; 
  try {
    const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
    const $ = cheerio.load(data);

    const links = [];
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href.startsWith('/url?q=')) {
        links.push(href.replace('/url?q=', ''));
      }
    });
    res.send(`
      <style type="text/css">
        table {
          border-collapse: collapse;
        }
        table, th, td {
          border: 1px solid black;
          padding: 5px;
        }
      </style>
      <script language="JavaScript">
</script>

      <html>
        <body>
          <form action="/" method="get">
            <button type="submit">Назад</button>
          </form>
          <form action="/saveLinks" method="post">
            <input type="hidden" name="links" value="${JSON.stringify(links.slice(0, maxLinks))}">
            <button id="myButton" type="submit">Сохранить</button>
          </form>
          <h1>Результаты поиска для "${searchQuery}":</h1>
         
          <table>
            <tr>
              <th>Ссылки</th>
            </tr>
            ${
              links.slice(0, maxLinks).map(link => `
                <tr>
                <td><a href="${link}">${truncateLink(link)}</a></td>
                </tr>
              `).join('')
            }
          </table>
        </body>
      </html>
    `);


    linkCount += links.length;
    const values = links.map((link) => [truncateLink(link)]);
const selectQuery = 'SELECT link FROM links';
const insertQuery = 'INSERT INTO links (link) VALUES ?';

pool.query(selectQuery, function(err, results) {
  if(err) {
    console.log(err);
    return;
  }
  const existingLinks = results.map(result => result.link);
  const newLinks = values.filter(value => !existingLinks.includes(value[0]));

  if (newLinks.length > 0) {
    pool.query(insertQuery, [newLinks], function(err, results) {
      if(err) {
        console.log(err);
      } else {
        console.log("Новые данные добавлены");
      }
    });
  } else {
    console.log("Нет новых данных для добавления");
  }
});

  } catch (error) {
    console.error(error);
    res.send('Произошла ошибка при выполнении поиска.');
  }

      // const values = links.map((link) => [truncateLink(link)]);
    // const query = 'INSERT INTO links (link) VALUES ?';
    
    // pool.query(query,[values],function(err, results) {
    //   if(err) console.log(err);
    //   else console.log("Данные добавлены");
    // });
});
/*
 

*/
app.post('/saveLinks', async (req, res) => {
  
  pool.query('SELECT * FROM links', (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to fetch data' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.write(`
      <html>
        <head>
          <style type="text/css">
            table {
              border-collapse: collapse;
            }
            table, th, td {
              border: 1px solid black;
              padding: 5px;
            }
          </style>
        </head>
        <body>
      
          
             <form action="http://localhost:${port}/" method="get">
              <button type="submit">Поиск</button>
            </form>
            
            <form method="get" action="/saveLinks>
            <button type="submit">Все</button> 
            </form>

            <form method="get" action="/all">
            <button type="submit">Новые</button> 
            </form>

            <form action="/saveVerified" method="get">
            <button type="submit">Проверенный</button> 
            </form>

            <form method="get" action="/saveSuspicious">
            <button type="submit">Подозрительный</button> 
            </form>

          
            
      `);
//
    results.forEach((row) => {
      res.write(`
        <table>
          <tr><th>ID</th><th>Домен</th><th>Проверенный</th><th>Подозрительный</th><th>Удалить</th></tr>
          <tr>
            <td>${row.id}</td>
            <td><a href="${row.link}">${row.link}</a></td>
            <td>${row.verified}
            <form method="POST" action="/updateVerifiedValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="verified" value="${row.verified}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
            ${row.suspicious}
            <form method="POST" action="/updateSuspiciousValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="suspicious" value="${row.suspicious}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
              <form method="POST" action="/deleteLink">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Удалить</button>
              </form>
            </td>
          </tr>
        </table>
      `);
    });

    res.write(`
          </form>
        </body>
      </html>
    `);

    res.end();
  });
});

app.post('/deleteLink', async (req, res) => {
  const id = req.body.id; // получаем идентификатор записи из запроса

  pool.query('DELETE FROM links WHERE id = ?', [id], (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to delete data' }));
      return;
    }
    res.write(`
    <style type="text/css">
    table {
      border-collapse: collapse;
    }
    table, th, td {
      border: 1px solid black;
      padding: 5px;
    }
  </style>
  <script language="JavaScript">
</script>
      <html>
        <body>
        <p>Delete</p>
        <form action="/saveLinks" method="post">
        <button id="myButton" type="submit">back</button>
      </form>
         
        </body>
      </html>
    `);


  });
});

app.post('/updateVerifiedValue', async (req, res) => {
  const {id, verified} = req.body;
  const newValue = verified === '1' ? 0 : 1;
  
  pool.query('UPDATE links SET verified = ? WHERE id = ?', [newValue, id], (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to update value' }));
      return;
    }

    res.write(`
    <style type="text/css">
    table {
      border-collapse: collapse;
    }
    table, th, td {
      border: 1px solid black;
      padding: 5px;
    }
  </style>
  <script language="JavaScript">
</script>
      <html>
        <body>
        <p>${newValue}</p>
        <form action="/saveLinks" method="post">
        <button id="myButton" type="submit">back</button>
      </form>
         
        </body>
      </html>
    `);
  });
});


app.post('/updateSuspiciousValue', async (req, res) => {
  const {id, suspicious} = req.body;
  const newValue = suspicious === '1' ? 0 : 1;
  
  pool.query('UPDATE links SET suspicious = ? WHERE id = ?', [newValue, id], (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to update value' }));
      return;
    }

    res.write(`
    <style type="text/css">
    table {
      border-collapse: collapse;
    }
    table, th, td {
      border: 1px solid black;
      padding: 5px;
    }
  </style>
  <script language="JavaScript">
</script>
      <html>
        <body>
        <p>${newValue}</p>
        <form action="/saveLinks" method="post">
        <button id="myButton" type="submit">back</button>
      </form>
         
        </body>
      </html>
    `);
  });
});



app.get('/saveVerified', async (req, res) => {
  pool.query('SELECT * FROM links WHERE verified = 1', (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to fetch data' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.write(`
      <html>
        <head>
          <style type="text/css">
            table {
              border-collapse: collapse;
            }
            table, th, td {
              border: 1px solid black;
              padding: 5px;
            }
          </style>
        </head>
        <body>

         
        <form action="http://localhost:${port}/" method="get">
        <button type="submit">Поиск</button>
      </form>

 
        
            <form action="/saveLinks" method="post">
              <button type="submit"> Все</button>
            </form>

            <form method="get" action="/all">
            <button type="submit">Новые</button> 
            </form>

            
           
            <p>Проверенный</p>
          
            <form  method="get" action="/saveSuspicious">
            <button  type="submit">Подозрительный</button> 
            </form>
            
      `);

    results.forEach((row) => {
      res.write(`
        <table>
          <tr><th>ID</th><th>Домен</th><th>Проверенный</th><th>Подозрительный</th><th>Удалить</th></tr>
          <tr>
            <td>${row.id}</td>
            <td><a href="${row.link}">${row.link}</a></td>
            <td>${row.verified}
            <form method="POST" action="/updateVerifiedValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="verified" value="${row.verified}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
            ${row.suspicious}
            <form method="POST" action="/updateSuspiciousValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="suspicious" value="${row.suspicious}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
              <form method="POST" action="/deleteLink">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Удалить</button>
              </form>
            </td>
          </tr>
        </table>
      `);
    });

    res.write(`
          </form>
        </body>
      </html>
    `);

    res.end();
  });
});


app.get('/saveSuspicious', async (req, res) => {
  pool.query('SELECT * FROM links WHERE suspicious = 1', (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to fetch data' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.write(`
      <html>
        <head>
          <style type="text/css">
            table {
              border-collapse: collapse;
            }
            table, th, td {
              border: 1px solid black;
              padding: 5px;
            }
          </style>
        </head>
        <body>

         
        <form action="http://localhost:${port}/" method="get">
        <button type="submit">Поиск</button>
        </form>
        
            <form  method="POST" action="/saveLinks">
              <button type="submit">Все</button>
            </form>

            <form method="get" action="/all">
            <button type="submit">Новые</button> 
            </form>

            <form action="/saveVerified" method="get">
            <button type="submit">Проверенный</button> 
            </form>
            
     

            
            <p>Подозрительный</p> 
          
      `);

    results.forEach((row) => {
      res.write(`
        <table>
          <tr><th>ID</th><th>Домен</th><th>Проверенный</th><th>Подозрительный</th><th>Удалить</th></tr>
          <tr>
            <td>${row.id}</td>
            <td><a href="${row.link}">${row.link}</a></td>
            <td>${row.verified}
            <form method="POST" action="/updateVerifiedValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="verified" value="${row.verified}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
            ${row.suspicious}
            <form method="POST" action="/updateSuspiciousValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="suspicious" value="${row.suspicious}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
              <form method="POST" action="/deleteLink">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Удалить</button>
              </form>
            </td>
          </tr>
        </table>
      `);
    });

    res.write(`
          </form>
        </body>
      </html>
    `);

    res.end();
  });
});


app.get('/all', async (req, res) => {
  pool.query('SELECT * FROM links WHERE verified IS NULL AND suspicious IS NULL', (error, results) => {
    if (error) {
      console.error('Ошибка выполнения запроса:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to fetch data' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.write(`
      <html>
        <head>
          <style type="text/css">
            table {
              border-collapse: collapse;
            }
            table, th, td {
              border: 1px solid black;
              padding: 5px;
            }
          </style>
        </head>
        <body>

         
        <form action="http://localhost:${port}/" method="get">
        <button type="submit">Поиск</button>
      </form>
        
            <form action="/saveLinks" method="post">
              <button type="submit"> Все</button>
            </form>

            <p>Новые</p>
            
           
            <form action="/saveVerified" method="get">
            <button type="submit">Проверенный</button> 
            </form>
          
            <form  method="get" action="/saveSuspicious">
            <button  type="submit">Подозрительный</button> 
            </form>
      `);

    results.forEach((row) => {
      res.write(`
        <table>
          <tr><th>ID</th><th>Домен</th><th>Проверенный</th><th>Подозрительный</th><th>Удалить</th></tr>
          <tr>
            <td>${row.id}</td>
            <td><a href="${row.link}">${row.link}</a></td>
            <td>${row.verified}
            <form method="POST" action="/updateVerifiedValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="verified" value="${row.verified}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
            ${row.suspicious}
            <form method="POST" action="/updateSuspiciousValue"> 
  <input type="hidden" name="id" value="${row.id}">
  <input type="hidden" name="suspicious" value="${row.suspicious}">
  <button type="submit">Update</button> 
</form>
            </td>
            <td>
              <form method="POST" action="/deleteLink">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Удалить</button>
              </form>
            </td>
          </tr>
        </table>
      `);
    });

    res.write(`
          </form>
        </body>
      </html>
    `);

    res.end();
  });
});


app.listen(port, () => {
  console.log('Сервер запущен на порту ' + port + '. http://localhost:' + port);
});