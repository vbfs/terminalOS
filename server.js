const express = require('express')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.use('/downloads', express.static('/downloads', {
  setHeaders: (res, filePath) => {
    // Force download for installer files
    const ext = path.extname(filePath).toLowerCase()
    if (['.dmg', '.exe', '.appimage'].includes(ext)) {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`)
    }
  }
}))

app.listen(PORT, () => {
  console.log(`terminalOS landing page running on port ${PORT}`)
})
