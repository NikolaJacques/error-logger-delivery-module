"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLogger = exports.fetchDataInit = exports.fetchDataSend = exports.backOff = exports.delay = exports.cache = exports.timestamp = exports.getBrowser = exports.ErrorReport = void 0;
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
exports.ErrorReport = ErrorReport;
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
exports.getBrowser = getBrowser;
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
exports.timestamp = timestamp;
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
exports.cache = cache;
const delay = (backoffCoefficient) => {
    try {
        return new Promise(resolved => {
            setTimeout(() => {
                resolved();
            }, 100 * backoffCoefficient * backoffCoefficient);
        });
    }
    catch (err) {
        throw err;
    }
};
exports.delay = delay;
const backOff = async (callback) => {
    try {
        let backoffCoefficient = 0;
        let response = await callback();
        const result = await (async () => {
            while (response.status > 401 && backoffCoefficient < 10) {
                ++backoffCoefficient;
                await (0, exports.delay)(backoffCoefficient);
                response = await callback();
            }
            return response;
        })();
        return result;
    }
    catch (err) {
        throw err;
    }
};
exports.backOff = backOff;
const fetchDataSend = async (url, errorRep) => {
    try {
        return await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('error-log-token'),
            },
            body: JSON.stringify(errorRep)
        });
    }
    catch (err) {
        throw err;
    }
};
exports.fetchDataSend = fetchDataSend;
const fetchDataInit = async (url, requestBody) => {
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
    }
    catch (err) {
        throw err;
    }
};
exports.fetchDataInit = fetchDataInit;
const ErrorLogger = (endpoint_url) => {
    const url = endpoint_url;
    const send = async (error) => {
        try {
            const LOGS_URI = url + 'logs';
            let errorRep;
            if ('timestamp' in error) {
                errorRep = error;
            }
            else {
                const browser = (0, exports.getBrowser)();
                const ts = (0, exports.timestamp)();
                const actions = sessionStorage.getItem('actions') ? JSON.parse(sessionStorage.getItem('actions')) : [];
                sessionStorage.setItem('actions', JSON.stringify([]));
                const { message, name, stack } = error;
                errorRep = new ErrorReport(message, name, stack, actions, browser, ts);
            }
            try {
                const response = await (0, exports.backOff)(() => (0, exports.fetchDataSend)(LOGS_URI, errorRep));
                if (!response.ok)
                    throw new Error('Unable to send error');
                const parsedData = await response.json();
                console.log(parsedData.message);
            }
            catch (err) {
                (0, exports.cache)(errorRep);
                throw err;
            }
        }
        catch (err) {
            console.log(err);
        }
    };
    const checkCache = async () => {
        try {
            const cachedErrors = localStorage.getItem('errorCache') ? JSON.parse(localStorage.getItem('errorCache')) : [];
            localStorage.setItem('errorCache', JSON.stringify([]));
            for (let error of cachedErrors) {
                send(error);
            }
        }
        catch (error) {
            console.log(error);
        }
    };
    const init = async (appId) => {
        try {
            const AUTH_URI = url + 'auth/app';
            const requestBody = { appId };
            const response = await (0, exports.backOff)(() => (0, exports.fetchDataInit)(AUTH_URI, requestBody));
            const parsedData = await response.json();
            if (response.ok) {
                sessionStorage.setItem('error-log-token', parsedData.token);
            }
            else {
                throw new Error(parsedData.message);
            }
            checkCache();
        }
        catch (error) {
            console.log(error);
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
};
exports.ErrorLogger = ErrorLogger;
