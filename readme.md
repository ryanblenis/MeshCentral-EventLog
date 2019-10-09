# MeshCentral-EventLog

Initially conceived as a proof of concept plugin for the [MeshCentral2](https://github.com/Ylianst/MeshCentral) Project to introduce extensibility into the project without requiring the MeshCentral2 project to incorporate everyone's requested changes into the main project, yet allow it to be accomplished by others. In creating this plugin, we're introducing the appropriate hooks into MeshCentral2 to allow extensibility to anyone who can write a plugin, while trying to modify the core project as little as possible.


## Installation

 1. Download the latest source of this project and place it in your `./meshcentral-data/plugins/eventlog` folder.
 2. Enable the plugin by adding `eventlog`to the list of allowed plugins under `settings`, e.g.

>     "plugins": {
>          "enabled": true,
>          "list": [
>             "eventlog"
>          ]
>     },

 3. Restart your MeshCentral2 server.


## Usage
*Currently only supports Windows endpoints with a software agent installed.*

As a proof of concept, several methods were employed to become familiar with the [MeshCentral2](https://github.com/Ylianst/MeshCentral) project. 

#### Endpoint - Plugin tab
When viewing a remote endpoint, a new "Event Log" tab now appears under the Plugins tab.
This shows the latest 10 event log entries (errors / warnings only) from the Application log.

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
The possibilities are endless, but this can be used for so much. It's currently only viewing several entries that are queried when you connect to the agent as a proof of concept.

This project can be expanded to include:
- Log collection for long-term retention on the MeshCentral server
- Create alerts based on the log entries and user-defined filters
- When used in conjunction with a task-scheduling plugin could fire off a task on an endpoint in response to an event