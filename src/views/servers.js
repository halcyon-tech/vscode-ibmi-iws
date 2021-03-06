
const vscode = require(`vscode`);

const {instance, Field, CustomUI} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

const iws = require(`../api/iws`);
const createServerUI = require(`./createServerUI`);
const serverPropertiesUI = require("./serverPropertiesUI");

module.exports = class Servers {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;

    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-ibmi-iws.refreshIWSExplorer`, async () => {
        this.refresh();
      }),

      vscode.commands.registerCommand(`vscode-ibmi-iws.itemStart`, async (node) => {
        if (node) {
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `IWS`,
          }, async progress => {
            progress.report({ message: `Starting ${node.server}${node.service ? ` (${node.service})` : ``}` });

            try {
              if (node.service) {
                await iws.startService(node.server, node.service);
              } else {
                await iws.startServer(node.server);
              }
            
              vscode.window.showInformationMessage(`Started ${node.server}${node.service ? ` (${node.service})` : ``}`);
              this.refresh();
            } catch (e) {
              vscode.window.showWarningMessage(`Failed to start ${node.server}${node.service ? ` (${node.service})` : ``}`);
              console.log(e);
            }
          })

        }
      }),

      vscode.commands.registerCommand(`vscode-ibmi-iws.itemStop`, async (node) => {
        if (node) {

          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `IWS`,
          }, async progress => {
            progress.report({ message: `Stopping ${node.server}${node.service ? ` (${node.service})` : ``}` });

            try {
              if (node.service) {
                await iws.stopService(node.server, node.service);
              } else {
                await iws.stopServer(node.server);
              }
            
              vscode.window.showInformationMessage(`Stopped ${node.server}${node.service ? ` (${node.service})` : ``}`);
              this.refresh();
            } catch (e) {
              vscode.window.showWarningMessage(`Failed to stop ${node.server}${node.service ? ` (${node.service})` : ``}`);
              console.log(e);
            }
          })
        }
      }),

      vscode.commands.registerCommand(`vscode-ibmi-iws.createServer`, async () => {
        const connection = instance.getConnection();

        if (connection) {
          const data = await createServerUI();

          if (data) {
            if (data.server && data.startingPort) {

              vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `IWS`,
              }, async progress => {
                progress.report({ message: `Creating Server ${data.server}` });
  
                try {
                  await iws.createServer(data);
                  vscode.window.showInformationMessage(`Created ${data.server}.`);
                  this.refresh();
                } catch (e) {
                  vscode.window.showInformationMessage(`Failed to create ${data.server}.`);
                  console.log(e);
                }
              })

            } else {
              vscode.window.showWarningMessage(`Server name and starting port required.`);
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-ibmi-iws.getProperties`, async (node) => {
        const connection = instance.getConnection();

        if (connection) {
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `IWS`,
          }, async progress => {
            progress.report({ message: `Getting ${node.server}${node.service ? ` (${node.service})` : ``} properties.` });
  
            try {
              let props;
              if (node.service) {
                props = await iws.getServiceProperties(node.server, node.service);
              } else {
                props = await iws.getServerProperties(node.server);
              }

              serverPropertiesUI(props);
            } catch (e) {
              vscode.window.showInformationMessage(`Failed to get ${node.server}${node.service ? ` (${node.service})` : ``} properties.`);
              console.log(e);
            }
          })

        }
      }),

      vscode.commands.registerCommand(`vscode-ibmi-iws.deleteServer`, async (node) => {
        if (node) {
          const connection = instance.getConnection();
          if (connection) {

            const confirmation = await vscode.window.showWarningMessage(`Are you sure you want to delete ${node.server}?`, `Yes`, `Cancel`);

            if (confirmation === `Yes`) {
              vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `IWS`,
              }, async progress => {
                progress.report({ message: `Deleting Server ${node.server}` });
  
                try {
                  await iws.deleteServer(node.server);
                  vscode.window.showInformationMessage(`Deleted ${node.server}.`);
                  this.refresh();
                } catch (e) {
                  vscode.window.showInformationMessage(`Failed to delete ${node.server}.`);
                  console.log(e);
                }
              })
            }

          }
        }
      })

    );

    instance.on(`connected`, () => {
      this.refresh();
    });
  }

  refresh() {
    this.emitter.fire();
  }

  /**
   * 
   * @param {vscode.TreeItem} element 
   * @returns {vscode.TreeItem}
   */
  getTreeItem(element) {
    return element;
  }

  /**
   * @param {IWSServer} [element] 
   * @returns {Promise<vscode.TreeItem[]>}
   */
  async getChildren(element) {
    const connection = instance.getConnection();

    /** @type {vscode.TreeItem[]} */
    let items = [];

    if (connection) {
      if (element) {
        const services = await iws.getServices(element.server);

        if (services.length > 0) {
          items = services.map(service => new IWSService({...service, server: element.server}));
        } else {
          items = [new vscode.TreeItem(`No services found.`)];
        }

      } else {
        const servers = await iws.getServers();
      
        if (servers.length > 0) {
          items = servers.map(server => new IWSServer(server));
        } else {
          items = [new vscode.TreeItem(`No servers found.`)];
        }
      }
    } else {
      items = [new vscode.TreeItem(`Please connect to an IBM i and refresh.`)];
    }

    return items;
  }
}

class IWSServer extends vscode.TreeItem {
  /**
   * @param {{name: string, running: boolean}} info 
   */
  constructor(info) {
    super(`${info.name}`, vscode.TreeItemCollapsibleState.Collapsed);

    this.server = info.name;
    this.running = info.running;

    this.contextValue = `iwsServer-${info.running ? `running` : `stopped`}`;
    this.iconPath = new vscode.ThemeIcon(`list-unordered`, new vscode.ThemeColor(
      info.running ? `charts.green` : `errorForeground`
    ));
  }
}

class IWSService extends vscode.TreeItem {
  /**
   * @param {{name: string, running: boolean, server: string}} info 
   */
  constructor(info) {
    super(`${info.name}`, vscode.TreeItemCollapsibleState.None);

    this.server = info.server;
    this.service = info.name;
    this.running = info.running;

    this.contextValue = `iwsService-${info.running ? `running` : `stopped`}`;
    this.iconPath = new vscode.ThemeIcon(`symbol-object`, new vscode.ThemeColor(
      info.running ? `charts.green` : `errorForeground`
    ));
  }
}