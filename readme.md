
# MeshCentral-EventLog

*Current Version: 0.0.11
Released: 2019-10-28*

Initially conceived as a proof of concept plugin for the [MeshCentral2](https://github.com/Ylianst/MeshCentral) Project to introduce extensibility into the project without requiring the MeshCentral2 project to incorporate everyone's requested changes into the main project, yet allow it to be accomplished by others. In creating this plugin, we're introducing the appropriate hooks into MeshCentral2 to allow extensibility to anyone who can write a plugin, while trying to modify the core project as little as possible.

## News

#### 2019-10-10
The proposed PluginHandler for all users to add plugin support for projects such as this has been [added](https://github.com/Ylianst/MeshCentral/pull/555) to the MeshCentral Project as of MeshCentral version 0.4.1-z


## Installation

 1. Download the latest source of this project and place it in your `./meshcentral-data/plugins/eventlog` folder.
 2. Enable the plugin by adding `eventlog` to the list of allowed plugins under `settings`, e.g.

>     "plugins": {
>          "list": [
>             "eventlog"
>          ]
>     },

 3. Restart your MeshCentral2 server.


## Usage
*Currently only supports Windows endpoints with a software agent installed.*

As a proof of concept, several methods were employed to become familiar with the [MeshCentral2](https://github.com/Ylianst/MeshCentral) project. 

#### Endpoint - Plugin tab
When viewing a remote endpoint, a new "Event Log" tab now appears under the Plugins tab. A live view currently pulls the latest 100 Errors/Warnings from both the Application/System logs. A "History" tab displays the last 20 days of collected event logs. Agents periodically send event log data to the server to be stored.

#### Endpoint - Console tab
You can see the application logs directly from the console, using the command:

> plugin eventlog getlog

This will, by default, get the latest 10 Application Log errors and warnings.
Advanced usages can specify in greater detail, e.g.

> plugin eventlog getlog System 100 Error false

Let's break that down:

`plugin` informs the system that you are about to utilize a plugin call

`eventlog` calls this eventlog module

`System` references the requested event log set

`100` is the number of entries to be returned

`Error` is the type of event log (e.g. Error, Information, Warning, etc.)

`false` is whether or not to return JSON formatted output, rather than truncated text

 
# Future

This project may be expanded to include:
- Create alerts based on the log entries and user-defined filters
- When used in conjunction with a task-scheduling plugin could fire off a task on an endpoint in response to an event
- Thoughts welcome- please feel free to suggest something that might be useful to you

# Screenshots
![Device Plugin Page](https://user-images.githubusercontent.com/1929277/67437370-adcd1200-f5be-11e9-9750-99f9c89b4c11.png)
