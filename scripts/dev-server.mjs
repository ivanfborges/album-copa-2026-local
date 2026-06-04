import { createServer } from 'vite'

const server = await createServer({
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
  },
})

await server.listen()
server.printUrls()
