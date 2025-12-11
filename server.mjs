import { createServer } from 'https'
import { parse } from 'url'
import next from 'next'
import fs from 'fs'
import path from 'path'
import os from 'os'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

// Get local network IP for NEXTAUTH_URL
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

// Set NEXTAUTH_URL to network IP for HTTPS dev server
// This ensures OAuth callbacks use the correct URL
const localIP = getLocalIP()
process.env.NEXTAUTH_URL = `https://${localIP}:${port}`

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync(path.join(process.cwd(), '.cert/key.pem')),
  cert: fs.readFileSync(path.join(process.cwd(), '.cert/cert.pem')),
}

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on https://${hostname}:${port}`)
      console.log(`> Local: https://localhost:${port}`)
      console.log(`> Network: https://${localIP}:${port}`)
      console.log(`> NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`)
    })
})
