const { makeWASocket,DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion,makeInMemoryStore } =require('@whiskeysockets/baileys');
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
        if (!WpService.instance) {
          this.connections = new Map(); // Almacena las conexiones activas (clave: userId)
          this.stores = new Map();
          WpService.instance = this; // Singleton para evitar duplicidad
        }
        return WpService.instance;
      }


  /**
   * @param {string} userId 
   * @returns {Promise<Object>} 
   */
  async createConnection(userId,numberPairing) {
    const authFolder = path.join(__dirname,`./wpSessions/${userId}`); 
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const store = makeInMemoryStore({ })
    
    store.readFromFile(path.join(__dirname,`./wpStore/${userId}`));
    
    setInterval(() => {
        store.writeToFile(path.join(__dirname,`./wpStore/${userId}`))
    }, 10_000)

    const socket = makeWASocket({
      version,  
        auth: state,
        printQRInTerminal: true,
        syncFullHistory: false,
        fireInitQueries: false,
        shouldSyncHistoryMessage: (msg) => {  return false;  },
        emitOwnEvents: false,
        logger:customLogger
    });

    store.bind(socket.ev);
    // Manejo de eventos
    socket.ev.on('creds.update', saveCreds);
   
     socket.ev.on('contacts.upsert', async() => {
        console.log('got contacts', Object.values(store.contacts))
    })
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if(qr){
      (async()=>{
        try {
        if(numberPairing!==null && numberPairing!==undefined){
          const Number = numberPairing.replace(/[^\d]/g, '');
          const code=await socket.requestPairingCode(Number);
          console.log("code",code);
        }
        } catch (error) {
          
        }
      })();
       
      }
      if (connection === 'close' && !qr) {
        console.log(`Conexión cerrada para el usuario ${userId}`);

        if (lastDisconnect?.error?.output?.statusCode) {
          const disconnectCode = lastDisconnect.error.output.statusCode;
          
        if ([DisconnectReason.loggedOut, DisconnectReason.badSession,
          DisconnectReason.multideviceMismatch].includes(disconnectCode)) {
          
            this.connections.delete(userId);
            this.deleteAuthFiles(path.join(__dirname,`./wpSessions/${userId}`));
       }else{
            this.createConnection(userId);
       }
      }
    
      } else if (connection === 'open') {
      
        this.connections.set(userId, socket);
        this.stores.set(userId, store);
        console.log(`Conexión abierta para el usuario ${userId}`);
      }
    });

    return socket;
  }

  async getContacts(userId) {
    try {
        // Verifica si hay una conexión activa para el usuario
        if (!this.connections.has(userId)) {
            console.log(`No hay conexión activa para el usuario ${userId}`);
            return null;
        }

        const socket = this.connections.get(userId);
        const store = this.stores.get(userId); // Asegúrate de guardar y usar el `store` al crear la conexión

        if (!store || !store.contacts) {
            console.log(`No se encontraron contactos para el usuario ${userId}`);
            return null;
        }

        // Convierte los contactos en un formato legible
        const contacts = Object.values(store.contacts).map(contact => ({
            id: contact.id,
            name: contact.name || contact.notify || 'Sin Nombre',
        }));

        console.log(`Contactos recuperados para ${userId}:`, contacts);

        return contacts;
    } catch (error) {
        console.error('Error al obtener contactos:', error);
        return null;
    }
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
}


module.exports = new WpService();