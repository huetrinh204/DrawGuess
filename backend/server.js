const { createGameServer } = require("./gameServer")

const gameServer = createGameServer()

gameServer.listen(5000).then(() => {
  console.log("Server running on port 5000")
})

async function shutdown() {
  await gameServer.close()
  process.exit(0)
}

process.once("SIGINT", shutdown)
process.once("SIGTERM", shutdown)
