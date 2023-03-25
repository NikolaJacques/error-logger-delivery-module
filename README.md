# Error Logging app

## Table of contents

- [The motivation and the problem](#heading--1)
    1. [The advice](#heading--1-1)
    2. [The problem](#heading--1-2)
    3. [A use case for building a full stack app](#heading--1-3)
    4. [A tool to be used with other projects](#heading--1-4)
- [The app components and what it does](#heading--2)
- [What I learned](#heading--3)
- [Disclaimer](#heading--4)
- [Modules](#heading--5)
    1. [The delivery module](#heading--5-1)
    2. [The back end (core module)](#heading--5-2)
    3. [The webhook module](#heading--5-3)
    4. [Shared types](#heading--5-4)
    5. [Front end examples](#heading--5-5)
- [License](#heading--6)

<div id="heading--1"></div>
</br>

## The motivation & the problem
<div id="heading--1-1"></div>

### 1. The advice

A friend who has years of experience in web development had two pieces of advice to give me as a beginner:put everything in a try / catch block and use logging. He said applying these pays dividends when it comes to dealing with errors later on.

I applied these principles when creating a simple front end webpage for consuming a third-party API. I created a simple function that would record an error's stack trace, add a timesamp to it and add this information to an array in local storage. The user would see the error displayed and could send an error report by clicking on the appropriate button in the page's footer, which would open up a modal with a form. The form information was sent along with the error stack to an email service that would create an email according to a template and send it to the appropriate recipient. This worked well when it was used: the origin of the sole error reported was identified in less than 5 minutes and fixed later that day (the error was due to a discrepancy in brower versions and backwards compatibility).
<div id="heading--1-2"></div>

### 2. The problem

The error reporting form worked well in principle but it wasn't being used in practice, perhaps due to lack of user awareness, user habits, or it may simply not have been user-friendly enough. This meant that errors in production could potentially go unnoticed, which is bad for the user experience overall.

The solution was to come up with an error logging solution that could be incorporated into the code and ensure that error logging and reporting happens independently of user input.
<div id="heading--1-3"></div>

### 3. A use case for building a full stack app

As a self-taught student of web development, the error logger tool appealed to me because it spans the full stack of web development, it solves a business problem, and is part of the software developer's priviledge of being able to create and customize the tools for the job, one of the aspects of software development that appeals to me the most.
<div id="heading--1-4"></div>

### 4. A tool to be used with other projects

The tool originated from a problem on a specific project, but it was designed with versatility and reusability in mind by applying a separation of concerns between the different components. The idea is to have a simple unique tool for monitoring all projects the user manages or is working on, and that can be expanded upon in the future. For the time being, the delivery module is written in Javascript and can only be used on a webpage app, but because of the modular approach, this can easily be expanded to other languages / media.
<div id="heading--2"></div>
</br>

## The app components and what it does

**Components**

Back end:
- shared types server (npm package)
- delivery module server
- back end (core) server
- Monday.com webhook server

Front end:
- Front end UI server
</br>

**What the app does**

- allows a webpage app to send error information to a database (delivery module)
- receives error log information and stores it in a database (back end or core module) 
- serves log information to clients in different views (back end or core module)
- sends notifications for specific events on the core server to other services (back end or core module)
- displays error log information in different ways (front end module)
- receives event notifications and translates them to a request for a specific API (Monday module)
<div id="heading--3"></div>
</br>

## What I learned

**Shared types:**
- creating a Typescript definitions file (.d.ts) with separate type modules
- create an npm package to share types accross app modules
- installing and importing a custom npm package & Typescript compiler configuration

**Delivery module:**
- Typescript compiler configuration for in-browser Javascript
- using Proxy and Reflect objects to re-define an object prototype
- caching unsuccessful requests

**Back-end (core) module:**
- building a REST API in NodeJS & Typescript
- validation of incoming requests
- implementation of JWT and security concerns

**Webhook & Monday module:**
- change streams in MongoDB including resume token implementation
- building a general web hook utility with an events queue
- creating an async pipe in Typescript
- exponential backoff
- request monitoring and logging
- consuming a GraphQL API

**Front end:**
- building a front end in React & Typescript
- Material UI
- React Router
- implementing async data queries in React
- scss mixins
- managing expired JWT tokens

**Future areas of improvement**
- improve webhook error logging
- other front end examples (e.g. Power BI) 
- test coverage
- implementation of Auth0
- bucketing in MongoDB (instead of aggregation)
<div id="heading--4"></div>
</br>

## Disclaimer

This tool was created for the most part along the lines of my own ideas of what basic and useful service a logger tool should provide and does not attempt to mimic any existing software or functionality in any way; where it leans on other sources, credit is given. It is a learning project created for the purposes of demonstration and my own personal use. I make no warranty for the use of the code in this repository, in whole or in part.
<div id="heading--5"></div>
</br>

## Modules
<div id="heading--5-1"></div>

### 1. The delivery module

The delivery module contains a library of methods for connecting to the server, recording user (inter)actions prior to an error occurence, and sending the information to a server on the back end. It implements authentication using JWT, it includes exponential backoff and caching of unsuccessful requests in case of a bad connection or unsuccessful request.
</br>

**Methods**

**init([options])**

Initializes a session with the back end server. Returns a promise.

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Type</th>
        <th>Default</th>
    </tr>
    <tr>
        <td>appId</td>
        <td>ObjectId number of project in database</td>
        <td>string</td>
        <td>no default</td>
    </tr>
    <tr>
        <td>appSecret</td>
        <td>App secret for project</td>
        <td>string</td>
        <td>no default</td>
    </tr>
</table>
</br>

**send([options])**

Sends the error information to the back end in the form of an object of type `ErrorLogType<number>`. Returns a promise.

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Type</th>
        <th>Default</th>
    </tr>
    <tr>
        <td>error</td>
        <td>an error object containing error information (see below)</td>
        <td>object</td>
        <td>no default</td>
    </tr>
</table>

```
type ErrorLogType<U>:
    message: string,
    name: string,
    stack: string,
    actions: ActionType[],
    browserVersion: string,
    timestamp: U
```
</br>

**trace([options])**

Trace wraps around discrete event handler functions within addEventListener. Each event where trace is used is recorded as an object with ActionType (see below) and stored in an actions array. The actions array information is included in the error report when an error occurs and the actions array is then reset.

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Type</th>
        <th>Default</th>
    </tr>
    <tr>
        <td>event handler</td>
        <td>the event handler in the event listener</td>
        <td>function</td>
        <td>no default</td>
    </tr>
</table>

```
type ActionType:
    target: {
                localName: string;
                id: string;
                className: string;
            },
    type: string;
```
</br>

**traceAll()**

TraceAll implements trace for all subsequent event listeners declared in addEventListener.
<div id="heading--5-2"></div>
</br>

### 2. The back end (core) module

The back end (or core) module is a REST API that processes requests for app authentication (apps using the delivery module), user authentication, adding logs, as well as viewing logs and viewing projects. (The same server also contains the logic for the webhook module which is documented later explained later in this file.)
</br>

**routes**
</br>
<table>
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Type</th>
        <th>Route</th>
        <th>Body</th>
    </tr>
    <tr>
        <td>Authenticate app</td>
        <td>An authentication request from the (data-producing) monitored app. Returns as a response a JWT token with appId and sessionId in its payload</td>
        <td>POST</td>
        <td>/auth/app</td>
        <td>{appId: string, appSecret: string}</td>
    </tr>
</table>
</br>

<table>
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Type</th>
        <th>Route</th>
        <th>Body</th>
    </tr>
    <tr>
        <td>Authenticate user</td>
        <td>An authentication request from the (data-consuming) viewing front end. Returns as a response a JWT token with userId in its payload</td>
        <td>POST</td>
        <td>/auth/user</td>
        <td>{name: string, password: string}</td>
    </tr>
</table>

example:
```
    fetch(`${ENDPOINT_URL}/auth/user`, {
            method: 'POST',
            body: JSON.stringify({
            name: username,
            password
            } as AdminAuthRequest),
            headers: {
            'Content-Type': 'application/json',
            },
        })
        .then((response) => {
                if (response.ok) {
                setError(false);
                const data = await response.text();
                const parsedData = JSON.parse(data);
                sessionStorage.setItem('token', parsedData.token);
                return navigate('/');
            } else {
                setError(true);
                throw new Error(`Status ${response.status}: failed to authenticate`);
            }
        })
        .catch(err){
            console.log(err);
        }
```
</br>

<table>
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Type</th>
        <th>Route</th>
        <th>Body</th>
    </tr>
    <tr>
        <td>Add log</td>
        <td>A request from the monitored app to add an error log to the database</td>
        <td>POST</td>
        <td>/logs</td>
        <td>ErrorLogType object (see above)</td>
    </tr>
</table>
</br>

<table>
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Type</th>
        <th>Route</th>
        <th>Body</th>
    </tr>
    <tr>
        <td>Get logs</td>
        <td>A request for logs data from the viewing front end with the Project ID as a parameter that takes a query string (see query object below for parameters)</td>
        <td>GET</td>
        <td>/logs/:id</td>
        <td>query defaults:<br/> page=1<br/> limit=10 <br/>view=atomic</td>
    </tr>
</table>

```
interface QueryInterface: {
    startDate: string, 
    endDate: string, 
    sessionId: string, 
    name: string, 
    page: string, 
    limit: string, 
    view: ViewType
}

type ViewType = 'atomic' | 'error' | 'session';
```

example:
```
    const url = `${ENDPOINT_URL}/logs/635d4399854b53aa6a6a4f0a?view=${view}&limit=${limit}&page=${page}&startDate=${startDate.toISOString().split('Z')[0]}&endDate=${endDate.toISOString().split('Z')[0]}`;
    const token = sessionStorage.getItem('token');
    
    fetch(encodeURI(url), {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(async (response) => {
            const status = response.status;
            const data = await response.json();
            if (!response.ok){
                const error = new Error();
                error.message = status + ' ' + data.message;
                throw error;
            }
            return data as SuccessResponseType;    
        })
        .catch(err => console.log(err));
```
</br>

<table>
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Type</th>
        <th>Route</th>
        <th>Body</th>
    </tr>
    <tr>
        <td>Get project</td>
        <td>A request  with the Project ID as a parameter</td>
        <td>GET</td>
        <td>/projects/:id</td>
        <td>none</td>
    </tr>
</table>
</br>

**Views**

Views are ways the error log information is aggregated and served to the consumer of the API. Each view represents a query on the back end (a MondoDB aggregation pipeline) and the structure of the data output to the API consumer.
</br>

**- atomic**

The 'atomic' view returns an array of logs of type `ExtendedErrorLogType<Date>`, i.e. without aggregation.

sorting order: timestamp DESC, sessionId ASC

```
interface ErrorLogType<U> {
    message: string,
    name: string,
    stack: string,
    actions: ActionType[],
    browserVersion: string,
    timestamp: U
}

interface ExtendedErrorLogType<U> extends ErrorLogType<U> {
    appId: string,
    sessionId: string
}

```
</br>

**- error**

The 'error' view returns an array of logs aggregated according to error type. It checks the first two 'tokens' in the stack trace string for equivalence (e.g. `Error: error message at lambdaFunction(line:position)`)

sorting order: name ASC, message ASC

```
interface ErrorViewType {
    name: string,
    message: string,
    stack: string,
    browserVersion: string[],
    totalErrors: number,
    totalSessions: number
}
```
</br>

**- session**

The 'session' view returns an array of logs aggregated according to user session. Each user session receives a unique UUID to identify it by.

session view: date DESC, sessionId DESC

```
interface SessionViewType {
    sessionId: string,
    timestamp: string,
    totalErrors: number,
    errors: ExtendedErrorLogType<string>[]
}
```
<div id="heading--5-3"></div>
</br>

### 3. The webhook module

**back end or core server**

The design for this module was inspired by an [interview with the founder and CEO of Svix](https://www.youtube.com/watch?v=4jvV75OD620), a webhook service company.

The webhook module is part of the back end core module. It consists of a MongoDB change stream that watches the logs collection for new inserts. The change stream implements resume tokens in the event the change stream closes unexpectedly.

Each time a new insert occurs, it is piped through an async events pipe that contains filters for all applicable events in the form if handlers (each handler in the event pipe filters for a particular event). 

The resulting array is then filtered according to the 'events' to the project's subscribed events. 

Each event in the resulting array is then processed by an event handler. For each event in the array, the event handler makes the call to the appropriate service and logs the result of the call. The information logged is the event id, response status, payload and timestamp.

The module is built to handle various event types but currently only includes a 'newLog' event that occurs when a new error appears and makes a call to a Monday.com API service.
</br></br>

**Monday.com API module**

The webhook currently only fires an event that makes a call to a Monday.com API service.

The Monday module service receives the call from the API, it checks that the payload's project ID and that stored in its memory match and that the payload timestamp isn't more than a day old.

Once cleared, a call is created to the Monday.com GraphQL API with the information forwarded by the back end (core) server. If the call is successful, a bug appears with the log information in the 'bugs' group on the Monday.com project page. The result of the call is logged.
<div id="heading--5-4"></div>
</br>

### 4. Shared types

The shared types module contains all types / interfaces that are shared between different modules in the app. The common type definitions (.d.ts) file contains three Typescript modules:

- delivery-backend: types shared between the delivery module and the back end (core) module
- frontend-backend: types shared between front end modules and the back end (core) module
- intersection: types shared between more than two modules and/or the Monday.com module

The module is published as an npm package and can be downloaded using the following command:

`npm install @nikola_jacques/shared-types`

The Typescript configuration (ts.config) file contains the following to import the types into the code:

```
"compilerOptions: {
    "paths": {
      "intersection": ["./node_modules/@nikola_jacques/shared-types/index.d.ts"],
      "delivery-backend": ["./node_modules/@nikola_jacques/shared-types/index.d.ts"],
      "frontend-backend": ["./node_modules/@nikola_jacques/shared-types/index.d.ts"]
    }
}
```

The common types file defines the common data structures shared between the modules. It ensures that data exchanged between different modules is of the same type when sent and received.
<div id="heading--5-5"></div>
</br>

### 5. Front end examples

The idea of creating a REST API was to decouple the data-producing and data-consuming modules. Some coupling exists with the shared types file but the logic is separate. This way a variety of different UIs or services can consume the data according to the user's requirements without the need to re-write any of the back end logic.
</br>

**Front end UI**

The front end UI is a simple single page app that uses Reacts's Material UI library. It displays the log data according to different query parameters such as date and view. It contains a login route and a main route that allows the user to view the data.
<div id="heading--6"></div>
</br>

## License

[MIT license](https://opensource.org/license/mit/)