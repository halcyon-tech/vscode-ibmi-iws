
const vscode = require(`vscode`);

const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class IWS {
  /**
   * @param {string} command 
   * @param {string} paramaters 
   * @returns {Promise<string>}
   */
  static async run(command, paramaters) {
    const connection = instance.getConnection();
    const result = await connection.qshCommand(`/QIBM/ProdData/OS/WebServices/bin/${command}.sh ${paramaters ? paramaters : ``}`, undefined, 1);

    if (result.code === 0 || result.code === null) {
      return result.stdout;
    } else {
      //Even if these commands error.. they still write
      //to standard out. Probably dumb Java stuff.
      throw new Error({
        code: result.code,
        output: result.stdout
      })
    }
  }

  /**
   * @param {string} command 
   * @param {{[paramater: string]: string|boolean}} paramaters 
   * @returns {Promise<string>}
   */
  static runFromParameters(command, paramaters) {
    let commandParms = [];

    for (const parm in paramaters) {
      switch (typeof paramaters[parm]) {

      case `boolean`:
        if (paramaters[parm]) commandParms.push(`-${parm}`);
        break;

      case `string`:
        if (paramaters[parm].trim() !== ``) {
          if (paramaters[parm]) commandParms.push(`-${parm} '${paramaters[parm]}'`);
        }

        break;
      }
    }

    return this.run(command, commandParms.join(` `));
  }

  /**
   * @returns {Promise<{name: string, running: boolean}[]>|false}
   */
  static async getServers() {
    try {
      const result = await this.run(`listWebServicesServers`);
      const lines = result.split(`\n`);

      let servers = [];

      lines.forEach(line => {
        if (line === ``) return;

        let splitIndex = line.lastIndexOf(`(`);
        let name = line.substring(0, splitIndex).trim();

        servers.push({
          name,
          running: !line.includes(`Stopped`)
        });
      })

      return servers;

    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} server 
   * @returns {Promise<{name: string, value: string}[]|false>}
   */
  static async getServerProperties(server) {
    try {
      const result = await this.run(`getWebServicesServerProperties`, `-server '${server}'`);
      const lines = result.split(`\n`);

      let properties = [];
      
      lines.forEach(line => {
        if (line.includes(`:`)) {
          const [name, value] = line.split(`:`);

          properties.push({
            name: name.trim(),
            value: value.trim()
          })
        }
      })

      return properties;

    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} server 
   * @param {string} service 
   * @returns {Promise<{name: string, value: string}[]|false>}
   */
  static async getServiceProperties(server, service) {
    try {
      const result = await this.run(`getWebServiceProperties`, `-server '${server}' -service '${service}'`);
      const lines = result.split(`\n`);

      let properties = [];
      
      lines.forEach(line => {
        if (line.includes(`:`)) {
          const [name, value] = line.split(`:`);

          properties.push({
            name: name.trim(),
            value: value.trim()
          })
        }
      })

      return properties;

    } catch (e) {
      return false;
    }
  }

  /**
   * @returns {Promise<{name: string, running: boolean}[]>|false}
   */
  static async getServices(server) {
    try {
      const result = await this.run(`listWebServices`, `-server '${server}'`);
      const lines = result.split(`\n`);

      let services = [];

      lines.forEach(line => {
        if (line === ``) return;

        let splitIndex = line.lastIndexOf(`(`);
        let name = line.substring(0, splitIndex).trim();

        services.push({
          name,
          running: !line.includes(`Stopped`)
        });
      })

      return services;

    } catch (e) {
      return false;
    }
  }

  /**
   * Create IWS server
   * @param {object} data 
   */
  static createServer(data) {
    return this.runFromParameters(`createWebServicesServer`, data);
  }

  /**
   * Delete IWS server
   * @param {string} server 
   */
  static deleteServer(server) {
    return this.run(`deleteWebServicesServer`, `-server '${server}'`);
  }

  /**
   * Start a IWS server
   * @param {string} server 
   */
  static startServer(server) {
    return this.run(`startWebServicesServer`, `-server '${server}'`);
  }

  /**
   * Start a IWS server service
   * @param {string} server 
   * @param {string} service 
   */
  static startService(server, service) {
    return this.run(`startWebService`, `-server '${server}' -service '${service}'`)
  }

  /**
   * Stop a IWS server
   * @param {string} server 
   */
  static stopServer(server) {
    return this.run(`stopWebServicesServer`, `-server '${server}'`);
  }

  /**
   * Stop a IWS server service
   * @param {string} server 
   * @param {string} service 
   */
  static stopService(server, service) {
    return this.run(`stopWebService`, `-server '${server}' -service '${service}'`)
  }
}