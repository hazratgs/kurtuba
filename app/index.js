const db = require('../db')
const guid = require('uuid/v1')

// Models
const TokenModel = require('./models/token');
const StorageModel = require('./models/storage')

// Checking the presence of the token in the Database
const tokenChecking = async token => {
  const findToken = await TokenModel.Token.findOne({ token: token })
  if (!findToken) throw new Error()
  return true
}

const getStorage = async token => {
  const storage = await StorageModel.Storage.findOne({ token: token })
  if (!storage) throw new Error()
  return storage
}

module.exports = app => {
  // Creating a token
  app.post('/create', async (req, res) => {
    try {
      // New unique uuid token
      const token = guid()

      // Save to db
      await new TokenModel.Token({ token: token }).save()

      // Sending the token to the client
      res.json({ status: true, data: token })
    } catch (e) {
      res.status(500).send({ status: false, description: 'Error creating token' })
    }
  })

  // Adding Data
  app.post('/:token/set', async (req, res) => {
    try {
      const { token } = req.params
      tokenChecking(token)

      // Data not sent
      if (Object.keys(req.body).length == 0) throw new Error()

      // Data in storage
      const storage = await StorageModel.Storage.findOne({ token: token })

      if (storage) {
        // Merging new and old data (overwriting)
        const data = { ...storage.storage, ...req.body }
        // Updating data
        await StorageModel.Storage.update({ token: token }, { $set: { storage: data } })
      } else {
        await new StorageModel.Storage({ token: token, storage: req.body }).save()
      }

      res.json({ status: true, message: 'Successfully added' })
    } catch (e) {
      res.status(500).send({ status: false, description: 'Error adding data' })
    }
  })

  // Deletion of the property
  app.delete('/:token/remove/:key', async (req, res) => {
    try {
      const { token, key } = req.params
      tokenChecking(token)

      // Data in storage
      const storage = await getStorage(token)

      // If there is no key in storage
      if (!storage.storage[key]) throw new Error()

      const data = { ...storage.storage }
      delete data[key]

      // Updating the data
      await StorageModel.Storage.update({ token: token }, { $set: { storage: data } })

      res.json({ status: true, message: 'Successfully deleted' })
    } catch (e) {
      res.status(500).send({ status: false, description: 'Uninstall error' })
    }
  })

  // Clearing the data store
  app.delete('/:token/delete', async (req, res) => {
    try {
      const { token } = req.params
      tokenChecking(token)

      // Delete storage
      await StorageModel.Storage.remove({ token: token })

      res.json({ status: true, message: 'Storage deleted' })
    } catch (e) {
      res.status(500).send({ status: false, description: 'Uninstall error' })
    }
  })

  // Receiving data
  app.get('/:token/get/:key', async (req, res) => {
    try {
      const { token, key } = req.params
      tokenChecking(token)

      // Data in storage
      const storage = await getStorage(token)

      // If there is no key in storage
      if (!storage.storage[key]) throw new Error()

      // We return the data to the user
      res.send({ status: true, data: storage.storage[key] })
    } catch (e) {
      res.status(500).send({ status: false, description: 'Error' })
    }
  })

  // We return all data
  app.get('/:token/getAll', async (req, res) => {
    try {
      const { token } = req.params
      tokenChecking(token)

      // Data in storage
      const storage = await getStorage(token)

      // We return all data
      return res.send({ status: true, data: storage.storage })
    } catch (e) {
      res.status(500).send({ status: false, description: 'Error' })
    }
  })

  // If there are no handlers, 404
  app.use((req, res, next) => {
    res.status(404).send({ status: false, description: "Not Found: method not found" })
  })

  // There was an error
  app.use((err, req, res, next) => {
    res.status(err.status || 500).send({ status: false, description: 'Not Found: method not found' })
  })
}