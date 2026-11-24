import express from 'express'
import { fileURLToPath } from 'node:url'
import { registrationApi } from './registration.mjs'

const app = registrationApi(process.env)
app.use(express.static(fileURLToPath(new URL('../dist/', import.meta.url)), { dotfiles: 'deny' }))
const port = Number(process.env.PORT || 3000)
app.listen(port, () => console.info('Registration website listening on port', port))
