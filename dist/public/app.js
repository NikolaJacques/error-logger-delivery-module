"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLogger = void 0;
exports.ErrorLogger = (() => {
    class ErrorReport {
        constructor(message, name, stack, actions, browserVersion, timestamp) {
            this.message = message;
            this.name = name;
            this.stack = stack;
            this.actions = actions;
            this.browserVersion = browserVersion;
            this.timestamp = timestamp;
        }
    }
    // user agent sniffing (from https://www.seanmcp.com/articles/how-to-get-the-browser-version-in-javascript/)
    const getBrowser = () => {
        try {
            const { userAgent } = navigator;
            if (userAgent.includes('Firefox/')) {
                return `Firefox v${userAgent.split('Firefox/')[1]}`;
            }
            else if (userAgent.includes('Edg/')) {
                return `Edge v${userAgent.split('Edg/')[1]}`;
            }
            else if (userAgent.includes('Chrome/')) {
                return `Chrome v${userAgent.split('Chrome/')[1].split(' ')[0]}`;
            }
            else if (userAgent.includes('Safari/')) {
                return `Safari v${userAgent.split('Safari/')[1]}`;
            }
            else {
                return 'unknown';
            }
        }
        catch (error) {
            throw new Error('Couldn\'t retrieve browser');
        }
    };
    // timestamp function
    const timestamp = () => {
        try {
            const dateStr = (new Date).getTime();
            return dateStr;
        }
        catch (error) {
            throw new Error('Couldn\'t retrieve date');
        }
    };
    const url = 'http://localhost:8080/';
    const cache = (error) => {
        try {
            const cachedErrors = localStorage.getItem('errorCache') ? JSON.parse(localStorage.getItem('errorCache')) : [];
            cachedErrors.push(error);
            localStorage.setItem('errorCache', JSON.stringify(cachedErrors));
        }
        catch (err) {
            console.log(err);
        }
    };
    const checkCache = () => {
        try {
            const cachedErrors = localStorage.getItem('errorCache') ? JSON.parse(localStorage.getItem('errorCache')) : [];
            localStorage.setItem('errorCache', JSON.stringify([]));
            for (let error of cachedErrors) {
                send(error)
                    .catch(() => cache(error));
            }
        }
        catch (error) {
            console.log(error);
        }
    };
    const send = async (error) => {
        try {
            const LOGS_URI = url + 'logs';
            let errorRep;
            if ('timestamp' in error) {
                errorRep = error;
            }
            else {
                const browser = getBrowser();
                const ts = timestamp();
                const actions = sessionStorage.getItem('actions') ? JSON.parse(sessionStorage.getItem('actions')) : [];
                sessionStorage.setItem('actions', JSON.stringify([]));
                const { message, name, stack } = error;
                errorRep = new ErrorReport(message, name, stack, actions, browser, ts);
            }
            try {
                const data = await fetch(LOGS_URI, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('error-log-token'),
                    },
                    body: JSON.stringify(errorRep)
                });
                const parsedData = await data.json();
                console.log(parsedData.message);
            }
            catch (err) {
                cache(errorRep);
                throw err;
            }
        }
        catch (err) {
            console.log(err);
        }
    };
    const init = async (appId, appSecret) => {
        try {
            const AUTH_URI = url + 'auth/app';
            if (AUTH_URI) {
                const data = await fetch(AUTH_URI, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appId,
                        appSecret
                    })
                });
                const parsedData = await data.json();
                if (data.ok) {
                    sessionStorage.setItem('error-log-token', parsedData.token);
                }
                else {
                    throw new Error(parsedData.message);
                }
            }
            else {
                throw new Error('Auth URL not defined');
            }
            checkCache();
        }
        catch (error) {
            console.log(error);
            window.alert('ErrorLogger authentication failed: check console or contact administrator.');
        }
    };
    const trace = (handler) => {
        try {
            return (e) => {
                const actions = !sessionStorage.getItem('actions') ? [] : JSON.parse(sessionStorage.getItem('actions'));
                const { target, type } = e;
                const { localName, id, className } = target;
                actions.push({
                    target: {
                        localName,
                        id,
                        className
                    },
                    type
                });
                sessionStorage.setItem('actions', JSON.stringify(actions));
                handler(e);
            };
        }
        catch (error) {
            console.log(error);
        }
    };
    const traceAll = () => {
        try {
            const proxyAEL = new Proxy(new EventTarget().addEventListener, {
                apply: (target, thisArg, args) => {
                    const newHandler = trace(args[1]);
                    const newArgs = [args[0], (e) => newHandler(e)];
                    Reflect.apply(target, thisArg, newArgs);
                }
            });
            EventTarget.prototype.addEventListener = proxyAEL;
        }
        catch (error) {
            console.log(error);
        }
    };
    return {
        init,
        send,
        trace,
        traceAll
    };
})();
