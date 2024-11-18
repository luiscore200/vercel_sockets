const WpService = require('../services/whatsapp');

class WpController {
  static async startSession(req, res) {
    const { userId,phone} = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'El campo userId es obligatorio.' });
    }

    try {
      await WpService.createConnection(userId,phone);
      res.status(200).json({ message: `Sesión iniciada para el usuario ${userId}` });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
  }

  static async getContact(req, res) {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'El campo userId es obligatorio.' });
    }

    try {
      await WpService.getContacts(userId);
      res.status(200).json({ message: `Sesión iniciada para el usuario ${userId}` });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
  }


  static async sendMessage(req, res) {
    const { userId, to, message } = req.body;

    if (!userId || !to || !message) {
      return res.status(400).json({ error: 'Los campos userId, to y message son obligatorios.' });
    }

    try {
      const response = await WpService.sendMessage(userId, to, message);
      res.status(200).json({ message: 'Mensaje enviado con éxito.', response });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
  }
}

module.exports = WpController;