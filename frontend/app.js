const express = require('express')
const app = express()
const port = 3000

app.use(express.static('dashboard'))
  
app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})