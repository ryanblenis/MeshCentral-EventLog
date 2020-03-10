
# MeshCentral-EventLog

*Current Version: 0.0.23
Released: 2020-03-10*

Initially conceived as a proof of concept plugin for the [MeshCentral2](https://github.com/Ylianst/MeshCentral) Project to introduce extensibility into the project without requiring the MeshCentral2 project to incorporate everyone's requested changes into the main project, yet allow it to be accomplished by others. In creating this plugin, we're introducing the appropriate hooks into MeshCentral2 to allow extensibility to anyone who can write a plugin, while trying to modify the core project as little as possible.

## Installation

 Pre-requisite: First, make sure you have plugins enabled for your MeshCentral installation:
>     "plugins": {
>          "enabled": true
>     },
Restart your MeshCentral server after making this change.

 To install, simply add the plugin configuration URL when prompted:
 `https://raw.githubusercontent.com/ryanblenis/MeshCentral-EventLog/master/config.json`

Once installed, you'll need to update your agent cores in order to use the live / history features.

## Usage
*Currently only supports Windows endpoints with a software agent installed.*

As a proof of concept, several methods were employed to become familiar with the [MeshCentral2](https://github.com/Ylianst/MeshCentral) project. 

#### Plugin Admin
You can now create configuration sets and assign them to nodes or meshes. Need to collect events from a new log file other than Application/System? Just add it and assign!

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
![Plugin Administration Page](https://user-images.githubusercontent.com/1929277/69597525-4565bc00-0fd4-11ea-8722-55fe06ed64cd.png)
