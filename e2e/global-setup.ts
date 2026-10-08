import { createServer } from 'vite'

export default async function startVite() {
  const server = await createServer({
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  })

  await server.listen()
  return async () => server.close()
}
