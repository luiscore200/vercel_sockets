const express = require('express');
const WpController = require('../controllers/wpController');

const router = express.Router();

// Ruta para iniciar sesión
router.post('/start-session', WpController.startSession);
router.get('/start-session-get', WpController.startSession);

// Ruta para enviar mensaje
router.post('/send-message', WpController.sendMessage);
router.get('/send-message-get', WpController.sendMessage);

router.post('/get-contacts', WpController.getContact);
router.get('/get-contacts-get', WpController.getContact);
module.exports = router;