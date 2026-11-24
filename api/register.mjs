import { registrationApi } from '../server/registration.mjs'

// One Express handler per warm function instance, sharing the local API implementation.
export default registrationApi(process.env)
