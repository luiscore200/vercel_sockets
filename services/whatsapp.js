const { makeWASocket,DisconnectReason, useMultiFileAuthState } =require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const customLogger = {
    level: 'fatal',
    fatal: (msg, ...args) => console.error('FATAL:', msg, ...args),
    error: (msg, ...args) => console.error('ERROR:', msg, ...args),
    warn: () => {}, // Ignorar logs de nivel warn
    info: () => {}, // Ignorar logs de nivel info
    debug: () => {}, // Ignorar logs de nivel debug
    trace: () => {}, // Ignorar logs de nivel trace
    child: () => customLogger // Devuelve el mismo logger para manejar sub-loggers
};

class WpService {


    constructor() {
        if (!WhatsAppManager.instance) {
          this.connections = new Map(); // Almacena las conexiones activas (clave: userId)
          WhatsAppManager.instance = this; // Singleton para evitar duplicidad
        }
        return WhatsAppManager.instance;
      }


  /**
   * @param {string} userId 
   * @returns {Promise<Object>} 
   */
  async createConnection(userId) {
    const authFolder = `./auth/${userId}`; 
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        fireInitQueries: false,
        shouldSyncHistoryMessage: (msg) => {  return false;  },
        emitOwnEvents: false,
        logger:customLogger
    });

    // Manejo de eventos
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if(qr){
        const code= socket.requestPairingCode(573177229993);
        console.log("code",code);
       
      }
      if (connection === 'close' && !qr) {
        console.log(`Conexión cerrada para el usuario ${userId}`);

        if (lastDisconnect?.error?.output?.statusCode) {
          const disconnectCode = lastDisconnect.error.output.statusCode;
          
        if ([DisconnectReason.loggedOut, DisconnectReason.badSession,
          DisconnectReason.multideviceMismatch].includes(disconnectCode)) {
          
            this.connections.delete(userId);
            this.deleteAuthFiles(`./auth/${userId}`);
       }
      }
    
      } else if (connection === 'open') {
        console.log(`Conexión abierta para el usuario ${userId}`);
      }
    });

    return socket;
  }


  async sendMessage (userId, to, message)  {

    try {

      if (!this.connections.has(userId)) {
        console.log(`No hay conexión activa para el usuario ${userId}`);
        return;
        
    }

    const Number = to.replace(/[^\d]/g, '');
    const jid = `${Number}@s.whatsapp.net`;
    const socket = this.connections.get(userId);
    const response = await socket.sendMessage(jid, {text: message});
      console.log(`Mensaje enviado a ${to}`);
      return response;

    } catch (error) {
      console.log('Error al enviar el mensaje:', error);
      return error;
    }
  }
 
  deleteAuthFiles(authFolder) {
    const filesToDelete = [
        'auth-info.json',
        'creds.json',
        // Puedes añadir más archivos si es necesario
    ];

    filesToDelete.forEach(file => {
        const filePath = path.join(authFolder, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Elimina el archivo
            console.log(`Archivo de autenticación ${file} eliminado de ${authFolder}`);
        }
    });
}

  /**
   * Cierra la conexión de un usuario y la elimina del gestor
   * @param {string} userId - Identificador único del usuario
   */
  closeConnection(userId) {
    if (this.connections.has(userId)) {
      const socket = this.connections.get(userId);
      socket.end(); // Cierra la conexión
      this.connections.delete(userId); // Elimina del mapa
      console.log(`Conexión cerrada para ${userId}`);
    }
  }

}


module.exports = new WpService();